"""Test Gemini Vision OCR directly on uploaded files."""
import os
import sys
sys.path.insert(0, ".")

from app.config import settings
print(f"API Key set: {bool(settings.GOOGLE_API_KEY)}")
print(f"API Key: {settings.GOOGLE_API_KEY[:10]}...")

# Find the medical bill file
uploads = os.listdir("uploads")
print(f"\nUploaded files: {uploads}")

# Test with google.generativeai directly (faster than LangChain)
import google.generativeai as genai
import base64

genai.configure(api_key=settings.GOOGLE_API_KEY)

# Test with the first jpg file
for fname in uploads:
    if fname.endswith(".jpg"):
        fpath = os.path.join("uploads", fname)
        size = os.path.getsize(fpath) / 1024
        print(f"\nTesting: {fname} ({size:.0f} KB)")
        
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        import PIL.Image
        img = PIL.Image.open(fpath)
        print(f"Image size: {img.size}")
        
        try:
            response = model.generate_content(
                ["Extract ALL text from this invoice image. Return only the text.", img],
                request_options={"timeout": 30}
            )
            print(f"Response: {response.text[:300]}")
        except Exception as e:
            print(f"Error: {e}")
        
        break  # Test just one
