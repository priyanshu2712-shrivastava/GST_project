"""
Upload API Endpoints
====================
Handles file upload for bill images and PDFs.

Endpoints:
- POST /api/bills/upload      — Single file upload
- POST /api/bills/upload-bulk  — Multiple files at once

DESIGN:
- Files are saved to disk (not DB) — keeps DB lean
- DB stores metadata + file path reference
- Returns bill ID immediately — processing happens separately
- This decoupling means upload is fast even if OCR/AI is slow
"""

import os
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Bill, BillStatus
from app.schemas import UploadResponse, BulkUploadResponse

router = APIRouter(prefix="/api/bills", tags=["Upload"])

# Allowed file types — only images and PDFs
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".pdf"}


def _validate_file(file: UploadFile) -> str:
    """Validate file type and return the extension."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return ext


async def _save_and_create_bill(file: UploadFile, db: Session) -> Bill:
    """Save uploaded file to disk and create a DB record."""
    ext = _validate_file(file)

    # Generate unique filename to avoid collisions
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(str(settings.UPLOAD_DIR), unique_name)

    # Save file to disk
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Determine file type category
    file_type = "pdf" if ext == ".pdf" else "image"

    # Create DB record with PENDING status
    bill = Bill(
        file_name=file.filename,
        file_path=file_path,
        file_type=file_type,
        status=BillStatus.PENDING,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)

    return bill


@router.post("/upload", response_model=UploadResponse)
async def upload_bill(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a single bill image or PDF.

    Returns the bill ID and PENDING status.
    Call POST /api/bills/{id}/process to trigger OCR + AI + Rules pipeline.
    """
    try:
        bill = await _save_and_create_bill(file, db)
        return UploadResponse(
            id=bill.id,
            file_name=bill.file_name,
            status="pending",
            message="Bill uploaded successfully. Call /api/bills/{id}/process to start processing."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/upload-bulk", response_model=BulkUploadResponse)
async def upload_bills_bulk(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload multiple bills at once.
    Each file is processed independently — one failure doesn't block others.
    """
    uploaded = []
    failed = []

    for file in files:
        try:
            bill = await _save_and_create_bill(file, db)
            uploaded.append(UploadResponse(
                id=bill.id,
                file_name=bill.file_name,
                status="pending",
                message="Uploaded successfully"
            ))
        except Exception as e:
            failed.append({
                "file_name": file.filename or "unknown",
                "error": str(e)
            })

    return BulkUploadResponse(
        uploaded=uploaded,
        failed=failed,
        total_uploaded=len(uploaded),
        total_failed=len(failed),
    )
