import sys
sys.path.insert(0, ".")
from app.api.process import classify_expense

text = """Tax Invoice Original/Duplicate Bill
GSTIN : 07BGUPD3647XXXX
SUNRISE ENTERPRISE
General Store -Delhi-181005
# S-50, 3rd Cross PTC Building, I.T. Estate, New Delhi-1358XX
Contact No. : +91-985669XXX9, +91- 98458XXX38
Inv. No. : Inv-5
Address: #5-50, 3rd PTC Building, LT. Estate, Delhi-1358XX Payment Mode: UPI
Reverse Charge: YES
State Delhi - 07
GSU, _WvenpAKoe Buyer's OrderNo: B4599
Supplier's Ref.: S145
Name: Rajiv Gupta Vehicle Number : V1456
Delivery Date:
State Delhi -07 Transport Details :
GSTIN: HVBADAXX456 Terms Of Delivery :
Best Ball Pen 1495 2 Nos 10.00 20.00 12% 2.40 22.40
Executive Diary 1256 8 Box 590.00 4720.00 12% 566.40 5,286.40
Leather Portfielo Folder 1258 2 Box 630.00 1260.00 12% 151.20 1,411.20
Wireless Mouse 4589 9 Nos 520.00 4680.00 17% 842.40 5,522.40
A4Document File 4587 5 Pkt 420.00 2100.00 12% 252.20 2,352.40
Power Bank 10000mAh 1248 9
Sub-Total: 32898
CGST Amt: 2563.92
SGST Amt: 2563.92
Total Amount: 38026.00"""

res = classify_expense(text)
print("--- AI RESULT ---")
print(res.model_dump_json(indent=2))
