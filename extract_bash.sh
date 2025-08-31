# einmalig
chmod +x install_ocr_text_only.sh
./install_ocr_text_only.sh

# PDFs in Ordner legen
mkdir -p pdf_in
# … deine PDFs nach ./pdf_in kopieren …

# Extraktion starten
source .venv_ocr/bin/activate
python3 extract_text_incl_images.py
# Ergebnis: ./txt_out/<datei>_FULL.txt  (Seitenweise Text inkl. OCR aus Bildern)
