# GST Bill Digitization & Classification System — Backend

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment
copy .env.example .env
# Edit .env with your GOOGLE_API_KEY

# 4. Run the server
uvicorn app.main:app --reload --port 8000
```

**API Docs:** http://localhost:8000/docs

## Architecture

```
OCR (Tesseract) → AI (LangChain + Gemini) → Rule Engine (Python) → Export (Excel/Tally)
      ↑                    ↑                        ↑
  Extract text       Suggest category      FINAL GST/ITC decision
  No interpretation  No GST/ITC            Deterministic rules
```

## Key Principle
**AI assists understanding, NOT legal decision-making. Rule-based logic has final authority.**
