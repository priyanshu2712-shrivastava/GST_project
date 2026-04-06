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
    PRIMARY OCR method: Use Tesseract with OpenCV preprocessing pipeline.
    Steps: grayscale → denoise → adaptive threshold → 2x upscale → PSM 4.
    Handles hazy, angled, unevenly-lit real-world invoice photos.
    """
    try:
        import cv2
        import numpy as np
        import pytesseract

        # Set Tesseract binary path
        if os.path.exists(TESSERACT_PATH):
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

        img = cv2.imread(image_path)
        if img is None:
            print(f"[OCR] OpenCV could not read image: {image_path}")
            return None

        print(f"[OCR] Using Tesseract (OpenCV pipeline) for: {image_path}")
        print(f"[OCR] Image shape: {img.shape}")

        # Step 1: Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Step 2: Denoise — reduces blur/haze noise from real-world photos
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Step 3: Adaptive thresholding — handles uneven/hazy lighting perfectly
        # ADAPTIVE_THRESH_GAUSSIAN_C adapts threshold per local region
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 31, 10
        )

        # Step 4: 2x upscale — Tesseract accuracy improves sharply at 300+ DPI
        scale = 2
        resized = cv2.resize(thresh, None, fx=scale, fy=scale,
                             interpolation=cv2.INTER_CUBIC)

        # Step 5: OCR
        # --oem 3 = LSTM neural net engine (best accuracy)
        # --psm 4 = Single column of text (better for multi-column invoice layouts)
        config = "--oem 3 --psm 4 -l eng"
        text = pytesseract.image_to_string(resized, config=config)

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
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        print("[OCR] No GEMINI_API_KEY set, skipping Gemini Vision fallback")
        return None

    try:
        import time
        import google.generativeai as genai
        from PIL import Image

        print(f"[OCR] Falling back to Gemini Vision for: {image_path}")
        genai.configure(api_key=settings.GEMINI_API_KEY)

        img = Image.open(image_path)
        model = genai.GenerativeModel("gemini-1.5-flash")

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


def _extract_text_with_groq_vision(image_path: str) -> Optional[str]:
    """
    GROQ VISION fallback for images: Use Groq's llama-4-scout vision model.
    Handles real-world photos (angled, low-light, blurry) that Tesseract struggles with.
    Uses the same GROQ_API_KEY already required for AI classification.
    """
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        print("[OCR] No GROQ_API_KEY set, skipping Groq Vision fallback for image")
        return None

    try:
        import base64
        from groq import Groq
        from PIL import Image
        import io

        print(f"[OCR] Trying Groq Vision for image: {image_path}")

        # Load and resize if too large (Groq has payload limits)
        img = Image.open(image_path)
        w, h = img.size
        max_dim = 2048
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        # Encode to base64
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        b64_img = base64.b64encode(buf.getvalue()).decode("utf-8")

        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_img}",
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "Extract ALL text from this invoice/bill image exactly as it appears. "
                                "Include every detail: vendor name, GSTIN, invoice number, date, "
                                "line items with quantities and amounts, HSN codes, tax details "
                                "(CGST, SGST, IGST), subtotal, and total amount. "
                                "Preserve the tabular structure as much as possible. "
                                "Return ONLY the extracted text, nothing else."
                            )
                        }
                    ],
                }
            ],
            max_tokens=4000,
        )
        text = response.choices[0].message.content.strip()
        if text and len(text) > 20:
            print(f"[OCR] Groq Vision extracted {len(text)} characters from image")
            return text
        return None

    except Exception as e:
        print(f"[OCR] Groq Vision image fallback failed: {type(e).__name__}: {e}")
        return None


def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from an image file.
    Strategy:
      1. Tesseract (offline, no API quota) — fast
      2. Gemini Vision (if GOOGLE_API_KEY set)
      3. Groq Vision (llama-4-scout) — best for real-world photos
    """
    if not os.path.exists(image_path):
        return f"[OCR Error] File not found: {image_path}"

    # PRIMARY: Tesseract (offline, no API quota used)
    text = _extract_text_with_tesseract(image_path)
    if text:
        return text

    # FALLBACK 1: Gemini Vision (only if GOOGLE_API_KEY is set)
    text = _extract_text_with_gemini_vision(image_path)
    if text:
        return text

    # FALLBACK 2: Groq Vision — handles angled/blurry real-world photos
    text = _extract_text_with_groq_vision(image_path)
    if text:
        return text

    return "[OCR Error] Could not extract text. Ensure Tesseract is installed or set GROQ_API_KEY/GOOGLE_API_KEY."


def _extract_pdf_with_groq_vision(pdf_path: str) -> Optional[str]:
    """
    LAST-RESORT PDF fallback: Use PyMuPDF to render pages as PNG images,
    then send those images to Groq's vision model for text extraction.

    This works without Poppler/pdf2image installed.
    Requires: GROQ_API_KEY in config, fitz (PyMuPDF already a dependency).
    """
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        print("[OCR] No GROQ_API_KEY, skipping Groq vision PDF fallback")
        return None

    try:
        import fitz  # PyMuPDF
        import base64
        from groq import Groq
        import os as _os

        print(f"[OCR] Trying Groq vision for PDF: {pdf_path}")
        doc = fitz.open(pdf_path)
        client = Groq(api_key=_os.getenv("GROQ_API_KEY", settings.GROQ_API_KEY))

        all_text = []
        for i, page in enumerate(doc, 1):
            if i > 5:  # Limit to first 5 pages
                break
            # Render page to PNG at 150 DPI for good quality/speed balance
            mat = fitz.Matrix(150 / 72, 150 / 72)
            pix = page.get_pixmap(matrix=mat)
            png_bytes = pix.tobytes("png")
            b64_img = base64.b64encode(png_bytes).decode("utf-8")

            response = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{b64_img}",
                                },
                            },
                            {
                                "type": "text",
                                "text": (
                                    "Extract ALL text from this invoice/bill image exactly as it appears. "
                                    "Include vendor name, GSTIN, invoice number, date, line items, "
                                    "quantities, amounts, tax details (CGST, SGST, IGST), and totals. "
                                    "Return ONLY the extracted text, nothing else."
                                )
                            }
                        ],
                    }
                ],
                max_tokens=4000,
            )
            page_text = response.choices[0].message.content.strip()
            if page_text:
                all_text.append(f"--- Page {i} ---\n{page_text}")
            print(f"[OCR] Groq vision extracted {len(page_text)} chars from page {i}")

        doc.close()

        if all_text:
            return "\n\n".join(all_text)
        return None

    except Exception as e:
        print(f"[OCR] Groq vision PDF fallback failed: {type(e).__name__}: {e}")
        return None


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF.
    Strategy:
      1. PyMuPDF for embedded text (fast, no API quota)
      2. pdf2image + Tesseract for scanned pages (offline, no quota)
      3. Groq vision API on rendered page images (works without Poppler)
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
                print(f"[OCR] PyMuPDF extracted {len(combined)} chars of embedded text")
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
        print("[OCR] pdf2image not installed (Poppler missing?) — trying Groq vision fallback")
    except Exception as e:
        print(f"[OCR] PDF image conversion failed: {e} — trying Groq vision fallback")

    # Last resort: Groq vision on rendered page images (no Poppler needed)
    text = _extract_pdf_with_groq_vision(pdf_path)
    if text:
        return text

    return "[OCR Error] Could not extract text from PDF. Install Poppler for pdf2image, or set GROQ_API_KEY for vision fallback."



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
