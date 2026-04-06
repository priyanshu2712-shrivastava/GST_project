import sys
sys.path.insert(0, ".")
from app.ocr.engine import _extract_text_with_tesseract

# Use the specific tricky image
image_path = "uploads/c294187ce6b24965ba3eb6963a3a33f1.jpeg"

print(f"Testing Tesseract OCR pipeline on {image_path}...")
text = _extract_text_with_tesseract(image_path)

print("-" * 50)
if text:
    print("OUTPUT:")
    print(text)
    print(f"\nExtracted {len(text)} characters.")
else:
    print("OCR returned None (meaning the image text was garbage or empty)")
print("-" * 50)
