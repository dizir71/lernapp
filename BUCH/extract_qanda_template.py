#!/usr/bin/env python3
import os
import re
import json
import shutil
import datetime
import subprocess

OUTPUT = 'qanda.json'
ERROR_LOG = 'error.txt'

# -----------------------------
# Extraction and normalization
# -----------------------------

def pdftotext_extract(pdf_path, txt_path):
    # Use -layout and UTF-8 to preserve physical layout and punctuation
    # Optionally add '-nopgbrk' if page breaks interfere
    cmd = ['pdftotext', '-layout', '-enc', 'UTF-8', pdf_path, txt_path]
    subprocess.run(cmd, check=True)  # raises if fail

def normalize_text(text):
    # Remove soft hyphen
    text = text.replace('\u00ad', '')
    # Join hyphenated line breaks like "Wirt-\nschaft" -> "Wirtschaft"
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    # Convert CRLF to LF consistently
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Gently unwrap line breaks inside sentences:
    # replace single newlines with spaces if the previous char isn't a terminator or bullet
    text = re.sub(r'(?<![.!?:;•\-])\n(?=[^\n])', ' ', text)
    # Collapse excessive spaces
    text = re.sub(r'[ \t]+', ' ', text)
    return text

# -----------------------------
# Question detection patterns
# -----------------------------

# Headed tasks
HEADED_TASKS = re.compile(
    r'^(Aufgabe(n)?|Arbeitsauftrag|Fragestellung|Fragen|Übung|Case|Fallstudie)[:\s•\-]+(.+)$',
    re.IGNORECASE | re.MULTILINE
)

# Imperative prompts without question marks
IMPERATIVE_PROMPTS = re.compile(
    r'^(Beschreiben|Erläutern|Erklären|Begründen|Nennen|Vergleichen|Analysieren|Diskutieren'
    r'|Bewerten|Zeigen|Stellen|Formulieren|Identifizieren|Gliedern|Skizzieren'
    r'|Berechnen|Bestimmen|Ermitteln|Rechnen|Prüfen|Beweisen)\w*\b[^\n]+$',
    re.IGNORECASE | re.MULTILINE
)

# Standard question sentences with a question mark, allow them to span lines after normalization
QUESTION_SENTENCES = re.compile(
    r'[^.!?\n]{6,}\?',
    re.UNICODE
)

# Calculation cues: keywords + typical commercial terms or numbers/units
CALC_TERMS = r'(Kosten|Umsatz|Gewinn|Preis|Menge|Skonto|Rabatt|Deckungsbeitrag|Rohertrag|Netto|Brutto|Steuer|Zinsen)'
CALC_PROMPTS = re.compile(
    rf'(?i)(berechne[nr]?|rechnen|ermittle[nr]?|wie hoch|wie viel|wieviel|beträgt|bestimme[nr]?).*?({CALC_TERMS}|[0-9][0-9\.,%]*\s?(€|EUR|Stk|kg|t|m|cm|mm)?)'
)

def extract_questions(text):
    found = set()

    # Headed blocks like "Aufgabe: ..." single-line
    for m in HEADED_TASKS.finditer(text):
        q = m.group(0).strip()
        if len(q) > 7:
            found.add(q)

    # Imperative prompts (line-based)
    for m in IMPERATIVE_PROMPTS.finditer(text):
        q = m.group(0).strip()
        if len(q) > 7:
            found.add(q)

    # Standard questions ending with '?'
    for m in QUESTION_SENTENCES.finditer(text):
        q = m.group(0).strip()
        if len(q) > 7:
            found.add(q)

    # Calculation prompts with business terms or numbers/units
    for m in CALC_PROMPTS.finditer(text):
        q = m.group(0).strip()
        if len(q) > 7:
            found.add(q)

    # Return as list, stable order
    return list(found)

def extract_answer_stub(text, question):
    # Prototype: attempt to capture the next 1–2 lines after the question as a stub
    idx = text.find(question)
    if idx == -1:
        return "", ""
    snippet = text[idx + len(question): idx + len(question) + 500]
    # Split by line boundaries
    lines = [l.strip() for l in snippet.split('\n') if l.strip()]
    answer = lines if lines else ""
    description = lines[15] if len(lines) > 1 else ""
    # If the next line looks like another question, don't take it as an answer
    if QUESTION_SENTENCES.search(answer) or HEADED_TASKS.search(answer) or IMPERATIVE_PROMPTS.search(answer):
        answer = ""
    return answer, description

# -----------------------------
# Merge/backup helpers
# -----------------------------

def backup_if_exists(path):
    if os.path.exists(path):
        ts = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        backup_name = f"{path}.{ts}.bak"
        shutil.copy2(path, backup_name)
        print(f"Backup created: {backup_name}")
    else:
        print("No existing qanda.json found. No backup created.")

def load_existing_qanda(path):
    if not os.path.exists(path):
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and 'questions' in data and isinstance(data['questions'], list):
        return data['questions']
    return []

# -----------------------------
# Main processing
# -----------------------------

def main():
    print("Scanning for PDF files...")
    pdf_files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    if not pdf_files:
        print("No PDF files found in current folder.")
        return

    # Backup before modifying
    backup_if_exists(OUTPUT)

    # Load existing and find next id

