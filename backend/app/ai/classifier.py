"""
AI Classifier (LangChain + Gemini)
==================================
Takes OCR text + business context → returns expense category + confidence.

ARCHITECTURE:
- Uses LangChain's ChatGoogleGenerativeAI (Gemini free tier)
- Prompt from prompts.py forces structured JSON output
- Response is parsed into AIClassificationResult Pydantic model
- On ANY failure, returns "unclassified" — system never crashes due to AI

WHY LangChain?
- Clean abstraction over LLM providers (can swap Gemini → OpenAI → local)
- Prompt templating with variable injection
- Output parsing with validation
- Easy to explain in viva: "We used LangChain for prompt management and output parsing"

WHY NOT Agents?
- Agents add complexity with tool-calling, which we don't need
- A simple chain (prompt → LLM → parse) is sufficient
- Easier to debug, test, and explain
"""

import json
import os
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from app.config import settings
from app.schemas import AIClassificationResult
from app.ai.prompts import CLASSIFICATION_PROMPT, FALLBACK_CLASSIFICATION


def classify_expense(ocr_text: str) -> AIClassificationResult:
    """
    Classify an expense from OCR text using LangChain + Gemini.

    Flow:
    1. Build prompt with business context
    2. Send to Gemini via LangChain
    3. Parse JSON response into Pydantic model
    4. Return structured classification

    On failure: returns "unclassified" with 0.0 confidence.
    This ensures the pipeline NEVER stops due to AI issues.
    """

    # Guard: No API key → return fallback immediately
    if not settings.GOOGLE_API_KEY or settings.GOOGLE_API_KEY == "your_gemini_api_key_here":
        return AIClassificationResult(**FALLBACK_CLASSIFICATION)

    # Guard: Empty OCR text → nothing to classify
    if not ocr_text or ocr_text.strip() == "" or ocr_text.startswith("[OCR Error]"):
        return AIClassificationResult(
            category="unclassified",
            sub_category="unknown",
            confidence=0.0,
            reasoning=f"No valid OCR text to classify: {ocr_text[:100] if ocr_text else 'empty'}"
        )

    try:
        # Import LangChain components here to avoid import errors
        # when google-generativeai is not installed
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage

        # Initialize Gemini model via LangChain
        # temperature=0.1 for consistency — we want the same bill
        # to always get the same classification
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY", settings.GOOGLE_API_KEY),
            temperature=0.1,
            max_output_tokens=1500,  # Increased to prevent JSON truncation
        )

        # Build the prompt with business context
        formatted_prompt = CLASSIFICATION_PROMPT.format(
            business_type=settings.BUSINESS_TYPE,
            business_description=settings.BUSINESS_DESCRIPTION,
            ocr_text=ocr_text[:3000]  # Limit input to avoid token overflow
        )

        print("-" * 50)
        print(f"[CLASSIFIER INPUT to Gemini]:\n{formatted_prompt}")
        print("-" * 50)

        # Invoke the chain
        response = llm.invoke([HumanMessage(content=formatted_prompt)])

        # Parse the JSON response
        response_text = response.content.strip()

        print("-" * 50)
        print(f"[CLASSIFIER OUTPUT from Gemini]:\n{response_text}")
        print("-" * 50)

        # Handle markdown-wrapped JSON (some models wrap in ```json ... ```)
        import re
        response_text = re.sub(r"^```(?:json)?\s*", "", response_text, flags=re.IGNORECASE)
        response_text = re.sub(r"\s*```$", "", response_text)

        result = json.loads(response_text)

        # Validate and return
        return AIClassificationResult(
            category=result.get("category", "unclassified"),
            sub_category=result.get("sub_category", "general"),
            confidence=float(result.get("confidence", 0.5)),
            reasoning=result.get("reasoning", "No reasoning provided"),
            vendor_name=result.get("vendor_name"),
            vendor_gstin=result.get("vendor_gstin"),
            invoice_number=result.get("invoice_number"),
            invoice_date=result.get("invoice_date"),
            total_amount=float(result.get("total_amount", 0.0) or 0.0)
        )

    except json.JSONDecodeError as e:
        # AI returned non-JSON — fallback
        return AIClassificationResult(
            category="unclassified",
            sub_category="unknown",
            confidence=0.0,
            reasoning=f"AI returned invalid JSON: {str(e)}"
        )

    except Exception as e:
        # Any other error (network, auth, rate limit) — fallback
        return AIClassificationResult(
            category="unclassified",
            sub_category="unknown",
            confidence=0.0,
            reasoning=f"AI classification failed: {str(e)}"
        )
