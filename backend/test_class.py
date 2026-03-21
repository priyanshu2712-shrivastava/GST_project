import sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models import Bill
from app.ai.classifier import classify_expense

db = SessionLocal()
bill = db.query(Bill).order_by(Bill.id.desc()).first()
if bill and bill.raw_ocr_text:
    print(f"Testing classification for Bill {bill.id}...")
    try:
        res = classify_expense(bill.raw_ocr_text)
        print("Final result:", res)
    except Exception as e:
        print("Exception:", e)
else:
    print("No bill with OCR text found.")
