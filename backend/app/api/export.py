"""
Export API Endpoints
====================
Generates and serves monthly Excel and Tally XML exports.

Endpoints:
- GET /api/export/excel?month=&year=      — Download Excel report
- GET /api/export/tally-xml?month=&year=  — Download Tally XML

DESIGN: Exports are generated on-demand, not pre-computed.
This ensures they always reflect the latest data.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.database import get_db
from app.models import Bill
from app.export.excel_export import generate_monthly_excel
from app.export.tally_export import generate_tally_xml

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/excel")
def export_excel(
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2020, le=2030, description="Year"),
    db: Session = Depends(get_db),
):
    """
    Generate and download a monthly Excel report.

    Contains 3 sheets:
    1. Bill Details — Every bill with vendor, category, amounts
    2. GST Summary — Aggregated CGST/SGST/IGST totals
    3. ITC Summary — Eligible vs blocked by category

    The file is generated fresh on each request to ensure accuracy.
    """
    bills = db.query(Bill).filter(
        extract("month", Bill.created_at) == month,
        extract("year", Bill.created_at) == year,
    ).all()

    if not bills:
        raise HTTPException(
            status_code=404,
            detail=f"No bills found for {month:02d}/{year}"
        )

    try:
        filepath = generate_monthly_excel(bills, month, year)

        return FileResponse(
            path=filepath,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=os.path.basename(filepath),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel generation failed: {str(e)}")


@router.get("/tally-xml")
def export_tally_xml(
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2020, le=2030, description="Year"),
    db: Session = Depends(get_db),
):
    """
    Generate and download Tally-compatible XML for import.

    Creates purchase voucher entries that can be directly imported
    into Tally ERP 9 / Tally Prime.

    Each bill becomes a voucher with:
    - Party ledger (vendor)
    - Purchase ledger (expense category)
    - GST input ledgers (CGST/SGST/IGST)
    """
    bills = db.query(Bill).filter(
        extract("month", Bill.created_at) == month,
        extract("year", Bill.created_at) == year,
    ).all()

    if not bills:
        raise HTTPException(
            status_code=404,
            detail=f"No bills found for {month:02d}/{year}"
        )

    try:
        filepath = generate_tally_xml(bills, month, year)

        return FileResponse(
            path=filepath,
            media_type="application/xml",
            filename=os.path.basename(filepath),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tally XML generation failed: {str(e)}")
