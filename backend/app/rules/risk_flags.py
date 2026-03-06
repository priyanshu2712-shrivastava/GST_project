"""
Risk Flag Detection
===================
Scans processed bills for compliance risks and anomalies.

WHY risk flags?
- Catches issues BEFORE they become compliance problems
- Low AI confidence → manual review before filing
- Missing GSTIN → can't claim ITC (GSTIN verification is mandatory)
- High-value invoices → extra scrutiny (common in GST audits)

DESIGN: Each flag has a severity + actionable recommendation.
This helps the user (or CA) prioritize what to review first.
"""

from typing import List, Optional
from app.schemas import RiskFlag
from app.config import settings
import json


def detect_risk_flags(
    ai_confidence: float,
    vendor_gstin: Optional[str],
    total_amount: float,
    gst_rate: float,
    itc_eligible: bool,
    category: str,
    ocr_text: Optional[str] = None,
) -> List[RiskFlag]:
    """
    Analyze a processed bill and return risk flags.

    Args:
        ai_confidence: AI classification confidence (0-1)
        vendor_gstin: Vendor's GSTIN (15-char string or None)
        total_amount: Total invoice amount
        gst_rate: Applied GST rate
        itc_eligible: Whether ITC was deemed eligible
        category: Final expense category
        ocr_text: Raw OCR text (for quality checks)

    Returns:
        List of RiskFlag objects, sorted by severity
    """
    flags: List[RiskFlag] = []

    # --- Flag 1: Low AI Confidence ---
    # If AI isn't sure about the category, human should verify
    if ai_confidence < settings.CONFIDENCE_THRESHOLD:
        flags.append(RiskFlag(
            flag_type="low_confidence",
            severity="high",
            message=f"AI confidence is {ai_confidence:.0%}, below threshold ({settings.CONFIDENCE_THRESHOLD:.0%})",
            recommendation="Manually verify the expense category before processing"
        ))

    # --- Flag 2: Missing GSTIN ---
    # Without vendor GSTIN, ITC cannot be claimed (GST law requirement)
    if not vendor_gstin or len(vendor_gstin.strip()) != 15:
        severity = "high" if itc_eligible else "medium"
        flags.append(RiskFlag(
            flag_type="missing_gstin",
            severity=severity,
            message="Vendor GSTIN is missing or invalid (must be 15 characters)",
            recommendation="Obtain vendor GSTIN. ITC CANNOT be claimed without valid GSTIN on invoice."
        ))

    # --- Flag 3: High-Value Invoice ---
    # GST auditors scrutinize high-value transactions more closely
    if total_amount > 250000:  # ₹2.5 lakh threshold (common audit trigger)
        flags.append(RiskFlag(
            flag_type="high_value",
            severity="medium",
            message=f"High-value invoice: ₹{total_amount:,.2f} (above ₹2,50,000 threshold)",
            recommendation="Ensure supporting documentation (purchase order, delivery challan) is available"
        ))

    # --- Flag 4: Unclassified Expense ---
    # If AI couldn't classify, all downstream decisions may be wrong
    if category in ("unclassified", "unknown"):
        flags.append(RiskFlag(
            flag_type="unclassified",
            severity="high",
            message="Expense could not be classified by AI",
            recommendation="Manually assign the correct expense category"
        ))

    # --- Flag 5: Personal Expense with ITC ---
    # Should never happen (rule engine blocks it), but double-check
    if category == "personal_expense" and itc_eligible:
        flags.append(RiskFlag(
            flag_type="personal_itc_conflict",
            severity="high",
            message="Personal expense marked as ITC eligible — this is a compliance violation",
            recommendation="Review classification. Personal expenses are BLOCKED under Section 17(5)(g)"
        ))

    # --- Flag 6: Zero GST on Business Expense ---
    # Very few legitimate business expenses have 0% GST
    if gst_rate == 0.0 and category not in ("personal_expense", "unclassified"):
        flags.append(RiskFlag(
            flag_type="zero_gst_business",
            severity="low",
            message=f"0% GST applied on business expense category '{category}'",
            recommendation="Verify if this item is genuinely GST-exempt or if the rate needs adjustment"
        ))

    # --- Flag 7: Poor OCR Quality ---
    # Very short OCR output suggests the scan was bad
    if ocr_text and len(ocr_text.strip()) < 50:
        flags.append(RiskFlag(
            flag_type="poor_ocr",
            severity="medium",
            message="OCR extracted very little text — possible scan quality issue",
            recommendation="Re-upload a clearer image of the invoice"
        ))

    # Sort by severity: high → medium → low
    severity_order = {"high": 0, "medium": 1, "low": 2}
    flags.sort(key=lambda f: severity_order.get(f.severity, 3))

    return flags


def flags_to_json(flags: List[RiskFlag]) -> str:
    """Serialize risk flags to JSON for database storage."""
    return json.dumps([f.model_dump() for f in flags])
