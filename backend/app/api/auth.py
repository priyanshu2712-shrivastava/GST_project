"""
Authentication API Endpoints
=============================
Handles company registration, login, and profile retrieval.

Endpoints:
- POST /api/auth/register  — Create a new company account
- POST /api/auth/login     — Login and get a JWT token
- GET  /api/auth/me        — Get current logged-in company info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models import Company
from app.schemas import CompanyRegisterRequest, LoginRequest, TokenResponse, CompanyResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_company

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register_company(data: CompanyRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new company.

    - Creates a new Company record with a hashed password
    - Returns a JWT token immediately (no need to login separately)
    - Email must be unique across all companies
    """
    # Check if email already registered
    existing = db.query(Company).filter(Company.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please login instead.",
        )

    # Hash password and create company
    company = Company(
        company_name=data.company_name,
        email=data.email,
        password_hash=hash_password(data.password),
        business_type=data.business_type,
        business_description=data.business_description,
        gstin=data.gstin,
        address=data.address,
        phone=data.phone,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # Issue JWT token
    token = create_access_token(data={"sub": company.email})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        company_id=company.id,
        company_name=company.company_name,
        email=company.email,
        business_type=company.business_type,
    )


@router.post("/login", response_model=TokenResponse)
def login_company(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password.

    - Verifies credentials against the stored hash
    - Returns a JWT token valid for 7 days
    """
    company = db.query(Company).filter(Company.email == data.email).first()

    if not company or not verify_password(data.password, company.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support.",
        )

    token = create_access_token(data={"sub": company.email})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        company_id=company.id,
        company_name=company.company_name,
        email=company.email,
        business_type=company.business_type,
    )


@router.get("/me", response_model=CompanyResponse)
def get_me(current_company: Company = Depends(get_current_company)):
    """
    Get the currently authenticated company's profile.
    Requires a valid Bearer token in the Authorization header.
    """
    return CompanyResponse.model_validate(current_company)
