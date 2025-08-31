#!/usr/bin/env bash
set -euo pipefail

# Homebrew
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
eval "$(brew shellenv)"

# Tools
brew update
brew install ocrmypdf tesseract tesseract-lang poppler qpdf ghostscript

# Python venv
python3 -m venv .venv_ocr
source .venv_ocr/bin/activate
python -m pip install --upgrade pip
pip install pymupdf pdfplumber
echo "OK. Aktivieren: source .venv_ocr/bin/activate"
