#!/usr/bin/env bash
set -euo pipefail

# === Konfiguration ===
PDF_DIR="./pdf_in"
VENV_DIR=".venv_ocr"
LOG_DIR="./logs"
TS="$(date +"%Y-%m-%d_%H-%M-%S")"
LOG="$LOG_DIR/run_$TS.log"

EXTRACT_PY="./extract_all_qna_inline.py"
PIPELINE_PY="./pipeline_qa_text_with_image.py"   # optional
EXPORT_PY="./export_styled_outputs.py"

# === Helper ===
say(){ echo "[*] $*"; echo "[*] $*" >>"$LOG"; }
die(){ echo "[!] $*" | tee -a "$LOG"; exit 1; }

# === Arbeitsverzeichnis & Logs ===
mkdir -p "$LOG_DIR"
cd "$(dirname "$0")"
say "Start: $(date)"

# === PDF-Ordner sicherstellen ===
if [ ! -d "$PDF_DIR" ]; then
  mkdir -p "$PDF_DIR"
  say "Ordner $PDF_DIR angelegt. PDFs hier ablegen."
fi

# === Auswahl per AppleScript (GUI) ===
CHOICE_RAW=""
if command -v osascript >/dev/null 2>&1; then
  CHOICE_RAW="$(osascript <<'APPLESCRIPT'
set opts to {"Install/Setup","Extract OCR/Q&A","Pipeline","Export"}
try
  set picked to choose from list opts with title "BWL-Lernapp: Aufgaben auswählen" with prompt "Mehrfachauswahl möglich. Nichts auswählen = alle Schritte." with multiple selections allowed
  if picked is false then
    return "ALL"
  end if
  if (count of picked) is 0 then
    return "ALL"
  end if
  return picked as string
on error
  return "ALL"
end try
APPLESCRIPT
)"
else
  CHOICE_RAW="ALL"
fi

# === Auswahl interpretieren ===
RUN_INSTALL=false
RUN_EXTRACT=false
RUN_PIPELINE=false
RUN_EXPORT=false

set_all() { RUN_INSTALL=true; RUN_EXTRACT=true; RUN_PIPELINE=true; RUN_EXPORT=true; }

if [[ "$CHOICE_RAW" == "ALL" || -z "$CHOICE_RAW" ]]; then
  set_all
else
  case "$CHOICE_RAW" in *"Install/Setup"*)    RUN_INSTALL=true;; esac
  case "$CHOICE_RAW" in *"Extract OCR/Q&A"*) RUN_EXTRACT=true;; esac
  case "$CHOICE_RAW" in *"Pipeline"*)        RUN_PIPELINE=true;; esac
  case "$CHOICE_RAW" in *"Export"*)          RUN_EXPORT=true;; esac
  if ! $RUN_INSTALL && ! $RUN_EXTRACT && ! $RUN_PIPELINE && ! $RUN_EXPORT; then
    set_all
  fi
fi

say "Auswahl: install=$RUN_INSTALL extract=$RUN_EXTRACT pipeline=$RUN_PIPELINE export=$RUN_EXPORT"

# === Homebrew + Tools (falls gewählt oder für weitere Schritte nötig) ===
ensure_tools() {
  if ! command -v brew >/dev/null 2>&1; then
    say "Homebrew fehlt. Installation startet…"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
    if [ -x /usr/local/bin/brew ]; then eval "$(/usr/local/bin/brew shellenv)"; fi
  else
    eval "$(brew shellenv)"
  fi
  say "Prüfe/Installiere Systemtools…"
  brew update >>"$LOG" 2>&1 || true
  brew install ocrmypdf tesseract tesseract-lang poppler >>"$LOG" 2>&1 || true
}

# === Python venv + Pakete ===
ensure_venv() {
  if [ ! -x "$VENV_DIR/bin/python" ]; then
    say "Erzeuge venv $VENV_DIR…"
    python3 -m venv "$VENV_DIR"
  fi
  source "$VENV_DIR/bin/activate"
  python -m pip install --upgrade pip wheel >>"$LOG" 2>&1
  python -m pip install pymupdf pytesseract python-docx >>"$LOG" 2>&1
}

# === INSTALL/SETUP ===
if $RUN_INSTALL || $RUN_EXTRACT || $RUN_PIPELINE || $RUN_EXPORT; then
  ensure_tools
  ensure_venv
fi

# === Schritt: EXTRACT ===
if $RUN_EXTRACT; then
  [ -f "$EXTRACT_PY" ] || die "Fehlt: $EXTRACT_PY"
  say "Schritt 1: OCR & Extraktion…"
  python "$EXTRACT_PY" 2>&1 | tee -a "$LOG"
  [ -f "all_text_linear.txt" ] || die "Fehlt: all_text_linear.txt"
  if [ ! -f "all_qna.json" ]; then
    say "Hinweis: all_qna.json nicht gefunden. Q&A evtl. leer."
  fi
fi

# === Schritt: PIPELINE (optional) ===
if $RUN_PIPELINE; then
  if [ -f "$PIPELINE_PY" ]; then
    say "Schritt 2: Pipeline…"
    python "$PIPELINE_PY" 2>&1 | tee -a "$LOG"
  else
    say "Schritt 2: $PIPELINE_PY nicht vorhanden → übersprungen."
  fi
fi

# === Schritt: EXPORT ===
if $RUN_EXPORT; then
  [ -f "$EXPORT_PY" ] || die "Fehlt: $EXPORT_PY"
  say "Schritt 3: Export (Word/Markdown)…"
  python "$EXPORT_PY" 2>&1 | tee -a "$LOG"
fi

# === Ergebnis ===
say "Fertig."
[ -f "all_text_linear.txt" ] && say "Output: all_text_linear.txt"
[ -f "all_qna.json" ] && say "Output: all_qna.json"
[ -d "styled_out" ] && say "Output: styled_out/ (Kapitel_XX.docx / .md)"
say "Log: $LOG"
exit 0
