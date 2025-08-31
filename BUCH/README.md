# OCR-Automatisierung für macOS (Apple Silicon, M3)

Dieses Projekt automatisiert die Installation und Anwendung einer OCR-Pipeline für gescannte PDFs auf macOS mit Apple-Silicon.

---

##  Inhaltsverzeichnis

1. [Überblick](#überblick)  
2. [Skripte & Funktionen](#skripte--funktionen)  
3. [Installation](#installation)  
4. [PDF-Verarbeitung mit OCR](#pdf-verarbeitung-mit-ocr)  
5. [Erweiterte Extraktion (optional)](#erweiterte-extraktion-optional)  
6. [Projektstruktur & Beispiele](#projektstruktur--beispiele)  
7. [Best Practices & Quellen](#best-practices--quellen)  
8. [Lizenz & Autor](#lizenz--autor)

---

##  Überblick

Dieses Toolset:
- Installiert alle benötigten Komponenten (OCRmyPDF, Tesseract, Poppler, Ghostscript, ImageMagick etc.)
- Erstellt eine isolierte Python-Umgebung für OCR und Textauszug
- Automatisiert OCR-Scans ganzer PDF-Ordner
- Exportiert OCR-PDFs, Textdateien und Metadaten
- Bietet optional Python-Skripts zur Textextraktion & Tabellenanalyse

---

##  Skripte & Funktionen

### `install_ocr_mac.sh`
- Überprüft ob Homebrew vorhanden ist und installiert es falls nötig  
- Installiert System-Tools:
  - `tesseract`, `tesseract-lang`, `ocrmypdf`, `poppler`, `qpdf`, `ghostscript`, `imagemagick`, optional `jbig2enc`, `pngquant`, `unpaper`
- Legt eine Python-venv `.venv_ocr` an und installiert:
  - `ocrmypdf`, `pymupdf`, `pdfminer.six`, `pdfplumber`, `pytesseract`, `opencv-python-headless`, `camelot-py[cv]`

### `ocr_all.sh`
```bash
Usage: ./ocr_all.sh <INPUT_PDF_DIR> <OUTPUT_DIR>




# OCR Automatisierung für macOS (Apple Silicon)

Ein Shell-Toolset, das macOS (M3) fit macht für robuste PDF-OCR-Verarbeitung:
- Installation aller notwendigen Tools (OCRmyPDF, Tesseract, Poppler etc.)
- Verarbeitung ganzer PDF-Ordner mit OCR-Output

## Inhalt
- **install_ocr_mac.sh** – installiert benötigte System- und Python-Tools
- **ocr_all.sh** – führt OCR über alle PDFs in einem Verzeichnis durch und exportiert Text
- Optional: Python-Skripte für erweiterte Extraktion (Tabellen, Layout)

---

##  Voraussetzungen

- macOS mit Apple Silicon (arm64)
- Homebrew (wird automatisch installiert, falls noch fehlt)
- Terminal für Shell-Ausführung

---

##  Installation & Vorbereitung

```bash
# ausführbar machen
chmod +x install_ocr_mac.sh

# Skript ausführen
./install_ocr_mac.sh

# Das Skript:
#	•	Installiert Homebrew (falls nicht vorhanden)  ￼ ￼
#	•	Installiert System-Tools: tesseract, ocrmypdf, poppler, ghostscript, imagemagick usw.
#	•	Erstellt eine virtuelle Python-Umgebung .venv_ocr
#	•	Installiert OCR-Python-Pakete (z. B. ocrmypdf, pymupdf, pdfplumber, pytesseract)
#	•	Gibt am Ende einen Hinweis zur Aktivierung der Umgebung

# PDF-OCR Verarbeitung
./ocr_all.sh /Pfad/to/input_pdfs /Pfad/to/output_folder

Das Skript:
	1.	Aktiviert .venv_ocr (wenn vorhanden)
	2.	Läuft alle PDFs im Eingabeordner durch:
	•	Erstellt OCR-PDFs (ocrmypdf)
	•	Exportiert Text via pdftotext
	3.	Speichert Ergebnisse im Ausgabeordner (ocr_pdf/, txt/, meta/)

Erwartete Ausgabe-Struktur
output/
├── ocr_pdf/
│   └── <datei>_ocr.pdf
├── txt/
│   └── <datei>.txt
└── meta/
    └── <datei>.pages

Optional: Python-basierte Text- und Tabellenextraktion

Mit extract_text_tables.py kannst du aus OCR-PDFs:
	•	Seitenweise Text (via PyMuPDF) exportieren
	•	Tabellen extrahieren (mit pdfplumber)

python3 extract_text_tables.py INPUT_OCR_PDF OUTPUT_FOLDER

Warum dieses Toolset Wertvoll ist
	•	Macht gescannte PDFs durchsuchbar und OCR-basiert editierbar (via ocrmypdf)  ￼ ￼
	•	Unterstützt Deutsch inklusive Skew-/Cleaning-Features
	•	Automatisiert Stapelverarbeitung ganzer Verzeichnisse

Lizenz & Autor
	•	Lizenz: Dual-Licensed (z. B. MIT oder nach eigener Wahl)
	•	Autor: Roland Simmer


Nächste Schritte (optional)
	•	Bash-Integration in andere Tools (z. B. PDF‑Aufgabenanalyse)
	•	Erweiterung um OCR-Audit-Log oder HTML-Ausgabe
	•	Plattformerweiterung für Automator oder iOS Shortcuts

Beiträge

Issues & Pull Requests willkommen. Bitte prüfe vor dem PR:
	•	Code-Funktion
	•	Kompatibilität (macOS M1/M3 geplant)
	•	Korrekte Nutzung von Venv & Homebrew

