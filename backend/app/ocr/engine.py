"""
OCR Engine
==========
Extracts raw text from invoice images and PDFs.

DESIGN PRINCIPLE: This module does ONE thing — extract text.
It does NOT interpret, classify, or make any decisions.
All intelligence lives in the AI and Rule Engine layers.

APPROACH: Uses Google Gemini Vision API to extract text from images.
This avoids needing the Tesseract binary installed on the system.
Falls back to pytesseract if Gemini fails or API key is not set.

For PDFs: Uses PyMuPDF (fitz) to extract embedded text or convert pages to images.
"""

import os
import base64
import json
from pathlib import Path
from typing import Optional

from app.config import settings


def _extract_text_with_gemini_vision(image_path: str) -> Optional[str]:
    """
    Use Gemini Vision API to extract text from an image.
    This is the PRIMARY OCR method — no external binary needed.
    """
    if not settings.GOOGLE_API_KEY or settings.GOOGLE_API_KEY == "your_gemini_api_key_here":
        return None

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage

        # Read and encode image as base64
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

        # Detect MIME type
        ext = Path(image_path).suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".bmp": "image/bmp",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.0,
        )

        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": (
                        "Extract ALL text from this invoice/bill image exactly as it appears. "
                        "Include every detail: vendor name, GSTIN, invoice number, date, "
                        "line items, quantities, amounts, tax details (CGST, SGST, IGST), "
                        "and total amount. Preserve the layout structure as much as possible. "
                        "Return ONLY the extracted text, nothing else."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{image_data}"
                    },
                },
            ]
        )

        response = llm.invoke([message])
        text = response.content.strip()

        if text and len(text) > 10:
            return text

        return None

    except Exception as e:
        print(f"[OCR] Gemini Vision failed: {e}")
        return None


def _extract_text_with_tesseract(image_path: str) -> Optional[str]:
    """
    Fallback: Use Tesseract for OCR if Gemini Vision is unavailable.
    Requires tesseract binary to be installed on the system.
    """
    try:
        import pytesseract
        from PIL import Image, ImageFilter, ImageEnhance

        image = Image.open(image_path)

        # Preprocess: grayscale → contrast → sharpen
        gray = image.convert("L")
        enhanced = ImageEnhance.Contrast(gray).enhance(2.0)
        sharpened = enhanced.filter(ImageFilter.SHARPEN)

        custom_config = r"--oem 3 --psm 6"
        text = pytesseract.image_to_string(sharpened, config=custom_config)
        return text.strip() if text.strip() else None

    except Exception as e:
        print(f"[OCR] Tesseract fallback failed: {e}")
        return None


def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from an image file.
    Strategy: Try Gemini Vision first (no binary needed), fall back to Tesseract.
    """
    if not os.path.exists(image_path):
        return f"[OCR Error] File not found: {image_path}"

    # Try Gemini Vision first (works without any binary install)
    text = _extract_text_with_gemini_vision(image_path)
    if text:
        return text

    # Fallback to Tesseract
    text = _extract_text_with_tesseract(image_path)
    if text:
        return text

    return "[OCR Error] Could not extract text. Ensure GOOGLE_API_KEY is set or install Tesseract binary."


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF.
    Strategy: Try PyMuPDF for text extraction first, then Gemini Vision for scanned PDFs.
    """
    if not os.path.exists(pdf_path):
        return f"[OCR Error] File not found: {pdf_path}"

    # Try extracting embedded text with PyMuPDF
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(pdf_path)
        all_text = []
        for i, page in enumerate(doc, 1):
            text = page.get_text().strip()
            if text:
                all_text.append(f"--- Page {i} ---\n{text}")
        doc.close()

        if all_text:
            combined = "\n\n".join(all_text)
            if len(combined) > 20:  # Got meaningful text
                return combined
    except ImportError:
        pass  # PyMuPDF not installed
    except Exception as e:
        print(f"[OCR] PyMuPDF failed: {e}")

    # For scanned PDFs: convert pages to images and use Gemini Vision
    try:
        from pdf2image import convert_from_path
        pages = convert_from_path(pdf_path, dpi=200, first_page=1, last_page=5)  # Limit pages
        all_text = []
        import tempfile

        for i, page_img in enumerate(pages, 1):
            # Save page as temporary image
            tmp_path = os.path.join(tempfile.gettempdir(), f"gst_pdf_page_{i}.jpg")
            page_img.save(tmp_path, "JPEG", quality=85)

            text = _extract_text_with_gemini_vision(tmp_path)
            if text:
                all_text.append(f"--- Page {i} ---\n{text}")

            # Clean up
            try:
                os.remove(tmp_path)
            except:
                pass

        if all_text:
            return "\n\n".join(all_text)
    except ImportError:
        pass
    except Exception as e:
        print(f"[OCR] PDF image conversion failed: {e}")

    return "[OCR Error] Could not extract text from PDF. Ensure GOOGLE_API_KEY is set."


def extract_text(file_path: str) -> str:
    """
    Main entry point: auto-detects file type and extracts text.

    Supports:
    - Images: .jpg, .jpeg, .png, .bmp, .tiff, .webp
    - PDFs: .pdf
    """
    path = Path(file_path)
    extension = path.suffix.lower()

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

    if extension in image_extensions:
        return extract_text_from_image(file_path)
    elif extension == ".pdf":
        return extract_text_from_pdf(file_path)
    else:
        return f"[OCR Error] Unsupported file type: {extension}"
