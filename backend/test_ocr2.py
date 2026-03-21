"""Quick Gemini API key validation."""
import sys
sys.path.insert(0, ".")

from app.config import settings
print(f"Key: {settings.GOOGLE_API_KEY[:15]}...")

try:
    import google.generativeai as genai
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(
        "Say hello in one word",
        request_options={"timeout": 15},
    )
    print(f"API WORKS! Response: {response.text}")
except Exception as e:
    print(f"API FAILED: {type(e).__name__}: {e}")
