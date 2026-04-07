"""
Processing & Retrieval API Endpoints
=====================================
The core pipeline: OCR → AI Classification → Rule Engine → Store Results.

Endpoints:
- POST /api/bills/{id}/process  — Trigger the full processing pipeline
- GET  /api/bills/{id}          — Get full bill details with all decisions
- GET  /api/bills/              — List bills with filters
- GET  /api/summary/monthly     — Monthly GST/ITC aggregated summary

PIPELINE DESIGN:
1. OCR extracts raw text (no interpretation)
2. LangChain + Gemini classifies the expense (suggests category)
3. GST rule engine looks up rate (deterministic)
4. ITC rule engine checks eligibility (Section 17(5))
5. Risk flags are generated
6. Everything is stored with full audit trail

The AI NEVER makes the final decision. Rules do.
"""

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.database import get_db
from app.models import Bill, BillStatus, AuditLog, Company
from app.schemas import BillResponse, BillListResponse, MonthlySummary
from app.ocr.engine import extract_text
from app.ai.classifier import classify_expense
from app.rules.gst_engine import get_gst_details
from app.rules.itc_engine import check_itc_eligibility
from app.rules.risk_flags import detect_risk_flags, flags_to_json
from app.config import settings
from app.auth import get_current_company

router = APIRouter(tags=["Processing"])


