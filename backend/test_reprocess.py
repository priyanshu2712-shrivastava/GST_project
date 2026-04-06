import requests

# Find the first bill to reprocess
bills = requests.get("http://localhost:8000/api/bills/").json()
if not bills.get('bills'):
    print("No bills found.")
else:
    bill_id = bills['bills'][0]['id']
    print(f"Reprocessing Bill ID: {bill_id}")
    res = requests.post(f"http://localhost:8000/api/bills/{bill_id}/process")
    print(res.status_code)
    print(res.text)
