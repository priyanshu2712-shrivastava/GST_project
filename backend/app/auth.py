"""
Authentication Utilities
========================
JWT token creation/validation + password hashing.

This module is the single source of truth for authentication logic.
It provides:
- Password hashing with bcrypt (via passlib)
- JWT token creation and validation (via python-jose)
- get_current_company() — FastAPI dependency for protected endpoints

HOW JWT AUTH WORKS:
1. Company registers → password is hashed → stored in DB
2. Company logs in → password verified → JWT token issued
3. Every protected request → client sends 'Authorization: Bearer <token>'
4. get_current_company() decodes the token → returns the Company from DB
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings

# ---- Password Hashing ----
# bcrypt is the gold standard for password hashing — slow by design,
# resistant to brute force. Never store plain text passwords.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---- JWT Config ----
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# ---- HTTP Bearer scheme for extracting token from Authorization header ----
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if a plain-text password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT token containing the given data payload.
    The 'sub' (subject) claim should be the email of the company.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def get_current_company(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    FastAPI dependency — extracts and validates the JWT from the
    Authorization header, returns the authenticated Company record.

    Usage:
        @router.get("/protected")
        def endpoint(company = Depends(get_current_company)):
            # company is the authenticated Company ORM object
    """
    from app.models import Company  # local import to avoid circular

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please login or register.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    company = db.query(Company).filter(Company.email == email).first()
    if company is None or not company.is_active:
        raise credentials_exception

    return company
