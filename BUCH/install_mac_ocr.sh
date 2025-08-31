#!/usr/bin/env bash
set -euo pipefail

echo "==> Prüfe Architektur"
ARCH="$(uname -m)"
if [[ "$ARCH" != "arm64" ]]; then
  echo "Dieses Skript ist für Apple Silicon (arm64). Aktuell: $ARCH"
fi

echo "==> Homebrew prüfen/ installieren"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true

# Pfad für Apple Silicon
BREW_BIN="/opt/homebrew/bin/brew"
if ! command -v brew >/dev/null 2>&1; then
  if [[ -x "$BREW_BIN" ]]; then
    eval "$($BREW_BIN shellenv)"
  else
    echo "Homebrew nicht gefunden. Bitte Terminal neu öffnen und erneut starten."
    exit 1
  fi
else
  eval "$(brew shellenv)"
fi

echo "==> Aktualisiere Brew"
brew update

echo "==> Installiere System-Tools (OCR-Stack)"
# Tesseract + Sprachdaten (deu, etc.)
brew install tesseract           # eng/osd/snum enthalten
brew install tesseract-lang      # zusätzliche Sprachen (deu u.a.)
# PDF-Werkzeuge
brew install poppler             # pdftotext, pdfimages, etc.
brew install qpdf
brew install ghostscript
# Bild-Tools (für Preprocessing)
brew install imagemagick
# Optional, von OCRmyPDF genutzt
brew install jbig2enc pngquant unpaper || true

echo "==> Versionen"
tesseract --version || true
tesseract --list-langs | head -n 20 || true
pdftotext -v || true
qpdf --version || true
gs --version || true
convert -version || true

echo "==> Python 3 prüfen"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 fehlt. Installiere via Homebrew."
  brew install python
fi

echo "==> Virtuelle Umgebung anlegen: .venv_ocr"
PY=python3
$PY -m venv .venv_ocr
source .venv_ocr/bin/activate

echo "==> Pip Pakete installieren"
python -m pip install --upgrade pip wheel
# OCR Pipeline
pip install ocrmypdf            # nutzt Tesseract/Ghostscript/ qpdf
pip install pymupdf             # PyMuPDF für robusten PDF-Text
pip install pdfminer.six        # Text-Extraktor
pip install pdfplumber          # Tabellen/Layouts
pip install pytesseract         # Tesseract-Binding
pip install opencv-python-headless camelot-py[cv] || true  # Tabellen (optional)

echo "==> Fertig."
echo "Aktiviere Umgebung mit:  source .venv_ocr/bin/activate"
echo "Beispiel:  ./ocr_all.sh /PFAD/zu/PDFs out_text"
