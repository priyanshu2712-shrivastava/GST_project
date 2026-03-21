import sys
sys.path.insert(0, ".")
from app.config import settings
import google.generativeai as genai

genai.configure(api_key=settings.GOOGLE_API_KEY)

models_to_test = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']

for model_name in models_to_test:
    print(f"\nTesting {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say hi in 1 word", request_options={"timeout": 15})
        print(f"✅ SUCCESS! Response: {response.text.strip()}")
    except Exception as e:
        err_msg = str(e).replace('\n', ' ')
        print(f"❌ FAILED: {type(e).__name__} - {err_msg[:150]}...")
