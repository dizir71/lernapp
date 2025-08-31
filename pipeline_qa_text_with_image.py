#!/usr/bin/env python3
import fitz, pytesseract, re
from pathlib import Path
import tempfile, subprocess

IN_DIR = Path("./pdf_in")
OUT_FN = Path("merged_fully_text.txt")
LANGS = "deu+eng"
PSM = "6"

qa_entries = []
qid = 1

def ocr_block_image(page, rect):
    pix = page.get_pixmap(clip=rect, dpi=150)
    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        pix.save(tmp.name)
        txt = pytesseract.image_to_string(tmp.name, lang=LANGS, config=f"--psm {PSM}")
    return txt.strip()

def extract_chunks(text):
    return re.split(r"(?<=[\.\?!])\s+|\n{2,}", text)

def is_calc_chunk(chunk: str):
    return re.search(r"\d", chunk) and re.search(
        r"(berechne|ermittle|bestimme|kalkuliere|wie\s+viel|wieviel|beträgt|gewinn|kosten|break[- ]?even|rentabilität|deckungsbeitrag)", chunk, re.IGNORECASE
    )

with open(OUT_FN, "w", encoding="utf-8") as out:
    for pdf in sorted(IN_DIR.glob("*.pdf")):
        doc = fitz.open(pdf)
        out.write(f"\n--- PDF: {pdf.name} ---\n")
        for page in doc:
            blocks = page.get_text("blocks")
            for b in sorted(blocks, key=lambda x: (x[1], x[0])):
                btype, x0,y0,x1,y1,_,_,text = b[:8]
                if btype == 0 and text.strip():
                    out.write(text.strip() + "\n")
                    if is_calc_chunk(text):
                        qa_entries.append({"id": qid, "question": text.strip(), "pdf": pdf.name})
                        qid += 1
                elif btype == 1:
                    img_txt = ocr_block_image(page, fitz.Rect(x0,y0,x1,y1))
                    if img_txt:
                        out.write("[Bildtext]: " + img_txt + "\n")

out.write("\n--- Q&A Übersicht ---\n")
for qa in qa_entries:
    out.write(f"Q{qa['id']} (aus {qa['pdf']}): {qa['question']}\n")

print("Fertig:", OUT_FN)