@router.post("/api/bills/{bill_id}/process", response_model=BillResponse)
def process_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company),
):
    """
    Trigger the full processing pipeline for an uploaded bill.
    Only the company that owns the bill can process it.
    """
    # Fetch the bill — scoped to this company
    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.company_id == current_company.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill not found: {bill_id}")

    # Allow reprocessing — reset status
    if bill.status not in (BillStatus.PENDING, BillStatus.ERROR, BillStatus.PROCESSED, BillStatus.REVIEW_NEEDED):
        raise HTTPException(
            status_code=400,
            detail=f"Bill cannot be processed (status: {bill.status.value})."
        )

    try:
        bill.status = BillStatus.PROCESSING
        db.commit()

        # ============================================
        # STEP 1: OCR — Extract raw text
        # ============================================
        ocr_text = extract_text(bill.file_path)
        bill.raw_ocr_text = ocr_text

        # Audit: Record OCR step
        db.add(AuditLog(
            bill_id=bill.id,
            action="ocr_extraction",
            details=json.dumps({
                "text_length": len(ocr_text),
                "has_errors": ocr_text.startswith("[OCR Error]"),
                "preview": ocr_text[:200],
            }),
        ))

        # ============================================
        # STEP 2: AI Classification — Suggest category
        # ============================================
        ai_result = classify_expense(ocr_text)

        bill.ai_category = ai_result.category
        bill.ai_sub_category = ai_result.sub_category
        bill.ai_confidence = ai_result.confidence
        bill.ai_reasoning = ai_result.reasoning

        # Save all extracted invoice fields
        bill.vendor_name = ai_result.vendor_name
        bill.vendor_gstin = ai_result.vendor_gstin
        bill.invoice_number = ai_result.invoice_number
        if ai_result.invoice_date:
            try:
                bill.invoice_date = datetime.strptime(ai_result.invoice_date.strip()[:10], "%Y-%m-%d")
            except ValueError:
                pass

        # Save buyer info
        bill.buyer_name = ai_result.buyer_name
        bill.buyer_gstin = ai_result.buyer_gstin
        bill.buyer_address = ai_result.buyer_address
        bill.payment_mode = ai_result.payment_mode
        bill.place_of_supply = ai_result.place_of_supply
        bill.reverse_charge = ai_result.reverse_charge
        bill.supplier_ref = ai_result.supplier_ref
        bill.buyer_order_no = ai_result.buyer_order_no

        # Use AI-extracted amounts directly
        bill.total_amount = ai_result.total_amount
        if ai_result.subtotal > 0:
            bill.subtotal = ai_result.subtotal
        if ai_result.discount > 0:
            bill.discount = ai_result.discount
        # net_taxable_amount = subtotal - discount
        bill.net_taxable_amount = round((bill.subtotal or 0) - (bill.discount or 0), 2)
        if ai_result.cgst_amount > 0:
            bill.cgst = ai_result.cgst_amount
        if ai_result.sgst_amount > 0:
            bill.sgst = ai_result.sgst_amount
        if ai_result.igst_amount > 0:
            bill.igst = ai_result.igst_amount

        # ── Duplicate Detection ──────────────────────────────────────
        # Check AFTER all data is extracted & saved to the bill object
        # so we can display it in the UI, but mark the bill as ERROR
        # so it is excluded from reports/exports.
        inv_no = ai_result.invoice_number
        v_gstin = ai_result.vendor_gstin
        if inv_no and v_gstin:
            existing = db.query(Bill).filter(
                Bill.company_id == current_company.id,
                Bill.invoice_number == inv_no,
                Bill.vendor_gstin == v_gstin,
                Bill.id != bill.id,          # exclude this very bill
            ).first()
            if existing:
                # Save the extracted data so the UI can display it,
                # but mark as ERROR + duplicate flag so it is excluded
                # from monthly summary and exports.
                bill.status = BillStatus.ERROR
                bill.risk_flags = json.dumps([{
                    "flag_type": "duplicate_invoice",
                    "severity": "high",
                    "message": (
                        f"Duplicate invoice detected. "
                        f"Invoice #{inv_no} from {v_gstin} "
                        f"already exists (Bill #{existing.id})."
                    ),
                    "recommendation": (
                        f"Delete this bill and refer to "
                        f"Bill #{existing.id}."
                    ),
                    "existing_bill_id": existing.id,
                }])
                bill.needs_manual_review = True
                bill.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(bill)
                # Return 200 with all data — the duplicate flag is in
                # risk_flags so the frontend can show a prominent banner.
                return BillResponse.model_validate(bill)
        # ─────────────────────────────────────────────────────────────

        # Audit: Record AI classification
        db.add(AuditLog(
            bill_id=bill.id,
            action="ai_classification",
            details=json.dumps({
                "category": ai_result.category,
                "sub_category": ai_result.sub_category,
                "confidence": ai_result.confidence,
                "reasoning": ai_result.reasoning,
                "business_type": settings.BUSINESS_TYPE,
            }),
        ))

        # ============================================
        # STEP 3: GST Rule Engine — Determine tax treatment
        # ============================================
        gst_decision = get_gst_details(ai_result.category, ai_result.sub_category)

        bill.final_category = ai_result.category
        bill.gst_applicable = gst_decision.gst_applicable
        bill.gst_rate = gst_decision.gst_rate
        bill.hsn_code = gst_decision.hsn_code

        # Fallback: only estimate GST breakdown if AI didn't give us amounts
        if bill.total_amount and bill.total_amount > 0 and (bill.cgst or 0) == 0 and (bill.sgst or 0) == 0 and (bill.igst or 0) == 0:
            if gst_decision.gst_rate > 0:
                bill.subtotal = bill.subtotal or round(bill.total_amount / (1 + gst_decision.gst_rate / 100), 2)
                gst_amount = bill.total_amount - (bill.subtotal or 0)
                bill.cgst = round(gst_amount / 2, 2)
                bill.sgst = round(gst_amount / 2, 2)
                bill.igst = 0.0
            else:
                bill.subtotal = bill.subtotal or bill.total_amount
                bill.cgst = 0.0
                bill.sgst = 0.0
                bill.igst = 0.0

        # Recalculate net_taxable_amount after any fallback changes
        bill.net_taxable_amount = round((bill.subtotal or 0) - (bill.discount or 0), 2)

        # Save line items from AI extraction
        from app.models import BillLineItem
        if ai_result.line_items:
            # Clear old line items first to allow reprocessing
            bill.line_items = []
            for item in ai_result.line_items:
                li = BillLineItem(
                    description=item.description,
                    hsn_code=item.hsn_code,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_price=item.total,
                    gst_rate=item.gst_percent,
                    cgst=item.gst_amount / 2 if item.gst_percent > 0 else 0,
                    sgst=item.gst_amount / 2 if item.gst_percent > 0 else 0,
                    igst=0.0
                )
                bill.line_items.append(li)

        # Audit: Record GST decision
        db.add(AuditLog(
            bill_id=bill.id,
            action="gst_rule_engine",
            details=json.dumps({
                "gst_applicable": gst_decision.gst_applicable,
                "gst_rate": gst_decision.gst_rate,
                "hsn_code": gst_decision.hsn_code,
                "description": gst_decision.description,
                "authority": "RULE_ENGINE (deterministic)",
            }),
        ))

        # ============================================
        # STEP 4: ITC Rule Engine — Check eligibility
        # ============================================
        itc_decision = check_itc_eligibility(
            category=ai_result.category,
            business_type=settings.BUSINESS_TYPE,
            sub_category=ai_result.sub_category,
        )

        bill.itc_eligible = itc_decision.itc_eligible
        bill.itc_blocked_reason = itc_decision.blocked_reason

        # Audit: Record ITC decision
        db.add(AuditLog(
            bill_id=bill.id,
            action="itc_rule_engine",
            details=json.dumps({
                "itc_eligible": itc_decision.itc_eligible,
                "blocked_reason": itc_decision.blocked_reason,
                "section_reference": itc_decision.section_reference,
                "authority": "RULE_ENGINE (Section 17(5))",
            }),
        ))

        # ============================================
        # STEP 5: Risk Flags — Detect compliance issues
        # ============================================
        risk_flags = detect_risk_flags(
            ai_confidence=ai_result.confidence,
            vendor_gstin=bill.vendor_gstin,
            total_amount=bill.total_amount or 0,
            gst_rate=gst_decision.gst_rate,
            itc_eligible=itc_decision.itc_eligible,
            category=ai_result.category,
            ocr_text=ocr_text,
        )

        bill.risk_flags = flags_to_json(risk_flags)
        bill.needs_manual_review = any(f.severity == "high" for f in risk_flags)

        # Set final status
        if bill.needs_manual_review:
            bill.status = BillStatus.REVIEW_NEEDED
        else:
            bill.status = BillStatus.PROCESSED

        bill.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(bill)

        return BillResponse.model_validate(bill)

    except Exception as e:
        bill.status = BillStatus.ERROR
        bill.risk_flags = json.dumps([{
            "flag_type": "processing_error",
            "severity": "high",
            "message": str(e),
            "recommendation": "Check server logs and retry"
        }])
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/api/bills/{bill_id}", response_model=BillResponse)
def get_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company),
):
    """Get full details of a specific bill. Only the owning company can view it."""
    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.company_id == current_company.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill not found: {bill_id}")
    return BillResponse.model_validate(bill)


