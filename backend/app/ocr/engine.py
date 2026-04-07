"""
OCR Engine
==========
Extracts raw text from invoice images and PDFs.

PIPELINE (images):
  1. Google Cloud Vision API  — PRIMARY (best accuracy, handles real-world photos)
  2. Tesseract + OpenCV       — FALLBACK 1 (offline, no quota)
  3. Groq Vision              — FALLBACK 2 (llama-4-scout, handles blurry/angled shots)

After OCR text is extracted it is passed to the Groq AI classifier
(see app/ai/classifier.py) which does all the intelligence work.

DESIGN: This module does ONE thing — extract raw text.
No interpretation, no classification — that lives in the AI layer.
"""

import os
import base64
import requests
from pathlib import Path
from typing import Optional

from app.config import settings


# ─── Tesseract path (used as fallback) ─────────────────────────────────────
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# ══════════════════════════════════════════════════════════════════════════════
#  PRIMARY — Google Cloud Vision API (REST, API-key auth)
# ══════════════════════════════════════════════════════════════════════════════

def _extract_text_with_cloud_vision(image_path: str) -> Optional[str]:
    """
    PRIMARY OCR: Call Google Cloud Vision TEXT_DETECTION via REST API.

    Requires GOOGLE_CLOUD_VISION_API_KEY in .env.
    No JSON credential file needed — just an API key.

    Why Cloud Vision?
    - Handles real-world photos: angled, blurry, low-light, hazy
    - Understands Hindi/regional text mixed with English
    - Returns per-word confidence + bounding boxes (we use full text here)
    - Far superior to Tesseract on smartphone-captured invoices
    """
    api_key = settings.GOOGLE_CLOUD_VISION_API_KEY
    if not api_key or api_key == "your_google_cloud_vision_api_key_here":
        print("[OCR] GOOGLE_CLOUD_VISION_API_KEY not set — skipping Cloud Vision")
        return None

    try:
        print(f"[OCR] Cloud Vision: reading {image_path}")

        # Read image and base64-encode it
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        # Detect MIME type from extension
        ext = Path(image_path).suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".bmp": "image/bmp",
            ".tiff": "image/tiff", ".tif": "image/tiff",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

        # Build Vision API request
        url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
        payload = {
            "requests": [
                {
                    "image": {"content": b64_image},
                    "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                    "imageContext": {"languageHints": ["en", "hi"]}
                }
            ]
        }

        resp = requests.post(url, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        # Extract full text annotation (includes newlines, layout preserved)
        responses = data.get("responses", [])
        if not responses:
            print("[OCR] Cloud Vision returned empty responses")
            return None

        full_text_annotation = responses[0].get("fullTextAnnotation", {})
        text = full_text_annotation.get("text", "").strip()

        if text and len(text) > 10:
            print(f"[OCR] Cloud Vision extracted {len(text)} characters ✓")
            return text

        # If DOCUMENT_TEXT_DETECTION gave nothing, try plain TEXT_DETECTION
        text_annotations = responses[0].get("textAnnotations", [])
        if text_annotations:
            text = text_annotations[0].get("description", "").strip()
            if text and len(text) > 10:
                print(f"[OCR] Cloud Vision (text annotation) extracted {len(text)} chars ✓")
                return text

        print("[OCR] Cloud Vision returned no text")
        return None

    except requests.HTTPError as e:
        print(f"[OCR] Cloud Vision HTTP error: {e.response.status_code} — {e.response.text[:300]}")
        return None
    except Exception as e:
        print(f"[OCR] Cloud Vision failed: {type(e).__name__}: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  FALLBACK 1 — Tesseract with full OpenCV enhancement pipeline
# ══════════════════════════════════════════════════════════════════════════════

def _deskew(gray: "import numpy; numpy.ndarray") -> "import numpy; numpy.ndarray":
    """
    Auto-correct skew using Hough line transform.
    Skips rotation if angle < 0.5° or detection fails — never crashes.
    """
    try:
        import cv2
        import numpy as np

        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
        if lines is None:
            return gray

        angles = []
        for rho, theta in lines[:, 0]:
            angle_deg = np.degrees(theta) - 90
            if abs(angle_deg) < 15:
                angles.append(angle_deg)

        if not angles:
            return gray

        median_angle = float(np.median(angles))
        if abs(median_angle) < 0.5:
            return gray

        print(f"[OCR] Deskewing by {median_angle:.2f}°")
        h, w = gray.shape
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        return cv2.warpAffine(gray, M, (w, h),
                              flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)
    except Exception:
        return gray


def _extract_text_with_tesseract(image_path: str) -> Optional[str]:
    """
    FALLBACK 1: Tesseract with full 9-step OpenCV enhancement pipeline.

    Steps:
      1. Grayscale
      2. Auto-deskew (Hough lines)
      3. CLAHE contrast enhancement
      4. Non-local means denoising
      5. Unsharp masking (recover sharpness after denoising)
      6. Adaptive Gaussian thresholding
      7. Morphological closing (repair broken character strokes)
      8. 2× upscale (bicubic)
      9. Tesseract LSTM, PSM 4
    """
    try:
        import cv2
        import numpy as np
        import pytesseract

        if os.path.exists(TESSERACT_PATH):
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

        img = cv2.imread(image_path)
        if img is None:
            print(f"[OCR] OpenCV could not read: {image_path}")
            return None

        print(f"[OCR] Tesseract pipeline starting — shape: {img.shape}")

        # 1. Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # 2. Deskew
        gray = _deskew(gray)
        # 3. CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        # 4. Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        # 5. Unsharp masking
        blurred = cv2.GaussianBlur(denoised, (0, 0), sigmaX=2)
        sharpened = cv2.addWeighted(denoised, 1.5, blurred, -0.5, 0)
        # 6. Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            sharpened, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 31, 10
        )
        # 7. Morphological closing
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        # 8. 2× upscale
        resized = cv2.resize(thresh, None, fx=2, fy=2,
                             interpolation=cv2.INTER_CUBIC)
        # 9. OCR
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


# ══════════════════════════════════════════════════════════════════════════════
#  FALLBACK 2 — Groq Vision (llama-4-scout)
# ══════════════════════════════════════════════════════════════════════════════

def _extract_text_with_gemini_vision(image_path: str) -> Optional[str]:
    """
    FALLBACK 2: Gemini Vision (gemini-1.5-flash).
    Uses the same GOOGLE_GENERATIVE_API_KEY as the classifier.
    Handles angled/blurry real-world photos that defeat Tesseract.
    """
    api_key = settings.GOOGLE_GENERATIVE_API_KEY
    if not api_key or api_key == "your_generative_language_api_key_here":
        print("[OCR] GOOGLE_GENERATIVE_API_KEY not set — skipping Gemini Vision fallback")
        return None

    try:
        import google.generativeai as genai
        from PIL import Image

        print(f"[OCR] Gemini Vision fallback for: {image_path}")
        genai.configure(api_key=api_key)

        img = Image.open(image_path)
        model = genai.GenerativeModel("gemini-2.0-flash-lite")

        prompt = (
            "Extract ALL text from this invoice/bill image exactly as it appears. "
            "Include every detail: vendor name, GSTIN, invoice number, date, "
            "line items with quantities and amounts, HSN codes, tax details "
            "(CGST, SGST, IGST), subtotal, and total amount. "
            "Preserve the tabular structure as much as possible. "
            "Return ONLY the extracted text, nothing else."
        )

        response = model.generate_content(
            [prompt, img],
            request_options={"timeout": 60}
        )
        text = response.text.strip()
        if text and len(text) > 20:
            print(f"[OCR] Gemini Vision extracted {len(text)} characters")
            return text
        return None

    except Exception as e:
        print(f"[OCR] Gemini Vision fallback failed: {type(e).__name__}: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  PUBLIC IMAGE ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from a bill/invoice image.

    Strategy (in order):
      1. Google Cloud Vision API  — primary, best accuracy
      2. Tesseract + OpenCV       — offline fallback
      3. Groq Vision              — last-resort vision model
    """
    if not os.path.exists(image_path):
        return f"[OCR Error] File not found: {image_path}"

    # 1. Cloud Vision (primary)
    text = _extract_text_with_cloud_vision(image_path)
    if text:
        return text

    # 2. Tesseract (fallback)
    text = _extract_text_with_tesseract(image_path)
    if text:
        return text

    # 3. Gemini Vision (last resort)
    text = _extract_text_with_gemini_vision(image_path)
    if text:
        return text

    return (
        "[OCR Error] All OCR methods failed. "
        "Check GOOGLE_CLOUD_VISION_API_KEY in .env or ensure Tesseract is installed."
    )


# ══════════════════════════════════════════════════════════════════════════════
#  PDF SUPPORT
# ══════════════════════════════════════════════════════════════════════════════

def _extract_pdf_pages_as_images(pdf_path: str) -> list:
    """
    Convert PDF pages to PIL Images using PyMuPDF (no Poppler needed).
    Returns list of (page_num, PIL.Image) tuples.
    """
    try:
        import fitz  # PyMuPDF
        from PIL import Image
        import io

        doc = fitz.open(pdf_path)
        pages = []
        for i, page in enumerate(doc, 1):
            if i > 5:  # cap at 5 pages
                break
            mat = fitz.Matrix(2.0, 2.0)  # 2× zoom → ~144 DPI
            pix = page.get_pixmap(matrix=mat)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            pages.append((i, img))
        doc.close()
        return pages
    except Exception as e:
        print(f"[OCR] PDF→image conversion failed: {e}")
        return []


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF.

    Strategy:
      1. PyMuPDF embedded text (fast, no API)
      2. Render pages → Cloud Vision API per page
      3. Render pages → Tesseract per page
      4. Render pages → Groq Vision per page
    """
    if not os.path.exists(pdf_path):
        return f"[OCR Error] File not found: {pdf_path}"

    # 1. Try embedded text first (digital PDFs)
    try:
        import fitz
        doc = fitz.open(pdf_path)
        all_text = []
        for i, page in enumerate(doc, 1):
            t = page.get_text().strip()
            if t:
                all_text.append(f"--- Page {i} ---\n{t}")
        doc.close()
        if all_text:
            combined = "\n\n".join(all_text)
            if len(combined) > 20:
                print(f"[OCR] PyMuPDF extracted {len(combined)} chars of embedded text")
                return combined
    except Exception as e:
        print(f"[OCR] PyMuPDF embedded text failed: {e}")

    # 2-4. Render pages to images and run OCR on each
    pages = _extract_pdf_pages_as_images(pdf_path)
    if not pages:
        return "[OCR Error] Could not render PDF pages."

    import tempfile
    all_text = []

    for page_num, pil_img in pages:
        # Save page as temp JPEG for OCR functions
        tmp_path = os.path.join(tempfile.gettempdir(), f"gst_pdf_p{page_num}.jpg")
        pil_img.save(tmp_path, "JPEG", quality=90)

        page_text = None

        # Try Cloud Vision first
        page_text = _extract_text_with_cloud_vision(tmp_path)

        # Fallback to Tesseract
        if not page_text:
            page_text = _extract_text_with_tesseract(tmp_path)

        # Fallback to Gemini Vision
        if not page_text:
            page_text = _extract_text_with_gemini_vision(tmp_path)

        if page_text:
            all_text.append(f"--- Page {page_num} ---\n{page_text}")

        # Clean up temp file
        try:
            os.remove(tmp_path)
        except Exception:
            pass

    if all_text:
        return "\n\n".join(all_text)

    return "[OCR Error] Could not extract text from PDF."


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def extract_text(file_path: str) -> str:
    """
    Auto-detect file type and extract text.
    Supports: .jpg .jpeg .png .bmp .tiff .tif .webp .pdf
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

    if ext in image_extensions:
        return extract_text_from_image(file_path)
    elif ext == ".pdf":
        return extract_text_from_pdf(file_path)
    else:
        return f"[OCR Error] Unsupported file type: {ext}"
