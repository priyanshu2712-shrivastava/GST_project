"""
Pydantic Schemas
================
Request/response models for the API layer.
Strict typing ensures no garbage data enters the system.

WHY separate schemas from models?
- Models = database structure (SQLAlchemy)
- Schemas = API contract (what clients send/receive)
- Decoupling means we can change DB without breaking API
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# --------------------
# Enums
# --------------------

class BillStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    REVIEW_NEEDED = "review_needed"
    ERROR = "error"


# --------------------
# AI Classification
# --------------------

class AILineItem(BaseModel):
    description: Optional[str] = None
    hsn_code: Optional[str] = None
    quantity: float = Field(default=1.0)
    unit: Optional[str] = None
    unit_price: float = Field(default=0.0)
    taxable_value: float = Field(default=0.0)
    gst_percent: float = Field(default=0.0)
    gst_amount: float = Field(default=0.0)
    total: float = Field(default=0.0)


class AIClassificationResult(BaseModel):
    """
    Structured output from the Gemini classification chain.
    AI fills these fields; it does NOT touch GST or ITC rules.
    """
    category: str = Field(description="Expense category, e.g. 'office_supplies', 'raw_materials'")
    sub_category: str = Field(default="general", description="Sub-category for finer classification")
    confidence: float = Field(ge=0.0, le=1.0, description="How confident the AI is (0-1)")
    reasoning: str = Field(description="Why the AI chose this category")

    # Vendor / Invoice Info
    vendor_name: Optional[str] = None
    vendor_gstin: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None

    # Buyer Info
    buyer_name: Optional[str] = None
    buyer_gstin: Optional[str] = None
    buyer_address: Optional[str] = None
    payment_mode: Optional[str] = None
    place_of_supply: Optional[str] = None
    reverse_charge: bool = Field(default=False)
    supplier_ref: Optional[str] = None
    buyer_order_no: Optional[str] = None

    # Financial Amounts
    subtotal: float = Field(default=0.0)
    cgst_amount: float = Field(default=0.0)
    sgst_amount: float = Field(default=0.0)
    igst_amount: float = Field(default=0.0)
    total_amount: float = Field(default=0.0)

    # Line Items
    line_items: List[AILineItem] = Field(default_factory=list)



# --------------------
# Rule Engine Output
# --------------------

class GSTDecision(BaseModel):
    """Output from the GST rule engine."""
    gst_applicable: bool
    gst_rate: float  # 0, 5, 12, 18, or 28
    hsn_code: str
    description: str  # Human-readable explanation


class ITCDecision(BaseModel):
    """Output from the ITC rule engine."""
    itc_eligible: bool
    blocked_reason: Optional[str] = None  # Section 17(5) reason
    section_reference: Optional[str] = None  # e.g., "Section 17(5)(a)"


class RiskFlag(BaseModel):
    """A single risk flag raised during processing."""
    flag_type: str  # e.g., "low_confidence", "missing_gstin"
    severity: str  # "low", "medium", "high"
    message: str
    recommendation: str


# --------------------
# Bill Responses
# --------------------

class BillLineItemResponse(BaseModel):
    id: int
    description: Optional[str] = None
    hsn_code: Optional[str] = None
    quantity: float
    unit_price: float
    total_price: float
    gst_rate: float
    cgst: float
    sgst: float
    igst: float
    itc_eligible: bool
    itc_blocked_reason: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    action: str
    details: Optional[str] = None
    performed_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class BillResponse(BaseModel):
    id: int
    file_name: str
    file_type: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_gstin: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    total_amount: float
    raw_ocr_text: Optional[str] = None

    # AI classification
    ai_category: Optional[str] = None
    ai_sub_category: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_reasoning: Optional[str] = None

    # Rule engine final decisions
    final_category: Optional[str] = None
    gst_applicable: Optional[bool] = None
    gst_rate: Optional[float] = None
    itc_eligible: Optional[bool] = None
    itc_blocked_reason: Optional[str] = None
    hsn_code: Optional[str] = None

    # Status
    status: BillStatusEnum
    risk_flags: Optional[str] = None
    needs_manual_review: bool

    created_at: datetime
    updated_at: datetime

    # Nested
    line_items: List[BillLineItemResponse] = []
    audit_logs: List[AuditLogResponse] = []

    class Config:
        from_attributes = True


class BillListResponse(BaseModel):
    """Paginated list of bills."""
    bills: List[BillResponse]
    total: int
    page: int
    per_page: int


# --------------------
# Monthly Summary
# --------------------

class MonthlySummary(BaseModel):
    """Aggregated data for a given month — what CAs need."""
    month: int
    year: int
    total_bills: int
    total_amount: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_gst: float
    itc_eligible_amount: float
    itc_blocked_amount: float
    bills_needing_review: int
    category_breakdown: dict  # category → total amount


# --------------------
# Upload Response
# --------------------

class UploadResponse(BaseModel):
    id: int
    file_name: str
    status: str
    message: str


class BulkUploadResponse(BaseModel):
    uploaded: List[UploadResponse]
    failed: List[dict]
    total_uploaded: int
    total_failed: int


# --------------------
# Company Registration & Auth
# --------------------

class CompanyRegisterRequest(BaseModel):
    """Data submitted when registering a new company account."""
    company_name: str = Field(..., description="Legal company name")
    email: str = Field(..., description="Login email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    business_type: str = Field(..., description="e.g. 'medicine', 'trading', 'manufacturing'")
    business_description: str = Field(..., description="Brief description of what the business does")
    gstin: Optional[str] = Field(None, max_length=15, description="Company's own GSTIN (15 chars)")
    address: Optional[str] = None
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    """Credentials for login."""
    email: str
    password: str


class TokenResponse(BaseModel):
    """Returned after successful register or login."""
    access_token: str
    token_type: str = "bearer"
    company_id: int
    company_name: str
    email: str
    business_type: str


class CompanyRequest(BaseModel):
    """Data submitted when updating company profile (auth required)."""
    company_name: str = Field(..., description="Legal company name")
    gstin: Optional[str] = Field(None, max_length=15, description="Company's own GSTIN (15 chars)")
    business_type: str = Field(..., description="e.g. 'medicine', 'trading', 'manufacturing'")
    business_description: str = Field(..., description="Brief description of what the business does")
    address: Optional[str] = None
    phone: Optional[str] = None


class CompanyResponse(BaseModel):
    """Returned when fetching registered company info."""
    id: int
    company_name: str
    email: str
    gstin: Optional[str] = None
    business_type: str
    business_description: str
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
