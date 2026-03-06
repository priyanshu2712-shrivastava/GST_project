# GST Bill Digitization & Classification System

AI-powered system to digitize purchase invoices, classify expenses, validate GST/ITC compliance, and export to Excel & Tally.

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│   Frontend   │────▶│              Backend (FastAPI)            │
│  Next.js     │     │                                          │
│  Port 3000   │     │  OCR → AI (LangChain) → Rules → Export  │
│              │     │                              Port 8000   │
└─────────────┘     └──────────────────────────────────────────┘
```

**Key Principle:** AI assists understanding; rule-based logic has final authority on GST/ITC.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Edit .env → add GOOGLE_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** for the dashboard.
API docs at **http://localhost:8000/docs**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI |
| OCR | Tesseract (pytesseract) |
| AI | LangChain + Google Gemini |
| Rules | Pure Python (deterministic) |
| Database | SQLite (SQLAlchemy) |
| Export | openpyxl (Excel), xml.etree (Tally) |
| Frontend | Next.js, TypeScript, Tailwind CSS |
