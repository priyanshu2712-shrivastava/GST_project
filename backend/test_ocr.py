"""Quick test to diagnose OCR failure."""
import os, sys, traceback
sys.path.insert(0, ".")

from app.config import settings
print(f"API Key loaded: {settings.GOOGLE_API_KEY[:15]}...")

# Find the latest uploaded image
uploads = [f for f in os.listdir("uploads") if f.endswith((".jpg", ".jpeg", ".png"))]
if not uploads:
    print("ERROR: No image files in uploads/")
    sys.exit(1)

fpath = os.path.join("uploads", uploads[-1])
print(f"Testing file: {fpath} ({os.path.getsize(fpath)/1024:.0f} KB)")

# Test 1: Direct Gemini Vision call
print("\n--- Test 1: Gemini Vision (via LangChain) ---")
try:
    from app.ocr.engine import _extract_text_with_gemini_vision
    result = _extract_text_with_gemini_vision(fpath)
    if result:
        print(f"SUCCESS! Text length: {len(result)}")
        print(f"Preview: {result[:200]}")
    else:
        print("RETURNED None - Gemini Vision did not produce text")
except Exception as e:
    print(f"EXCEPTION: {e}")
    traceback.print_exc()

# Test 2: Tesseract fallback
print("\n--- Test 2: Tesseract Fallback ---")
try:
    from app.ocr.engine import _extract_text_with_tesseract
    result = _extract_text_with_tesseract(fpath)
    if result:
        print(f"SUCCESS! Text length: {len(result)}")
        print(f"Preview: {result[:200]}")
    else:
        print("RETURNED None - Tesseract did not produce text")
except Exception as e:
    print(f"EXCEPTION: {e}")
    traceback.print_exc()
