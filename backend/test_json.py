import sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models import Bill
from app.config import settings

import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from app.ai.prompts import CLASSIFICATION_PROMPT

db = SessionLocal()
bill = db.query(Bill).order_by(Bill.id.desc()).first()
if not bill or not bill.raw_ocr_text:
    print("No bill")
    sys.exit(0)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY", settings.GOOGLE_API_KEY),
    temperature=0.1,
    max_output_tokens=1500,
)

formatted_prompt = CLASSIFICATION_PROMPT.format(
    business_type=settings.BUSINESS_TYPE,
    business_description=settings.BUSINESS_DESCRIPTION,
    ocr_text=bill.raw_ocr_text[:3000]
)

try:
    response = llm.invoke([HumanMessage(content=formatted_prompt)])
    print("RAW LLM OUTPUT:")
    print(repr(response.content))
except Exception as e:
    print("API Error:", e)
