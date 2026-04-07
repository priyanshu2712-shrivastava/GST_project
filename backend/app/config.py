"""
Application Configuration
=========================
Uses pydantic-settings to load config from .env file.
All configurable values live here — never hardcode secrets or paths.

API KEY SETUP (Google Cloud Console):
  1. Go to console.cloud.google.com
  2. Enable "Cloud Vision API" and "Generative Language API" in your project
  3. Create 2 API keys under APIs & Services → Credentials:
       Key 1: restrict to Cloud Vision API      → GOOGLE_CLOUD_VISION_API_KEY
       Key 2: restrict to Generative Language API → GOOGLE_GENERATIVE_API_KEY
  4. Paste both into .env
"""

from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # --- Database ---
    DATABASE_URL: str = "sqlite:///./gst_bills.db"

    # --- Google Cloud Vision API ---
    # PRIMARY OCR engine.
    # Restrict this key to: Cloud Vision API
    GOOGLE_CLOUD_VISION_API_KEY: str = ""

    # --- Google Generative Language API ---
    # Used for AI classification (Gemini model).
    # Restrict this key to: Generative Language API
    GOOGLE_GENERATIVE_API_KEY: str = ""

    # --- Groq API ---
    # Fast LLM inference for AI classification.
    # Get key at: console.groq.com
    GROQ_API_KEY: str = ""

    # --- AI Confidence Threshold ---
    # Bills classified below this score → flagged for manual review.
    CONFIDENCE_THRESHOLD: float = 0.7

    # --- Business Context ---
    # Tells the AI what kind of business this is.
    BUSINESS_TYPE: str = "trading"
    BUSINESS_DESCRIPTION: str = "A general trading company dealing in electronics and office supplies"

    # --- File Paths ---
    UPLOAD_DIR: Path = Path("uploads")
    EXPORT_DIR: Path = Path("exports")

    # --- JWT Auth ---
    SECRET_KEY: str = "change-this-to-a-long-random-secret-key-before-production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton — import this everywhere
settings = Settings()

# Ensure directories exist on import
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
