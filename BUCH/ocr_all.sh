#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Nutzung: $0 <PDF_EINGABE_ORDNER> <AUSGABE_ORDNER>"
  exit 1
fi

IN_DIR="$1"
OUT_DIR="$2"
mkdir -p "$OUT_DIR/ocr_pdf" "$OUT_DIR/txt" "$OUT_DIR/meta"

# venv aktivieren, falls vorhanden
if [[ -f ".venv_ocr/bin/activate" ]]; then
  source .venv_ocr/bin/activate
fi

LANGS="deu+eng"   # bei Bedarf anpassen: tesseract --list-langs
shopt -s nullglob
for pdf in "$IN_DIR"/*.pdf "$IN_DIR"/*.PDF; do
  base="$(basename "$pdf" .pdf)"
  base="${base%.PDF}"
  echo "==> OCR: $base"

  # 1) OCR-PDF erzeugen (fügt Textlage hinzu, falls fehlend)
  ocrmypdf --language "$LANGS" --optimize 1 --deskew --clean \
           --output-type pdf --jobs 4 \
           "$pdf" "$OUT_DIR/ocr_pdf/${base}_ocr.pdf"

  # 2) Reinen Text extrahieren (robust: erst pdftotext, Fallback PyMuPDF)
  if command -v pdftotext >/dev/null 2>&1; then
    pdftotext -layout "$OUT_DIR/ocr_pdf/${base}_ocr.pdf" "$OUT_DIR/txt/${base}.txt" || true
  fi

  # 3) Metadaten/Debug
  qpdf --show-npages "$OUT_DIR/ocr_pdf/${base}_ocr.pdf" > "$OUT_DIR/meta/${base}.pages" || true
done

echo "Fertig. Ergebnisse in: $OUT_DIR"
