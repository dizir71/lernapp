#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <input_pdf> <output_dir>"
  exit 1
fi

IN="$1"
OUT="$2"
mkdir -p "$OUT"

# Extract all embedded images native quality
pdfimages -all "$IN" "$OUT/image"
echo "Bilder extrahiert: $OUT"ø

