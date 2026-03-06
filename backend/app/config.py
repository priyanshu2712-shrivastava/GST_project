"""
Application Configuration
=========================
Uses pydantic-settings to load config from .env file.
All configurable values live here — never hardcode secrets or paths.

WHY pydantic-settings?
- Auto-validates types (e.g., CONFIDENCE_THRESHOLD must be float)
- Loads from .env automatically
- Single source of truth for all config
"""

from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    # --- Database ---
    # SQLite for simplicity; swap to postgresql:// for production
    DATABASE_URL: str = "sqlite:///./gst_bills.db"

    # --- Google Gemini API Key ---
    # Get free key: https://aistudio.google.com/apikey
    # Required for AI classification. Without it, classifier returns "unclassified".
    GOOGLE_API_KEY: str = ""

    # --- AI Confidence Threshold ---
    # Bills classified below this score → flagged for manual review.
    # 0.7 = safe default — not too aggressive, catches uncertain cases.
    CONFIDENCE_THRESHOLD: float = 0.7

    # --- Business Context ---
    # Tells the AI what kind of business we are. Same bill can mean
    # different things for different businesses:
    #   Medicine bill → pharma company = raw material
    #   Medicine bill → garment shop = personal expense
    BUSINESS_TYPE: str = "trading"
    BUSINESS_DESCRIPTION: str = "A general trading company dealing in electronics and office supplies"

    # --- File Paths ---
    UPLOAD_DIR: Path = Path("uploads")
    EXPORT_DIR: Path = Path("exports")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton — import this everywhere
settings = Settings()

# Ensure directories exist on import
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
