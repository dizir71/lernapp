#!/usr/bin/env python3
import os, re, subprocess, tempfile, shutil
from pathlib import Path

IN_DIR  = Path("./pdf_in")
OUT_DIR = Path("./txt_out")
LANGS   = "deu+eng"  # Tesseract Sprachen
PSM     = "6"        # gut für Textblöcke

OUT_DIR.mkdir(parents=True, exist_ok=True)
(OUT_DIR / "logs").mkdir(exist_ok=True)

def run(cmd):
    subprocess.run(cmd, check=True)

def ocr_pdf(src: Path) -> Path:
    dst = OUT_DIR / f"{src.stem}_ocr.pdf"
    if not dst.exists():
        run(["ocrmypdf", "-l", LANGS, "--deskew", "--clean", "--output-type", "pdf", str(src), str(dst)])
    return dst

def pdf_text(ocr: Path) -> str:
    txt = OUT_DIR / f"{ocr.stem}.txt"
    run(["pdftotext", "-layout", str(ocr), str(txt)])
    return txt.read_text(encoding="utf-8", errors="ignore")

def list_images_with_pages(pdf: Path):
    """nutzt pdfimages -list, liefert [(page, id, ext_suggestion, outfile_prefix), ...]"""
    out = subprocess.check_output(["pdfimages", "-list", str(pdf)], text=True, errors="ignore")
    lines = out.splitlines()
    header_passed = False
    items = []
    for ln in lines:
        if not header_passed:
            if ln.lower().startswith("page "):
                header_passed = True
            continue
        parts = ln.split()
        if len(parts) < 5:  # robust
            continue
        try:
            page = int(parts[0])
        except:
            continue
        # pdfimages Standard-Ausgabe enthält meist "object id type width height color comp bpc enc interp"
        # Wir erzeugen Outputnamen später; Endung schätzen wir nicht hart -> tesseract liest direkt die Datei.
        items.append(page)
    return items

def ocr_images_text_only(pdf: Path, page_numbers):
    """extrahiert alle Bilder -> ocr -> Text; keine Bilddateien behalten"""
    tmpdir = Path(tempfile.mkdtemp(prefix="imgocr_"))
    try:
        prefix = (tmpdir / "img").as_posix()
        # Alle Bilder extrahieren
        try:
            subprocess.run(["pdfimages", "-all", str(pdf), prefix], check=True)
        except subprocess.CalledProcessError:
            return {}

        # Mapping: Dateinamen enthalten keine Seitennummern zuverlässig -> wir gruppieren nach lex. Reihenfolge
        files = sorted(tmpdir.glob("img*"))
        page_map = {}
        # Hilfsannahme: pdfimages legt Bilder in Seitenreihenfolge ab
        # Wir verteilen der Reihe nach auf die gefundenen pages (falls -list lieferte Seitenanzahl)
        if page_numbers:
            # Anzahl Bilder kann > Seiten sein; wir verteilen sequentiell
            pi = 0
            for f in files:
                if not f.is_file(): continue
                page = page_numbers[min(pi, len(page_numbers)-1)]
                page_map.setdefault(page, []).append(f)
                pi += 1
        else:
            # Kein -list -> wir hängen alles an Seite 1
            page_map[1] = files

        # Tesseract über jedes Bild -> Text sammeln
        img_text_by_page = {}
        for page, imgfiles in page_map.items():
            buff = []
            for img in imgfiles:
                # Tesseract nach STDOUT: via "-"; hier nutzen wir temporäre txt-Datei
                txtfile = img.with_suffix(".txt")
                try:
                    subprocess.run(
                        ["tesseract", str(img), str(txtfile.with_suffix("")), "-l", LANGS, "--psm", PSM],
                        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                    )
                    if txtfile.exists():
                        t = txtfile.read_text(encoding="utf-8", errors="ignore").strip()
                        if t:
                            buff.append(t)
                except subprocess.CalledProcessError:
                    continue
            if buff:
                img_text_by_page[page] = "\n".join(buff)
        return img_text_by_page
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

def merge_text(main_text: str, img_text_map: dict) -> str:
    """Hängt Bildtexte am Ende jeder Seite an. Trenner = klare Marker."""
    # Seiten anhand von Formfeed von pdftotext trennen
    pages = main_text.split("\f")
    merged_pages = []
    for i, ptxt in enumerate(pages, start=1):
        ptxt = ptxt.rstrip()
        extra = img_text_map.get(i, "")
        if extra:
            ptxt += "\n\n[Aus Bildern (Seite %d):]\n%s\n" % (i, extra.strip())
        merged_pages.append(ptxt)
    return "\n\f".join(merged_pages).strip()

def process_pdf(pdf: Path):
    log = OUT_DIR / "logs" / f"{pdf.stem}.log"
    try:
        ocr = ocr_pdf(pdf)
        base_text = pdf_text(ocr)
        # Seitenliste für robustere Zuordnung
        pages_list = list_images_with_pages(ocr)
        img_text = ocr_images_text_only(ocr, pages_list)
        full_text = merge_text(base_text, img_text)
        out_txt = OUT_DIR / f"{pdf.stem}_FULL.txt"
        out_txt.write_text(full_text, encoding="utf-8")
        log.write_text("OK", encoding="utf-8")
    except Exception as e:
        log.write_text(f"ERROR: {e}", encoding="utf-8")

def main():
    pdfs = sorted([p for p in Path("./pdf_in").glob("*.pdf")])
    if not pdfs:
        print("Keine PDFs in ./pdf_in gefunden.")
        return
    for p in pdfs:
        process_pdf(p)
    print(f"Fertig. Texte in: {OUT_DIR}")

if __name__ == "__main__":
    main()
