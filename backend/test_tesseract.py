import os, sys
sys.path.insert(0, '.')
from app.ocr.engine import _extract_text_with_tesseract

uploads = [f for f in os.listdir('uploads') if f.endswith(('.jpg', '.png', '.jpeg'))]
if uploads:
    fpath = os.path.join('uploads', uploads[-1])
    print(f"Testing Tesseract on {fpath}")
    res = _extract_text_with_tesseract(fpath)
    if res:
        print(f"SUCCESS! Extracted {len(res)} characters.")
        print("-" * 40)
        print(res[:1000])
    else:
        print("FAILED to extract text with Tesseract")
else:
    print("No images found in uploads")
