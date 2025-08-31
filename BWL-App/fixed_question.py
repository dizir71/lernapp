#!/usr/bin/env python3
import json, re, os, sys
from datetime import datetime
ROOT = os.path.dirname(__file__)

PH_PAT = re.compile(r"(siehe\s*lerntext|siehe\s*lehrtext|korrekte\s*bezeichnung|platzhalter|tbd|todo|\?{1,})", re.I)

# Kanonische Füllungen (Österreich, UGB/Steuer, stabil)
CANON = {
  "firma_funktionen": ["Kennzeichnungsfunktion", "Unterscheidungsfunktion"],
  "og_haftung": ["unbeschränkt", "solidarisch"],
  "kg_haftung": ["Komplementär unbeschränkt", "Kommanditist beschränkt (Einlage)"],
  "gmbh_haftung": ["beschränkt auf Gesellschaftsvermögen"],
  "ag_organe": ["Vorstand", "Aufsichtsrat", "Hauptversammlung"],
  "prokura_merkmale": ["umfassende handelsrechtliche Vollmacht", "im Firmenbuch eingetragen"],
  "handlungsvollmacht_merkmale": ["beschränkte Vollmacht", "nicht im Firmenbuch eingetragen"],
  "unternehmer_merkmale": ["selbständig, nachhaltig", "Gewinnerzielungsabsicht"],
  "plz_phasen": ["Einführung","Wachstum","Reife","Sättigung","Degeneration"],
}

def is_empty(v):
    if v is None: return True
    if isinstance(v,str): return not v.strip() or PH_PAT.search(v)
    if isinstance(v,list): return len(v)==0 or any(is_empty(x) for x in v)
    return False

def norm(s): return re.sub(PH_PAT, "", s).strip() if isinstance(s,str) else s

def detect_topic(text):
    t = text.lower()
    if "offene gesellschaft" in t or re.search(r"\bog\b", t): return "og"
    if "kommandit" in t or re.search(r"\bkg\b", t): return "kg"
    if re.search(r"\bgmbh\b", t): return "gmbh"
    if re.search(r"\bag\b", t) and "frage" not in t: return "ag"
    if "firma" in t and "firmenbuch" not in t: return "firma"
    if "prokura" in t: return "prokura"
    if "handlungsvollmacht" in t: return "handlungsvollmacht"
    if "unternehmer" in t: return "unternehmer"
    if "produktlebenszyklus" in t: return "plz"
    return None

def expected_aspect(text, topic):
    t = text.lower()
    if "haftung" in t: return "haftung"
    if "organe" in t: return "organe"
    if "funktion" in t: return "funktionen"
    if "merkmal" in t: return "merkmale"
    if "phase" in t and topic=="plz": return "phasen"
    return None

def ensure_two_if_required(q, ans):
    need2 = any(k in q.lower() for k in ["2 merkmal","zwei merkmal","2 eigenschaft","zwei eigenschaft"])
    if not need2: return ans
    if isinstance(ans, str): return [ans]  # später ergänzt
    if isinstance(ans, list) and len(ans) >= 2: return ans
    return ans

def autocompletion(topic, aspect):
    key = f"{topic}_{aspect}" if aspect else None
    return CANON.get(key)

def fix_item(item):
    changed = False
    q = item.get("question_text","").strip()
    ca = item.get("correct_answer")

    # 1) Platzhalter aus Frage und Antwort entfernen
    new_q = norm(q)
    if new_q != q:
        q = new_q
        item["question_text"] = q
        changed = True

    if isinstance(ca, str):
        new_ca = norm(ca)
        if new_ca != ca:
            ca = new_ca; item["correct_answer"]=ca; changed=True
    elif isinstance(ca, list):
        new_list = [norm(x) if isinstance(x,str) else x for x in ca]
        if new_list != ca:
            ca = new_list; item["correct_answer"]=ca; changed=True

    # 2) Kontext erkennen
    topic = detect_topic(q)
    aspect = expected_aspect(q, topic)

    # 3) unvollständige Fragen sprechend machen
    if re.match(r"^\**\s*vor-?\s?teile", q, flags=re.I):
        if topic:
            q = f"Vorteile der {topic.upper() if topic!='firma' else 'Firma'}: Nennen Sie 2–3 Punkte."
        else:
            q = "Vorteile: Nennen Sie 2–3 Punkte."
        item["question_text"]=q; changed=True
    if re.match(r"^\**\s*nachteile", q, flags=re.I):
        if topic:
            q = f"Nachteile der {topic.upper() if topic!='firma' else 'Firma'}: Nennen Sie 2–3 Punkte."
        else:
            q = "Nachteile: Nennen Sie 2–3 Punkte."
        item["question_text"]=q; changed=True

    # 4) Pflichtlisten einsetzen (PLZ, Funktionen etc.)
    canon = autocompletion(topic, aspect)
    if canon:
        # Mindestanforderung sicherstellen
        if is_empty(item.get("correct_answer")):
            item["correct_answer"] = canon if len(canon)>1 else canon[0]
            changed = True
        else:
            # bei Listen fehlende Elemente ergänzen
            if isinstance(item["correct_answer"], list):
                cur = [x.strip().lower() for x in item["correct_answer"] if isinstance(x,str)]
                add = [c for c in canon if all(c.lower() not in v for v in cur)]
                if add:
                    item["correct_answer"] += add
                    changed = True

    # 5) „2 Merkmale“ sicherstellen
    item["correct_answer"] = ensure_two_if_required(q, item.get("correct_answer"))

    return changed

def process_file(path, out_suffix="_fixed"):
    with open(path,"r",encoding="utf-8") as f: data = json.load(f)
    changes = 0
    for it in data:
        if fix_item(it): changes += 1
    out = path.replace(".json", f"{out_suffix}.json")
    with open(out,"w",encoding="utf-8") as f: json.dump(data,f,ensure_ascii=False,indent=2)
    return out, changes

def main():
    report = []
    total = 0
    fixed_files = []
    for fn in os.listdir(ROOT):
        if fn.lower().endswith(".json"):
            if "manifest" in fn.lower(): continue
            path = os.path.join(ROOT, fn)
            out, chg = process_file(path)
            report.append(f"{fn}: {chg} Anpassungen → {os.path.basename(out)}")
            fixed_files.append(os.path.basename(out))
            total += chg
    # Manifest schreiben
    manifest = {"version": datetime.utcnow().strftime("%Y%m%d%H%M%S"), "files": fixed_files}
    with open(os.path.join(ROOT,"manifest.json"),"w",encoding="utf-8") as mf:
        json.dump(manifest, mf, ensure_ascii=False, indent=2)
    with open(os.path.join(ROOT,"json_fix_report.txt"),"w",encoding="utf-8") as rf:
        rf.write("JSON Fix Report "+datetime.utcnow().isoformat()+"\n")
        rf.write("\n".join(report)+"\n")
        rf.write(f"Gesamtänderungen: {total}\n")
    print("OK. Manifest und _fixed.json erstellt.")

if __name__=="__main__":
    main()
