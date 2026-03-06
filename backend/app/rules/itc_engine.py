"""
ITC (Input Tax Credit) Eligibility Engine
==========================================
Deterministic rules for ITC eligibility based on Section 17(5) of CGST Act.

WHY IS THIS CRITICAL?
- ITC = businesses can offset GST paid on inputs against GST collected on outputs
- But Section 17(5) BLOCKS ITC on specific categories
- Wrongly claiming ITC = penalty + interest + legal action
- This module prevents that by hard-coding the blocked categories

SECTION 17(5) BLOCKED CREDITS (simplified):
(a) Motor vehicles and conveyances (except certain cases)
(b) Food, beverages, outdoor catering, beauty treatment, health services,
    cosmetic and plastic surgery (except as input service)
(c) Membership of club, health and fitness centre
(d) Rent-a-cab, life insurance, health insurance (except certain cases)
(e) Travel benefits to employees on vacation
(f) Works contract services for immovable property (except input service)
(g) Goods/services used for personal consumption
(h) Goods lost, stolen, destroyed, or given as free samples

DESIGN: Each blocked category maps to the exact section reference.
A CA can audit this by matching the code to the Act.
"""

from app.schemas import ITCDecision
from typing import Optional


# ==============================================================
# Section 17(5) Blocked Credit Rules
# ==============================================================
# Maps category → (is_blocked, section_reference, reason)
# True = ITC BLOCKED (cannot claim)
# False = ITC ALLOWED (can claim)

BLOCKED_CREDIT_RULES = {
    # --- BLOCKED under Section 17(5) ---
    "vehicle_expense": (
        True,
        "Section 17(5)(a)",
        "Motor vehicles and conveyances — ITC blocked except for "
        "transport of passengers, goods, or vehicle dealing business"
    ),
    "food_beverages": (
        True,
        "Section 17(5)(b)(i)",
        "Food and beverages, outdoor catering — ITC blocked unless "
        "provided as output service (e.g., restaurant business)"
    ),
    "personal_expense": (
        True,
        "Section 17(5)(g)",
        "Goods or services used for personal consumption — "
        "ITC always blocked, not a business input"
    ),
    "travel": (
        True,
        "Section 17(5)(e)",
        "Travel benefits extended to employees on vacation — "
        "ITC blocked. Business travel exceptions require documentation"
    ),
    "insurance": (
        False,  # Generally allowed for business insurance
        None,
        "Business insurance — ITC generally allowed"
    ),
    "medical_supplies": (
        True,
        "Section 17(5)(b)(ii)",
        "Health services (cosmetic/plastic surgery excluded) — "
        "ITC blocked unless it's an input service for healthcare provider"
    ),

    # --- ALLOWED categories ---
    "office_supplies": (False, None, "Office supplies for business use — ITC allowed"),
    "raw_materials": (False, None, "Raw materials for manufacturing/trading — ITC allowed"),
    "trading_goods": (False, None, "Goods for resale — ITC allowed"),
    "capital_goods": (False, None, "Capital goods for business — ITC allowed"),
    "professional_services": (False, None, "Professional services for business — ITC allowed"),
    "utilities": (False, None, "Business utilities — ITC allowed"),
    "rent": (False, None, "Commercial rent for business premises — ITC allowed"),
    "communication": (False, None, "Business communication expenses — ITC allowed"),
    "repairs_maintenance": (False, None, "Business repairs and maintenance — ITC allowed"),
    "marketing": (False, None, "Marketing and advertising — ITC allowed"),
}


def check_itc_eligibility(
    category: str,
    business_type: str = "trading",
    sub_category: Optional[str] = None,
) -> ITCDecision:
    """
    Check if ITC can be claimed for a given expense category.

    Args:
        category: Expense category (from AI classification or manual)
        business_type: Type of business (affects some exceptions)
        sub_category: For finer rules (future expansion)

    Returns:
        ITCDecision with eligibility, blocked reason, and section reference

    DESIGN: Default is BLOCKED (conservative).
    We'd rather flag something for review than wrongly claim ITC.
    This is the SAFE approach a CA would approve.
    """
    category_key = category.lower().strip()

    # --- Special business-type exceptions ---
    # Food business CAN claim ITC on food inputs (it's their output service)
    if category_key == "food_beverages" and business_type in ("restaurant", "catering", "food_processing"):
        return ITCDecision(
            itc_eligible=True,
            blocked_reason=None,
            section_reference="Section 17(5)(b) exception — food is output service for this business"
        )

    # Vehicle dealers CAN claim ITC on vehicles (it's their trading goods)
    if category_key == "vehicle_expense" and business_type in ("automobile_dealer", "vehicle_trading"):
        return ITCDecision(
            itc_eligible=True,
            blocked_reason=None,
            section_reference="Section 17(5)(a) exception — vehicles are trading goods for this business"
        )

    # Healthcare providers CAN claim ITC on medical supplies
    if category_key == "medical_supplies" and business_type in ("hospital", "clinic", "pharma"):
        return ITCDecision(
            itc_eligible=True,
            blocked_reason=None,
            section_reference="Section 17(5)(b) exception — medical supplies are input for healthcare provider"
        )

    # --- Standard lookup ---
    if category_key in BLOCKED_CREDIT_RULES:
        is_blocked, section_ref, reason = BLOCKED_CREDIT_RULES[category_key]
        return ITCDecision(
            itc_eligible=not is_blocked,
            blocked_reason=reason if is_blocked else None,
            section_reference=section_ref
        )

    # --- Unknown category: DEFAULT TO BLOCKED (conservative) ---
    # Better to block and review than to wrongly claim
    return ITCDecision(
        itc_eligible=False,
        blocked_reason=f"Unknown category '{category}' — defaulting to BLOCKED for safety. Requires manual review.",
        section_reference="Manual review required"
    )
