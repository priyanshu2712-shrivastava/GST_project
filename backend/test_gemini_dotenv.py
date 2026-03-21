import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print(f"Loaded API key ending in: ...{api_key[-4:] if api_key else 'None'}")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    print("Testing gemini-2.5-flash model...")
    response = model.generate_content("What is capital of india? Answer in 1 word.", request_options={"timeout": 15})
    print("SUCCESS! Response:", response.text.strip())
except Exception as e:
    err_str = str(e).replace('\n', ' ')
    print(f"FAILED: {type(e).__name__} - {err_str[:150]}...")
