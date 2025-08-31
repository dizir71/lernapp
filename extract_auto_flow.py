#!/usr/bin/env python3
import fitz
import pytesseract
from pathlib import Path
import tempfile, subprocess

INPUT_DIR = Path("./pdf_in")
OUTPUT = Path("./merged_text.txt")
LANGS = "deu+eng"
PSM = "6"

out_lines = []

for pdf in sorted(INPUT_DIR.glob("*.pdf")):
    doc = fitz.open(pdf)
    out_lines.append(f"\n--- Datei: {pdf.name} ---\n")
    for page in doc:
        blocks = page.get_text("blocks")
        # sort by vertical position
        blocks_sorted = sorted(blocks, key=lambda b: (b[1], b[0]))
        for b in blocks_sorted:
            btype = b[6]
            text = b[4]
            if btype == 0 and text.strip():
                out_lines.append(text.strip())
            elif btype == 1:
                # Bildblock: render pixmap then OCR
                pix = page.get_pixmap(clip=fitz.Rect(b[:4]), dpi=150)
                with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
                    pix.save(tmp.name)
                    img_txt = pytesseract.image_to_string(tmp.name, lang=LANGS, config=f"--psm {PSM}")
                out_lines.append(img_txt.strip())
    out_lines.append("\n")
with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))

print(f"Fertig: Textdatei -> {OUTPUT}")
