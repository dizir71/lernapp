#!/usr/bin/env python3  
import re, tempfile  
from pathlib import Path  
import fitz, pytesseract  

IN_DIR = Path("./pdf_in")  
OUT_TXT = Path("all_text_linear.txt")  
OUT_JSON = Path("all_qna.json")  
LANGS = "deu+eng"  
PSM = "6"  

QMARK = re.compile(r"\?\s*$")  
CALC = re.compile(r"(berechne|ermittle|bestimme|kalkuliere|wie\s+viel|wieviel|beträgt|gewinn|kosten|preis|deckungsbeitrag|break[- ]?even|fixkosten|variable\s+kosten|rentabilit[aä]t|wirtschaftlichkeit|lager|bestellmenge|zins|skonto|rabatt|wechselkurs|roi|cashflow|amortisation|kapitalwert)", re.IGNORECASE)  

def ocr_image_block(page, rect):  
  pix = page.get_pixmap(clip=rect, dpi=150)  
  with tempfile.NamedTemporaryFile(suffix=".png") as tmp:  
      pix.save(tmp.name)  
      return pytesseract.image_to_string(tmp.name, lang=LANGS, config=f"--psm {PSM}").strip()  

def normalize(s):  
  s = s.replace("\r", "")  
  return re.sub(r"[ \t]+", " ", s).strip()  

def split_sentences(text):  
  parts = re.split(r"(?<=[.?!])\s+|\n{2,}", text)  
  return [p.strip() for p in parts if len(p.strip()) > 15]  

def looks_like_question(ch):  
  return QMARK.search(ch) or (re.search(r"\d", ch) and CALC.search(ch))  

def collect_answer(blocks, idx):  
  ans = []  
  for b in blocks[idx+1:]:  
      if looks_like_question(b):  
          break  
      if b:  
          ans.append(b)  
      else:  
          break  
      if len(ans) >= 2:  
          break  
  if not ans:  
      return "", ""  
  return ans[0], ans[1] if len(ans) > 1 else ""  

qna, full_text = [], []  
qid = 1  
for pdf in sorted(IN_DIR.glob("*.pdf")):  
  full_text.append(f"--- PDF: {pdf.name} ---")  
  doc = fitz.open(pdf)  
  merged = []  
  for page in doc:  
    blocks = page.get_text("blocks")  
    for b in sorted(blocks, key=lambda x: (x[1], x[0])):  
      btype = b[6]  
      if btype == 0:  
        t = normalize(b[4] or "")  
      else:  
        t = normalize(ocr_image_block(page, fitz.Rect(*b[:4])))  
      if t:  
        merged.append(t)  
  combined = "\n".join(merged)  
  full_text.append(combined)  
  chunks = split_sentences(combined)  
  for idx, ch in enumerate(chunks):  
    if looks_like_question(ch):  
      ans, desc = collect_answer(chunks, idx)  
      qna.append({"id": qid, "pdf": pdf.name, "question": ch, "answer": ans, "description": desc})  
      qid += 1  

OUT_TXT.write_text("\n\n".join(full_text), encoding="utf-8")  
import json  
OUT_JSON.write_text(json.dumps(qna, ensure_ascii=False, indent=2), encoding="utf-8")  
print("Fertig: all_text_linear.txt + all_qna.json erstellt.")
