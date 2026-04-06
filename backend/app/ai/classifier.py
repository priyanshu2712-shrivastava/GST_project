"""
AI Classifier (Gemini JSON Mode)
==================================
Takes OCR text + business context → returns expense category + ALL invoice fields.

Uses google.generativeai with response_mime_type="application/json"
so Gemini returns valid JSON every time — no markdown fences, no parse failures.
"""

import json
import os
import re

from dotenv import load_dotenv
load_dotenv()

from app.config import settings
from app.schemas import AIClassificationResult
from app.ai.prompts import CLASSIFICATION_PROMPT, FALLBACK_CLASSIFICATION


def _extract_json(raw: str) -> dict:
    """
    Robustly extract a JSON object from a raw string.
    Handles:
      - Markdown fences (```json ... ```)
      - Leading/trailing whitespace
      - Slightly truncated responses (attempts recovery by closing open braces)
    """
    # Strip markdown fences if present
    text = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.IGNORECASE)
    text = re.sub(r'```\s*$', '', text.strip())
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the JSON object boundaries
    start = text.find('{')
    if start == -1:
        raise json.JSONDecodeError("No JSON object found", text, 0)

    text = text[start:]

    # Try again after stripping prefix garbage
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # Last resort: truncate at the error position and try to close open braces
        truncated = text[:e.pos] if e.pos > 0 else text
        # Count unclosed braces/brackets and close them
        open_braces = truncated.count('{') - truncated.count('}')
        open_brackets = truncated.count('[') - truncated.count(']')
        # Strip trailing partial token (e.g. incomplete string)
        truncated = re.sub(r',?\s*"[^"]*$', '', truncated)
        truncated = re.sub(r',\s*$', '', truncated)
        truncated += ']' * max(open_brackets, 0)
        truncated += '}' * max(open_braces, 0)
        return json.loads(truncated)


def _sf(val, default=0.0):
    """Safely convert a value to float, handling commas/symbols/None."""
    if val is None:
        return default
    try:
        if isinstance(val, str):
            val = val.replace(',', '').replace('₹', '').replace('Rs.', '').replace('INR', '').strip()
            if not val:
                return default
        return float(val)
    except (ValueError, TypeError):
        return default


