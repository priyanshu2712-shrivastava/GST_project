import sys
sys.path.insert(0, ".")
from app.config import settings
import google.generativeai as genai

print(f"Using API Key: ...{settings.GEMINI_API_KEY[-6:] if settings.GEMINI_API_KEY else 'NONE'}")
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content("what is capital of india", request_options={"timeout": 15})
    print("Response:", response.text)
except Exception as e:
    print(f"API Error: {type(e).__name__} - {str(e)}")
