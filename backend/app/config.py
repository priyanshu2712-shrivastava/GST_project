"""
Application Configuration
=========================
Uses pydantic-settings to load config from .env file.
All configurable values live here — never hardcode secrets or paths.

API KEY SETUP:
  1. Google Cloud Vision API (OCR):
       Go to console.cloud.google.com → Create API Key
       Restrict to: Cloud Vision API → GOOGLE_CLOUD_VISION_API_KEY

  2. Claude Opus 5 via Agent Router (AI Classification):
       Get your bearer token from your Agent Router dashboard
       Paste it as OPENROUTER_API_KEY in .env
       Set CLAUDE_MODEL to the exact Opus 5 model ID your router lists
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
    # (Legacy) Used as fallback vision OCR if OpenRouter is unavailable.
    GOOGLE_GENERATIVE_API_KEY: str = ""

    # --- Groq API ---
    # (Legacy) Fast LLM inference — kept as a fallback.
    GROQ_API_KEY: str = ""

    # --- OpenRouter / Agent Router (Claude Opus) ---
    # PRIMARY AI classifier. Paste your bearer token here.
    # Get it from: openrouter.ai/keys  OR  your Agent Router dashboard
    OPENROUTER_API_KEY: str = ""

    # Claude model ID to use via the Agent Router.
    # Set this in .env to the EXACT id your router dashboard lists for Opus 5.
    # Common forms (copy whichever your router shows):
    #   claude-opus-5              (bare id)
    #   anthropic/claude-opus-5    (vendor-prefixed, OpenRouter-style)
    CLAUDE_MODEL: str = "claude-opus-5"

    # Base URL for the Agent Router (OpenAI-compatible chat completions).
    # The code appends "/chat/completions" to this. Default works for
    # agentrouter.org; override in .env if your router uses another host/path.
    OPENROUTER_BASE_URL: str = "https://agentrouter.org/v1"

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
