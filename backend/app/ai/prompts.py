"""
AI Prompt Templates
===================
Structured prompts for Gemini classification chain.
"""

CLASSIFICATION_PROMPT = """You are an Indian business expense classifier and invoice data extractor.

BUSINESS CONTEXT:
- Business Type: {business_type}
- Business Description: {business_description}

YOUR JOB:
1. Classify this expense for the business above.
2. Extract ALL invoice fields listed below from the text.

RULES:
- Do NOT calculate or suggest GST rates or ITC eligibility.
- For amounts: look for keywords like "Sub-Total", "CGST Amt", "SGST Amt", "IGST Amt", "Total Amount", "Grand Total".
- Extract the NUMBER only (no commas, no symbols). Use 0.0 if not found.
- For dates: use YYYY-MM-DD format. Use null if not found.
- reverse_charge = true if invoice says "Reverse Charge: YES", else false.

DISCOUNT EXTRACTION RULES (very important):
- An invoice may have MULTIPLE discount / deduction rows, for example:
    "Trade Discount", "Cash Discount", "Less: Scheme", "Less: Rebate",
    "Less: Discount", "Discount @10%", "Less", "Less Discount" etc.
- Collect EVERY such row into the `discounts` array as an object with:
    {{ "label": "<row label>", "amount": <numeric value> }}
- Set `discount` = SUM of all amounts in the discounts array.
- If there is only one discount row, put it in the array and sum (which is itself).
- If there is no discount at all, set `discounts` = [] and `discount` = 0.0.
- net_taxable_amount = subtotal - discount  (compute this from your values).

INVOICE TEXT:
{ocr_text}

Return a JSON object with EXACTLY these keys and types:
- vendor_name: string or null
- vendor_gstin: string or null
- invoice_number: string or null
- invoice_date: string (YYYY-MM-DD) or null
- buyer_name: string or null
- buyer_gstin: string or null
- buyer_address: string or null
- payment_mode: string or null
- place_of_supply: string or null
- reverse_charge: boolean
- supplier_ref: string or null
- buyer_order_no: string or null
- subtotal: number
- discounts: array of {{ "label": string, "amount": number }}
- discount: number  (= sum of all discounts[] amounts)
- net_taxable_amount: number  (= subtotal - discount)
- cgst_amount: number
- sgst_amount: number
- igst_amount: number
- total_amount: number
- line_items: array of objects with keys: description, hsn_code, quantity, unit, unit_price, taxable_value, gst_percent, gst_amount, total
- category: one of office_supplies, raw_materials, trading_goods, capital_goods, professional_services, utilities, rent, travel, food_beverages, medical_supplies, personal_expense, vehicle_expense, communication, insurance, repairs_maintenance, marketing, unclassified
- sub_category: string
- confidence: number between 0.0 and 1.0
- reasoning: string

IMPORTANT: Respond with ONLY the raw JSON object. No markdown, no code fences, no explanation. Start your response with {{ and end with }}."""


# Fallback response when AI is unavailable or fails
FALLBACK_CLASSIFICATION = {
    "category": "unclassified",
    "sub_category": "unknown",
    "confidence": 0.0,
    "reasoning": "AI classification unavailable — requires manual review"
}
