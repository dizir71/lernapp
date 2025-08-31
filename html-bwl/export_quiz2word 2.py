import json
import glob
import re
from collections import defaultdict

def find_all_json_objs(text):
    """Find all JSON objects in text (flat, no nested objects)."""
    objs = []
    for m in re.finditer(r'\{[^{}]*\}', text, re.DOTALL):
        snippet = m.group(0)
        try:
            obj = json.loads(snippet)
            if isinstance(obj, dict) and 'question_text' in obj:
                objs.append(obj)
        except Exception:
            continue
    return objs

def find_all_json_arrays(text):
    """Find all top-level arrays and parse them."""
    arrays = []
    matches = list(re.finditer(r'\[(\s*\{.*?\}\s*,?)+\]', text, flags=re.DOTALL))
    for m in matches:
        try:
            arr = json.loads(m.group(0))
            if isinstance(arr, list):
                arrays.extend(arr)
        except Exception:
            continue
    return arrays

def import_questions_from_file(fn):
    with open(fn, encoding='utf-8') as f:
        content = f.read()
    # 1. Try to parse as a single large array
    try:
        data = json.loads(content)
        out = []
        if isinstance(data, list):
            out += [q for q in data if isinstance(q, dict) and 'question_text' in q]
        elif isinstance(data, dict) and 'question_text' in data:
            out.append(data)
        if out:
            return out
    except Exception:
        pass
    # 2. Find any arrays in the text and parse them
    arrs = find_all_json_arrays(content)
    out = []
    for item in arrs:
        if isinstance(item, dict) and 'question_text' in item:
            out.append(item)
        elif isinstance(item, list):
            out += [q for q in item if isinstance(q, dict) and 'question_text' in q]
    if out:
        return out
    # 3. Find all single objects
    return find_all_json_objs(content)

def answer_text(q):
    typ = q.get('type')
    if typ in ('single_choice', 'true_false'):
        return str(q.get('correct_answer', ''))
    elif typ == 'multiple_choice':
        return ', '.join(q.get('correct_answer', []))
    elif typ == 'gap_fill':
        return str(q.get('correct_answer', ''))
    elif typ == 'open_text':
        return str(q.get('correct_answer', ''))
    elif typ == 'matching':
        matches = q.get('correct_matches', {})
        return '; '.join([f'{l} ⟶ {r}' for l, r in matches.items()])
    elif typ == 'calculation':
        return str(q.get('correct_answer', ''))
    elif typ == 'sort':
        try:
            fields = q['order_fields']
            order = q['correct_order']
            return " ⟶ ".join(str(fields[i]) for i in order)
        except Exception:
            return ''
    else:
        return str(q.get('correct_answer', ''))

# Find files
files = glob.glob("json/*.json") or glob.glob("*.json")

all_questions = []
for fn in files:
    try:
        qlist = import_questions_from_file(fn)
        all_questions.extend(qlist)
    except Exception as e:
        print(f"WARNUNG: Fehler in Datei {fn}: {str(e)}")

topics = defaultdict(list)
for q in all_questions:
    topic = q.get("topic", "Ohne Thema")
    topics[topic].append(q)

html = ['<html><body style="font-family:Arial,sans-serif; background:#fff; color:#111;">']
for topic in sorted(topics):
    html.append(f'<strong><span style="font-size:16pt;">{topic}</span></strong><br><br>')
    for idx, q in enumerate(topics[topic], 1):
        html.append(f'<span style="font-size:14pt;">{idx}. {q.get("question_text","(Frage fehlt)")}</span><br>')
        atext = answer_text(q)
        html.append(f'<div style="margin-bottom:14pt;"><span style="font-size:12pt;font-weight:bold;font-style:italic;">Antwort: {atext}</span></div>')
    html.append('<br>')
html.append('</body></html>')

with open("fragenkatalog.docx.html", "w", encoding="utf-8") as f:
    f.write("".join(html))

print("FERTIG – katalog als fragenkatalog.docx.html exportiert.")
