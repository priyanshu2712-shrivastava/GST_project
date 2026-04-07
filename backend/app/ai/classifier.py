"""
AI Classifier (Gemini via Google Generative Language API)
==========================================================
Takes OCR text + business context → returns expense category + ALL invoice fields.

Uses google.generativeai with response_mime_type="application/json"
so Gemini returns valid JSON every time — no markdown fences, no parse failures.

API key: GOOGLE_GENERATIVE_API_KEY in .env
         (restrict to: Generative Language API in Google Cloud Console)
"""

import json
import os
import re

from app.config import settings
from app.schemas import AIClassificationResult
from app.ai.prompts import CLASSIFICATION_PROMPT, FALLBACK_CLASSIFICATION


def _extract_json(raw: str) -> dict:
    """
    Robustly extract a JSON object from a raw string.
    Handles markdown fences, whitespace, and slightly truncated responses.
    """
    text = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.IGNORECASE)
    text = re.sub(r'```\s*$', '', text.strip()).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find('{')
    if start == -1:
        raise json.JSONDecodeError("No JSON object found", text, 0)

    text = text[start:]
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        truncated = text[:e.pos] if e.pos > 0 else text
        open_braces = truncated.count('{') - truncated.count('}')
        open_brackets = truncated.count('[') - truncated.count(']')
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
    Classify an expense from OCR text using Groq (fast LLM inference).
    Returns all invoice fields needed for the dashboard and Excel export.
    On failure: returns 'unclassified' — pipeline never stops.
    """

    # Guard: Empty OCR text
    if not ocr_text or not ocr_text.strip() or ocr_text.startswith("[OCR Error]"):
        return AIClassificationResult(
            category="unclassified", sub_category="unknown", confidence=0.0,
            reasoning="No valid OCR text to classify"
        )

    # Guard: No API key
    if not settings.GROQ_API_KEY:
        print("[CLASSIFIER] GROQ_API_KEY not set — returning unclassified")
        return AIClassificationResult(**FALLBACK_CLASSIFICATION)

    try:
        from groq import Groq
        import time

        client = Groq(api_key=settings.GROQ_API_KEY)

        # Load company context from DB (overrides .env defaults)
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
            ocr_text=ocr_text[:4000]
        )

        print("=" * 60)
        print("[CLASSIFIER] Calling Groq llama-3.3-70b-versatile...")

        # Retry up to 3 times on rate-limit / quota errors
        raw = None
        last_err = None
        for attempt in range(3):
            try:
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a GST invoice classifier. Always respond with valid JSON only. No markdown, no explanations outside the JSON."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.1,
                    max_tokens=2048,
                    response_format={"type": "json_object"},
                )
                raw = response.choices[0].message.content.strip()
                break
            except Exception as exc:
                err_str = str(exc).lower()
                if ("429" in err_str or "quota" in err_str or "rate" in err_str) \
                        and attempt < 2:
                    wait_sec = 10 * (attempt + 1)
                    print(f"[CLASSIFIER] Rate limited. Waiting {wait_sec}s (attempt {attempt+1}/3)...")
                    time.sleep(wait_sec)
                    last_err = exc
                else:
                    raise

        if raw is None:
            raise RuntimeError(f"All retries exhausted. Last error: {last_err}")


        print(f"[CLASSIFIER] Response received ({len(raw)} chars)")
        print(raw[:600])
        print("=" * 60)

        # Save full response for debugging
        try:
            with open("last_api_output.txt", "w", encoding="utf-8") as f:
                f.write(raw)
        except Exception:
            pass

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

        # ── Discount summing ────────────────────────────────────────────
        # An invoice can have multiple discount / "less" rows.
        # The AI returns them in a discounts[] array; we sum them here so
        # `discount` is always the true aggregate deduction.
        _subtotal_val  = _sf(result.get("subtotal"))
        discounts_list = result.get("discounts") or []

        if isinstance(discounts_list, list) and len(discounts_list) > 0:
            _total_discount = round(
                sum(_sf(d.get("amount")) for d in discounts_list if isinstance(d, dict)),
                2
            )
            _labels = ", ".join(
                str(d.get("label", "Discount")) for d in discounts_list if isinstance(d, dict)
            )
            print(f"[CLASSIFIER] Discounts ({len(discounts_list)}): {_labels} → total={_total_discount}")
        else:
            # Fallback: single discount field from AI
            _total_discount = _sf(result.get("discount"))

        # Always recompute net_taxable_amount authoritatively
        _net_taxable = round(_subtotal_val - _total_discount, 2)
        # ───────────────────────────────────────────────────────────────

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
            # Amounts — discount is the SUM of all discount rows
            subtotal=_sf(result.get("subtotal")),
            discount=_total_discount,
            net_taxable_amount=_net_taxable,
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
