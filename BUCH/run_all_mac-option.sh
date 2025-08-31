#!/usr/bin/env bash
set -euo pipefail

# === Konfiguration ===
PDF_DIR="./pdf_in"
VENV_DIR=".venv_ocr"
LOG_DIR="./logs"
TS="$(date +"%Y-%m-%d_%H-%M-%S")"
LOG="$LOG_DIR/run_$TS.log"

EXTRACT_PY="./extract_all_qna_inline.py"
PIPELINE_PY="./pipeline_qa_text_with_image.py"
EXPORT_PY="./export_styled_outputs.py"

# === Helper ===
say(){ echo "[*] $*"; echo "[*] $*" >>"$LOG"; }
die(){ echo "[!] $*" | tee -a "$LOG"; exit 1; }

usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --install   Nur Installation von Tools und venv durchführen"
  echo "  --extract   Nur OCR + Q&A-Extraktion laufen lassen"
  echo "  --pipeline  Nur die Pipeline (optional) starten"
  echo "  --export    Nur Export in Word/Markdown ausführen"
  echo "  --all       Alles (Default, wenn nichts angegeben wird)"
  exit 0
}

# === Argumente auswerten ===
MODE="all"
for arg in "$@"; do
  case $arg in
    --install) MODE="install";;
    --extract) MODE="extract";;
    --pipeline) MODE="pipeline";;
    --export) MODE="export";;
    --all) MODE="all";;
    -h|--help) usage;;
    *) echo "Unbekannte Option: $arg"; usage;;
  esac
done

mkdir -p "$LOG_DIR"
say "Start $(date)"
cd "$(dirname "$0")"

# === Install/Setup ===
if [[ "$MODE" == "install" || "$MODE" == "all" ]]; then
  if ! command -v brew >/dev/null 2>&1; then
    say "Homebrew fehlt. Installation startet…"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv || /usr/local/bin/brew shellenv)"
  else
    eval "$(brew shellenv)"
  fi

  say "Prüfe/Installiere Systemtools…"
  brew update >>"$LOG" 2>&1 || true
  brew install ocrmypdf tesseract tesseract-lang poppler >>"$LOG" 2>&1 || true

  if [ ! -x "$VENV_DIR/bin/python" ]; then
    say "Erzeuge venv $VENV_DIR…"
    python3 -m venv "$VENV_DIR"
  fi

  # shellcheck disable=SC1090
  source "$VENV_DIR/bin/activate"
  python -m pip install --upgrade pip wheel >>"$LOG" 2>&1
  python -m pip install pymupdf pytesseract python-docx >>"$LOG" 2>&1
fi

# === Extraktion ===
if [[ "$MODE" == "extract" || "$MODE" == "all" ]]; then
  [ -f "$EXTRACT_PY" ] || die "Fehlt: $EXTRACT_PY"
  say "Schritt 1: OCR & Extraktion…"
  python "$EXTRACT_PY" 2>&1 | tee -a "$LOG"
fi

# === Pipeline ===
if [[ "$MODE" == "pipeline" || "$MODE" == "all" ]]; then
  if [ -f "$PIPELINE_PY" ]; then
    say "Schritt 2: Pipeline…"
    python "$PIPELINE_PY" 2>&1 | tee -a "$LOG"
  else
    say "Schritt 2: $PIPELINE_PY nicht vorhanden → übersprungen."
  fi
fi

# === Export ===
if [[ "$MODE" == "export" || "$MODE" == "all" ]]; then
  [ -f "$EXPORT_PY" ] || die "Fehlt: $EXPORT_PY"
  say "Schritt 3: Export…"
  python "$EXPORT_PY" 2>&1 | tee -a "$LOG"
fi

say "Fertig. Log: $LOG"ø

