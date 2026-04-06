"""
Company Profile API
===================
Endpoints to view and update the authenticated company's profile.

Endpoints:
- GET /api/company/   — Get own company info
- PUT /api/company/   — Update own company info
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models import Company
from app.schemas import CompanyRequest, CompanyResponse
from app.auth import get_current_company

router = APIRouter(prefix="/api/company", tags=["Company"])


@router.get("/", response_model=CompanyResponse)
def get_company(current_company: Company = Depends(get_current_company)):
    """Get the currently authenticated company's profile."""
    return CompanyResponse.model_validate(current_company)


@router.put("/", response_model=CompanyResponse)
def update_company(
    data: CompanyRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Update the authenticated company's profile (business type, description, etc.)."""
    current_company.company_name = data.company_name
    current_company.gstin = data.gstin
    current_company.business_type = data.business_type
    current_company.business_description = data.business_description
    current_company.address = data.address
    current_company.phone = data.phone
    current_company.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_company)
    return CompanyResponse.model_validate(current_company)
