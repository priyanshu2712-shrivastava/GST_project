"""
OCR Engine
==========
Extracts raw text from invoice images and PDFs.

DESIGN PRINCIPLE: This module does ONE thing — extract text.
It does NOT interpret, classify, or make any decisions.
All intelligence lives in the AI and Rule Engine layers.

APPROACH: Uses Tesseract OCR (local, offline, no API quota issues) as
the PRIMARY method. Falls back to Gemini Vision API only if Tesseract
fails. This saves API quota for the AI classification step.

For PDFs: Uses PyMuPDF (fitz) to extract embedded text, or converts
pages to images and runs Tesseract on each page.
"""

import os
from pathlib import Path
from typing import Optional

from app.config import settings


# ─── Tesseract Configuration ───────────────────────────────────────────────
# Point pytesseract to the installed Tesseract binary
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def _extract_text_with_tesseract(image_path: str) -> Optional[str]:
    """
    PRIMARY OCR method: Use Tesseract to extract text from an image.
    Offline, free, no API quota — works on any invoice.
    """
    try:
        import pytesseract
        from PIL import Image, ImageFilter, ImageEnhance

        # Set Tesseract binary path
        if os.path.exists(TESSERACT_PATH):
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

        image = Image.open(image_path)
        print(f"[OCR] Using Tesseract for: {image_path}")
        print(f"[OCR] Image size: {image.size}, mode: {image.mode}")

        # Preprocess for better OCR accuracy:
        # 1. Convert to grayscale
        gray = image.convert("L")
        # 2. Increase contrast (makes text stand out)
        enhanced = ImageEnhance.Contrast(gray).enhance(2.0)
        # 3. Sharpen edges
        sharpened = enhanced.filter(ImageFilter.SHARPEN)

        # OCR with optimized config:
        # --oem 3 = LSTM neural net engine (best accuracy)
        # --psm 6 = Assume uniform block of text (good for invoices)
        custom_config = r"--oem 3 --psm 6"
        text = pytesseract.image_to_string(sharpened, config=custom_config)

        if text and text.strip():
            print(f"[OCR] Tesseract extracted {len(text.strip())} characters")
            return text.strip()

        print("[OCR] Tesseract returned empty text")
        return None

    except Exception as e:
        print(f"[OCR] Tesseract failed: {type(e).__name__}: {e}")
        return None


def _extract_text_with_gemini_vision(image_path: str) -> Optional[str]:
    """
    FALLBACK OCR method: Use Gemini Vision API if Tesseract fails.
    Only used as a backup — saves API quota for classification.
    """
    if not settings.GOOGLE_API_KEY or settings.GOOGLE_API_KEY == "your_gemini_api_key_here":
        print("[OCR] No GOOGLE_API_KEY set, skipping Gemini Vision fallback")
        return None

    try:
        import time
        import google.generativeai as genai
        from PIL import Image

        print(f"[OCR] Falling back to Gemini Vision for: {image_path}")
        genai.configure(api_key=settings.GOOGLE_API_KEY)

        img = Image.open(image_path)
        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = (
            "Extract ALL text from this invoice/bill image exactly as it appears. "
            "Include every detail: vendor name, GSTIN, invoice number, date, "
            "line items, quantities, amounts, tax details (CGST, SGST, IGST), "
            "and total amount. Preserve the layout structure as much as possible. "
            "Return ONLY the extracted text, nothing else."
        )

        # Retry up to 3 times for rate limit errors (free tier)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(
                    [prompt, img],
                    request_options={"timeout": 60},
                )
                text = response.text.strip()
                print(f"[OCR] Gemini Vision extracted {len(text)} characters")

                if text and len(text) > 10:
                    return text
                return None

            except Exception as retry_err:
                err_str = str(retry_err).lower()
                if ("429" in err_str or "resource" in err_str or "quota" in err_str) and attempt < max_retries - 1:
                    wait_time = 30 * (attempt + 1)
                    print(f"[OCR] Rate limited (attempt {attempt+1}/{max_retries}), waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise

        return None

    except Exception as e:
        print(f"[OCR] Gemini Vision fallback failed: {type(e).__name__}: {e}")
        return None


def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from an image file.
    Strategy: Tesseract FIRST (offline, free), Gemini Vision as fallback.
    """
    if not os.path.exists(image_path):
        return f"[OCR Error] File not found: {image_path}"

    # PRIMARY: Tesseract (offline, no API quota used)
    text = _extract_text_with_tesseract(image_path)
    if text:
        return text

    # FALLBACK: Gemini Vision (only if Tesseract fails)
    text = _extract_text_with_gemini_vision(image_path)
    if text:
        return text

    return "[OCR Error] Could not extract text. Ensure Tesseract is installed or GOOGLE_API_KEY is set."


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF.
    Strategy: PyMuPDF for embedded text → Tesseract for scanned pages.
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
            if len(combined) > 20:
                return combined
    except ImportError:
        pass
    except Exception as e:
        print(f"[OCR] PyMuPDF failed: {e}")

    # For scanned PDFs: convert pages to images and use Tesseract
    try:
        import tempfile
        from pdf2image import convert_from_path

        pages = convert_from_path(pdf_path, dpi=200, first_page=1, last_page=5)
        all_text = []

        for i, page_img in enumerate(pages, 1):
            tmp_path = os.path.join(tempfile.gettempdir(), f"gst_pdf_page_{i}.jpg")
            page_img.save(tmp_path, "JPEG", quality=85)

            # Use Tesseract for each page (no API calls!)
            text = _extract_text_with_tesseract(tmp_path)
            if text:
                all_text.append(f"--- Page {i} ---\n{text}")

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

    return "[OCR Error] Could not extract text from PDF."


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
