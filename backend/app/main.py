"""
FastAPI Application Entry Point
================================
Sets up the FastAPI app with:
- CORS middleware (for Next.js frontend on port 3000)
- Router includes for all API modules
- DB table creation on startup
- Health check endpoint

HOW TO RUN:
    cd backend
    uvicorn app.main:app --reload --port 8000

API DOCS:
    http://localhost:8000/docs  (Swagger UI)
    http://localhost:8000/redoc (ReDoc)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.api import upload, process, export, company, auth

# Create the FastAPI app
app = FastAPI(
    title="GST Bill Digitization & Classification API",
    description=(
        "Automated system for reading invoice images/PDFs, "
        "classifying expenses using AI (LangChain + Gemini), "
        "applying deterministic GST/ITC rules, and exporting "
        "Excel reports and Tally XML. Multi-company with JWT auth."
    ),
    version="2.0.0",
)

# --- CORS Middleware ---
# Allow Next.js frontend (port 3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:3001",     # Alternative port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include API Routers ---
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(process.router)
app.include_router(export.router)
app.include_router(company.router)


# --- Startup Event ---
@app.on_event("startup")
def on_startup():
    """Create database tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


# --- Health Check ---
@app.get("/", tags=["Health"])
def health_check():
    """Simple health check endpoint."""
    return {
        "status": "healthy",
        "service": "GST Bill Digitization API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def api_health():
    """API health check with config status."""
    from app.config import settings
    return {
        "status": "healthy",
        "database": "connected",
        "ai_available": bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here"),
        "business_type": settings.BUSINESS_TYPE,
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
    }
