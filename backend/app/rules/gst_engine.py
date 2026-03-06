"""
GST Rule Engine (Deterministic)
================================
Pure Python lookup tables and functions for GST applicability and rates.

THIS IS THE MOST IMPORTANT MODULE IN THE SYSTEM.
It has FINAL AUTHORITY over all GST decisions.
AI suggests categories; this module decides the tax treatment.

WHY deterministic rules, not AI?
- GST rates are defined by law — they don't require "understanding"
- A lookup table is 100% predictable, testable, and auditable
- If a CA asks "why did you apply 18%?", you can point to the exact rule
- AI hallucinating a GST rate = compliance violation = legal risk

HOW IT WORKS:
1. Takes the expense category (from AI or manual)
2. Looks up the GST rate from a predefined table
3. Returns rate, HSN code, and applicability

NOTE: These rates are simplified for the MVP. In production,
you'd have a full HSN code database with 8000+ entries.
"""

from app.schemas import GSTDecision
from typing import Optional


# ==============================================================
# GST Rate Lookup Table
# ==============================================================
# Maps expense category → (GST rate %, HSN code, description)
#
# Source: CBIC GST rate schedule (simplified for common business expenses)
# In production, this would be a full database table with HSN codes
#
# Format: "category": (rate, hsn_code, description)

GST_RATE_TABLE = {
    # --- Office & Business Supplies ---
    "office_supplies": (18.0, "4820", "Office supplies — stationery, paper, pens"),
    "communication": (18.0, "9984", "Telecom services — phone, internet"),
    "utilities": (18.0, "9981", "Electricity, water supply services"),

    # --- Goods for Business ---
    "raw_materials": (18.0, "9999", "Raw materials — rate varies by actual HSN"),
    "trading_goods": (18.0, "9999", "Trading goods — rate varies by actual HSN"),
    "capital_goods": (18.0, "8471", "Machinery, equipment, computers"),

    # --- Services ---
    "professional_services": (18.0, "9982", "Legal, accounting, consulting services"),
    "repairs_maintenance": (18.0, "9987", "Repair and maintenance services"),
    "marketing": (18.0, "9983", "Advertising, marketing services"),
    "insurance": (18.0, "9971", "Insurance services"),

    # --- Travel & Food ---
    "travel": (5.0, "9964", "Travel — air/rail tickets at 5%"),
    "food_beverages": (5.0, "9963", "Restaurant services (non-AC) at 5%"),

    # --- Rent ---
    "rent": (18.0, "9972", "Commercial rent — GST applicable"),

    # --- Vehicle ---
    "vehicle_expense": (28.0, "8703", "Vehicle purchase/maintenance — 28% slab"),

    # --- Medical ---
    "medical_supplies": (12.0, "3004", "Medicines and medical supplies — 12%"),

    # --- Personal / Non-business ---
    "personal_expense": (0.0, "0000", "Personal expense — not a business input, GST not applicable for ITC"),

    # --- Fallback ---
    "unclassified": (18.0, "9999", "Unclassified — defaulting to 18% (needs manual review)"),
}


def get_gst_details(category: str, sub_category: Optional[str] = None) -> GSTDecision:
    """
    Look up GST details for a given expense category.

    Args:
        category: Expense category from AI classification
        sub_category: Optional sub-category for finer lookup (future use)

    Returns:
        GSTDecision with rate, HSN code, and applicability

    IMPORTANT: This function NEVER guesses. If category isn't in the table,
    it defaults to 18% and flags for manual review.
    """
    # Normalize category name
    category_key = category.lower().strip()

    # Look up in table
    if category_key in GST_RATE_TABLE:
        rate, hsn, description = GST_RATE_TABLE[category_key]
    else:
        # Unknown category → default to 18% + flag for review
        rate, hsn, description = GST_RATE_TABLE["unclassified"]
        description = f"Unknown category '{category}' — defaulting to 18% (NEEDS MANUAL REVIEW)"

    # Personal expenses: GST may exist on the bill but is NOT claimable
    gst_applicable = category_key != "personal_expense"

    return GSTDecision(
        gst_applicable=gst_applicable,
        gst_rate=rate,
        hsn_code=hsn,
        description=description,
    )


def calculate_gst_breakup(amount: float, gst_rate: float, is_interstate: bool = False) -> dict:
    """
    Calculate GST breakup from a base amount.

    Args:
        amount: Base amount (excluding GST)
        gst_rate: GST rate percentage (e.g., 18.0)
        is_interstate: If True → IGST; If False → CGST + SGST (50/50 split)

    Returns:
        Dict with cgst, sgst, igst, and total_with_gst

    WHY separate CGST/SGST vs IGST?
    - Intra-state (same state): Split into CGST (central) + SGST (state)
    - Inter-state (different state): Full IGST
    - This matters for ITC set-off rules
    """
    gst_amount = amount * (gst_rate / 100)

    if is_interstate:
        return {
            "cgst": 0.0,
            "sgst": 0.0,
            "igst": round(gst_amount, 2),
            "total_with_gst": round(amount + gst_amount, 2),
        }
    else:
        half = round(gst_amount / 2, 2)
        return {
            "cgst": half,
            "sgst": half,
            "igst": 0.0,
            "total_with_gst": round(amount + gst_amount, 2),
        }
