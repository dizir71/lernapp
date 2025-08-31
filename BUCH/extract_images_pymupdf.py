import sys, os
import fitz  # PyMuPDF

pdf = sys.argv[1]
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
doc = fitz.open(pdf)

for i, page in enumerate(doc, start=1):
    for img_idx, img in enumerate(page.get_images(full=True), start=1):
        xref = img[0]
        base_img = doc.extract_image(xref)
        img_data = base_img["image"]
        ext = base_img["ext"]
        fname = f"page{i}_{img_idx}.{ext}"
        with open(os.path.join(out, fname), "wb") as f:
            f.write(img_data)
print("Fertig")