def classify_expense(ocr_text: str) -> AIClassificationResult:
    """
    Classify an expense from OCR text using Gemini AI.
    Returns all invoice fields needed for the dashboard and Excel export.
    On failure: returns 'unclassified' — pipeline never stops.
    """

    # Guard: No API key
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        return AIClassificationResult(**FALLBACK_CLASSIFICATION)

    # Guard: Empty OCR text
    if not ocr_text or not ocr_text.strip() or ocr_text.startswith("[OCR Error]"):
        return AIClassificationResult(
            category="unclassified", sub_category="unknown", confidence=0.0,
            reasoning="No valid OCR text to classify"
        )

    try:
        from groq import Groq
        import time
        import re as _re

        client = Groq(api_key=os.getenv("GROQ_API_KEY", settings.GROQ_API_KEY))

        # Prefer company settings from DB over .env defaults
        # This allows company registration to take effect immediately
        business_type = settings.BUSINESS_TYPE
        business_description = settings.BUSINESS_DESCRIPTION
        try:
            from app.database import SessionLocal
            from app.models import Company
            db = SessionLocal()
            company = db.query(Company).filter(Company.id == 1).first()
            if company:
                business_type = company.business_type
                business_description = company.business_description
            db.close()
        except Exception as _db_err:
            print(f"[CLASSIFIER] Could not load company from DB, using .env: {_db_err}")

        prompt = CLASSIFICATION_PROMPT.format(
            business_type=business_type,
            business_description=business_description,
            ocr_text=ocr_text[:3000]
        )

        print("=" * 60)
        print("[CLASSIFIER] Calling Groq API (llama-3.3-70b-versatile)...")

        # Retry up to 3 times on 429 rate-limit errors
        raw = None
        last_err = None
        for attempt in range(3):
            try:
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a precise JSON-only data extraction assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=8000,
                    response_format={"type": "json_object"}
                )
                raw = response.choices[0].message.content.strip()
                break  # Success
            except Exception as exc:
                err_str = str(exc)
                if "429" in err_str or "rate_limit" in err_str.lower():
                    # Extract retry delay from error message if possible
                    delay_match = _re.search(r'retry in (\d+(\.\d+)?)s', err_str)
                    wait_sec = float(delay_match.group(1)) + 1 if delay_match else 10 * (attempt + 1)
                    print(f"[CLASSIFIER] Rate limited (429). Waiting {wait_sec}s before retry {attempt+1}/3...")
                    time.sleep(wait_sec)
                    last_err = exc
                else:
                    raise  # Non-quota error — re-raise immediately

                    raise  # Non-quota error — re-raise immediately

        if raw is None:
            raise RuntimeError(f"Gemini rate limit: all retries exhausted. Last error: {last_err}")

        print(f"[CLASSIFIER] Response received ({len(raw)} chars)")
        print(raw[:600])
        print("=" * 60)

        # Save full response to file for inspection
        try:
            with open("last_api_output.txt", "w", encoding="utf-8") as f:
                f.write(raw)
        except Exception:
            pass

        # Use robust extractor to handle markdown fences / truncation
        result = _extract_json(raw)

        # Build line items list
        line_items = []
        for item in (result.get("line_items") or []):
            if isinstance(item, dict):
                line_items.append({
                    "description": item.get("description"),
                    "hsn_code": item.get("hsn_code"),
                    "quantity": _sf(item.get("quantity"), 1.0),
                    "unit": item.get("unit"),
                    "unit_price": _sf(item.get("unit_price")),
                    "taxable_value": _sf(item.get("taxable_value")),
                    "gst_percent": _sf(item.get("gst_percent")),
                    "gst_amount": _sf(item.get("gst_amount")),
                    "total": _sf(item.get("total")),
                })

        out = AIClassificationResult(
            # Classification
            category=result.get("category") or "unclassified",
            sub_category=result.get("sub_category") or "general",
            confidence=_sf(result.get("confidence"), 0.5),
            reasoning=result.get("reasoning") or "No reasoning provided",
            # Vendor
            vendor_name=result.get("vendor_name"),
            vendor_gstin=result.get("vendor_gstin"),
            invoice_number=result.get("invoice_number"),
            invoice_date=result.get("invoice_date"),
            # Buyer
            buyer_name=result.get("buyer_name"),
            buyer_gstin=result.get("buyer_gstin"),
            buyer_address=result.get("buyer_address"),
            payment_mode=result.get("payment_mode"),
            place_of_supply=result.get("place_of_supply"),
            reverse_charge=bool(result.get("reverse_charge", False)),
            supplier_ref=result.get("supplier_ref"),
            buyer_order_no=result.get("buyer_order_no"),
            # Amounts
            subtotal=_sf(result.get("subtotal")),
            cgst_amount=_sf(result.get("cgst_amount")),
            sgst_amount=_sf(result.get("sgst_amount")),
            igst_amount=_sf(result.get("igst_amount")),
            total_amount=_sf(result.get("total_amount")),
            # Items
            line_items=line_items,
        )
        print(f"[CLASSIFIER] Done: vendor={out.vendor_name}, total={out.total_amount}, items={len(out.line_items)}")
        return out

    except json.JSONDecodeError as e:
        print(f"[CLASSIFIER ERROR] JSON parse failed: {e}")
        import traceback; traceback.print_exc()
        return AIClassificationResult(
            category="unclassified", sub_category="unknown", confidence=0.0,
            reasoning=f"AI returned invalid JSON: {str(e)}"
        )

    except Exception as e:
        print(f"[CLASSIFIER ERROR] {type(e).__name__}: {e}")
        import traceback; traceback.print_exc()
        return AIClassificationResult(
            category="unclassified", sub_category="unknown", confidence=0.0,
            reasoning=f"AI classification failed: {str(e)}"
        )
