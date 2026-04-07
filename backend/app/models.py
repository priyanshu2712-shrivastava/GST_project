"""
Database Models
===============
Three tables that form the core data model:

1. Bill — The uploaded invoice (file path, vendor, totals, status)
2. BillLineItem — Each line item with GST/ITC decisions from rule engine
3. AuditLog — Every AI suggestion + rule override, for compliance trail

WHY separate AI suggestion from final decision?
- AI suggests category + confidence
- Rule engine makes GST/ITC decisions (deterministic)
- If they conflict, the rule engine ALWAYS wins
- Audit log records both for accountability
"""

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Boolean,
    ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class Company(Base):
    """
    Registered company / business profile.
    Each company is a separate tenant — bills are scoped per company.
    Auth: email + hashed password for login.
    """
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    gstin = Column(String(15))           # Company's own GSTIN
    business_type = Column(String(100), nullable=False)
    business_description = Column(Text, nullable=False)
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255), unique=True, nullable=False, index=True)

    # Auth
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationship back to bills
    bills = relationship("Bill", back_populates="company", cascade="all, delete-orphan")


class BillStatus(str, enum.Enum):
    """Lifecycle of a bill through the system."""
    PENDING = "pending"           # Uploaded, not yet processed
    PROCESSING = "processing"     # OCR/AI/Rules running
    PROCESSED = "processed"       # Fully processed, decisions made
    REVIEW_NEEDED = "review_needed"  # Low confidence or risk flags
    ERROR = "error"               # Something went wrong


class Bill(Base):
    """
    Core invoice record.
    One bill = one uploaded file (image/PDF).
    Scoped to a company via company_id — multi-tenant isolation.
    """
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)

    # --- Tenant ---
    company_id = Column(Integer, ForeignKey("company.id"), nullable=False, index=True)

    # --- File Info ---
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(50))  # image/pdf

    # --- Vendor Info (extracted by OCR/AI) ---
    vendor_name = Column(String(255))
    vendor_gstin = Column(String(15))  # 15-char GSTIN
    invoice_number = Column(String(100))
    invoice_date = Column(DateTime)

    # --- Buyer Info (extracted by AI) ---
    buyer_name = Column(String(255))
    buyer_gstin = Column(String(15))
    buyer_address = Column(Text)
    payment_mode = Column(String(50))      # UPI, Cash, Bank Transfer, etc.
    place_of_supply = Column(String(100))
    reverse_charge = Column(Boolean, default=False)
    supplier_ref = Column(String(100))
    buyer_order_no = Column(String(100))

    # --- Financials ---
    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)         # Discount amount from invoice
    net_taxable_amount = Column(Float, default=0.0)  # subtotal - discount
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    # --- OCR Output ---
    raw_ocr_text = Column(Text)  # Full OCR text, stored for debugging

    # --- AI Classification ---
    ai_category = Column(String(100))       # What AI thinks this expense is
    ai_sub_category = Column(String(100))
    ai_confidence = Column(Float)           # 0.0 to 1.0
    ai_reasoning = Column(Text)            # AI's explanation (for viva!)

    # --- Rule Engine Decisions ---
    # These are FINAL — set by deterministic Python, NOT by AI
    final_category = Column(String(100))
    gst_applicable = Column(Boolean, default=True)
    gst_rate = Column(Float)               # 0, 5, 12, 18, 28
    itc_eligible = Column(Boolean, default=False)
    itc_blocked_reason = Column(Text)      # Section 17(5) reason if blocked
    hsn_code = Column(String(20))

    # --- Status & Metadata ---
    status = Column(SQLEnum(BillStatus), default=BillStatus.PENDING)
    risk_flags = Column(Text)              # JSON string of risk flags
    needs_manual_review = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # --- Relationships ---
    company = relationship("Company", back_populates="bills")
    line_items = relationship("BillLineItem", back_populates="bill", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="bill", cascade="all, delete-orphan")


class BillLineItem(Base):
    """
    Individual line items extracted from an invoice.
    Each has its own GST/ITC decision from the rule engine.
    """
    __tablename__ = "bill_line_items"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=False)

    description = Column(String(500))
    hsn_code = Column(String(20))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)

    # Per-item GST breakdown
    gst_rate = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)

    # Per-item ITC decision
    itc_eligible = Column(Boolean, default=False)
    itc_blocked_reason = Column(String(255))

    bill = relationship("Bill", back_populates="line_items")


class AuditLog(Base):
    """
    Audit trail for compliance.
    Records every decision point: AI suggestion, rule application, manual override.

    WHY is this critical?
    - GST compliance requires traceability
    - If a CA asks "why was ITC claimed on this bill?", you can show the full trail
    - In viva: demonstrates you understand compliance != just calculations
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=False)

    action = Column(String(100), nullable=False)  # e.g., "ai_classification", "rule_engine", "manual_override"
    details = Column(Text)         # JSON with full decision details
    performed_by = Column(String(100), default="system")  # "system" or user ID

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bill = relationship("Bill", back_populates="audit_logs")