@router.get("/api/bills/", response_model=BillListResponse)
def list_bills(
    status: Optional[str] = Query(None, description="Filter by status"),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2030),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company),
):
    """
    List this company's bills with optional filters.
    Only returns bills belonging to the authenticated company.
    """
    query = db.query(Bill).filter(Bill.company_id == current_company.id)

    # Apply filters
    if status:
        query = query.filter(Bill.status == status)
    if month:
        query = query.filter(
            Bill.invoice_date.isnot(None),
            extract("month", Bill.invoice_date) == month
        )
    if year:
        query = query.filter(
            Bill.invoice_date.isnot(None),
            extract("year", Bill.invoice_date) == year
        )

    # Paginate
    total = query.count()
    bills = query.order_by(Bill.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return BillListResponse(
        bills=[BillResponse.model_validate(b) for b in bills],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/api/summary/monthly", response_model=MonthlySummary)
def get_monthly_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2030),
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company),
):
    """
    Get aggregated monthly summary for the authenticated company.
    Filters by invoice_date so March 2026 summary shows bills whose
    invoice date is March 2026, regardless of upload date.
    """
    # Exclude ERROR bills (includes duplicates) from summary so they
    # don't distort financial totals.
    bills = db.query(Bill).filter(
        Bill.company_id == current_company.id,
        Bill.status != BillStatus.ERROR,
        Bill.invoice_date.isnot(None),
        extract("month", Bill.invoice_date) == month,
        extract("year", Bill.invoice_date) == year,
    ).all()

    # Aggregate
    total_cgst = sum(b.cgst or 0 for b in bills)
    total_sgst = sum(b.sgst or 0 for b in bills)
    total_igst = sum(b.igst or 0 for b in bills)

    itc_eligible_amount = sum(
        (b.cgst or 0) + (b.sgst or 0) + (b.igst or 0)
        for b in bills if b.itc_eligible
    )
    itc_blocked_amount = sum(
        (b.cgst or 0) + (b.sgst or 0) + (b.igst or 0)
        for b in bills if not b.itc_eligible
    )

    # Category breakdown
    category_breakdown = {}
    for b in bills:
        cat = b.final_category or b.ai_category or "unclassified"
        category_breakdown[cat] = category_breakdown.get(cat, 0) + (b.total_amount or 0)

    return MonthlySummary(
        month=month,
        year=year,
        total_bills=len(bills),
        total_amount=sum(b.total_amount or 0 for b in bills),
        total_cgst=total_cgst,
        total_sgst=total_sgst,
        total_igst=total_igst,
        total_gst=total_cgst + total_sgst + total_igst,
        itc_eligible_amount=itc_eligible_amount,
        itc_blocked_amount=itc_blocked_amount,
        bills_needing_review=sum(1 for b in bills if b.needs_manual_review),
        category_breakdown=category_breakdown,
    )
