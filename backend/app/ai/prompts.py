"""
AI Prompt Templates
===================
Strict, structured prompts for the LangChain classification chain.

DESIGN PRINCIPLES:
1. Prompt explicitly FORBIDS AI from making GST/ITC decisions
2. Forces JSON output — no free-form text that could be misinterpreted
3. Business context is injected so same bill gets classified differently
   for different businesses (medicine → pharma vs garment shop)
4. Short prompt = fewer tokens = faster + cheaper + less hallucination

WHY strict prompts?
- In production, vague prompts cause inconsistent outputs
- Structured JSON output can be programmatically validated
- Explicit constraints prevent the model from "helping" with GST
"""

CLASSIFICATION_PROMPT = """You are an Indian business expense classifier.
Your ONLY job is to classify the expense described in the invoice text below.

BUSINESS CONTEXT:
- Business Type: {business_type}
- Business Description: {business_description}

STRICT RULES:
1. You MUST NOT calculate, suggest, or mention GST rates or ITC eligibility.
2. You MUST NOT make any tax-related decisions.
3. You MUST classify based on what the expense IS for this specific business.
4. You MUST output ONLY valid JSON, nothing else.

EXAMPLE: A medicine bill means:
- For a pharma company → "raw_materials" or "trading_goods"
- For a garment shop → "personal_expense" (NOT business related)
- For a hospital → "medical_supplies"

INVOICE TEXT:
{ocr_text}

OUTPUT FORMAT (JSON only, no markdown, no explanation outside JSON):
{{
    "vendor_name": "<string or null>",
    "vendor_gstin": "<string or null>",
    "invoice_number": "<string or null>",
    "invoice_date": "<YYYY-MM-DD or null>",
    "total_amount": <float or 0.0>,
    "category": "<one of: office_supplies, raw_materials, trading_goods, capital_goods, professional_services, utilities, rent, travel, food_beverages, medical_supplies, personal_expense, vehicle_expense, communication, insurance, repairs_maintenance, marketing, unclassified>",
    "sub_category": "<specific sub-type, e.g. 'printer_paper', 'diesel', 'consulting_fees'>",
    "confidence": <float between 0.0 and 1.0>,
    "reasoning": "<one sentence explaining WHY this category for THIS business>"
}}"""


# Fallback response when AI is unavailable or fails
FALLBACK_CLASSIFICATION = {
    "category": "unclassified",
    "sub_category": "unknown",
    "confidence": 0.0,
    "reasoning": "AI classification unavailable — requires manual review"
}
