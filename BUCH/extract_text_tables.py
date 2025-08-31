#!/usr/bin/env python3
import sys, json, pathlib
import fitz  # PyMuPDF
import pdfplumber

inp = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

all_pages = []
with fitz.open(inp) as doc:
    for i, page in enumerate(doc, 1):
        text = page.get_text("text")
        all_pages.append({"page": i, "text": text})

(out / "text_pymupdf.json").write_text(json.dumps(all_pages, ensure_ascii=False, indent=2))

tables_all = []
with pdfplumber.open(inp) as doc:
    for i, page in enumerate(doc.pages, 1):
        tables = page.extract_tables() or []
        tables_all.append({"page": i, "tables": tables})
(out / "tables_pdfplumber.json").write_text(json.dumps(tables_all, ensure_ascii=False, indent=2))
print("OK")
