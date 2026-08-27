from pathlib import Path
import pymupdf
from PIL import Image
import io
import cv2
import numpy as np
import json


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

INPUT_DIR = PROJECT_ROOT / "public" / "iau-constellations"
OUTPUT_DIR = INPUT_DIR / "processed"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

QA_LOG_PATH = OUTPUT_DIR / "qa_report.json"


# ============================================================
# GREEN DETECTION SETTINGS (HSV-based, not fixed RGB)
# ============================================================

# OpenCV HSV: H is 0-179. Green line art typically sits ~35-90.
# Widen/narrow this range based on your QA report findings.
HUE_LOW = 30
HUE_HIGH = 95
MIN_SATURATION = 40   # ignore near-gray/near-white pixels
MIN_VALUE = 30        # ignore near-black pixels

EXPANSION = 2          # dilate mask to catch anti-aliased fringe
CLOSE_KERNEL = 3        # morphological close to fill gaps in thin lines
INPAINT_RADIUS = 3
DPI = 300
JPEG_QUALITY = 95

# After cleaning, a file is flagged if more than this many
# green-ish pixels remain (small number tolerates noise)
QA_GREEN_PIXEL_THRESHOLD = 25


# ============================================================
# TEXT REMOVAL
# ============================================================

def remove_all_text(page):
    """
    Remove every real text object AND any text-bearing annotations.
    Vector-outlined "text" (converted to paths) will NOT be caught
    here — that's flagged separately in QA as a different problem.
    """
    words = page.get_text("words")
    count = 0

    for x0, y0, x1, y1, text, *_ in words:
        # small padding to fully cover slanted/italic glyph edges
        pad = 0.75
        rect = pymupdf.Rect(x0 - pad, y0 - pad, x1 + pad, y1 + pad)
        page.add_redact_annot(rect, fill=None, cross_out=False)
        count += 1

    # Also redact any text-carrying annotations (rare, but possible).
    # Compare the human-readable type name (annot.type[1]) rather than
    # a numeric constant name, since those constant names differ across
    # PyMuPDF versions and aren't reliably importable.
    for annot in page.annots() or []:
        type_name = (annot.type[1] or "").lower()
        if type_name in ("freetext", "text"):
            page.add_redact_annot(annot.rect, fill=None)
            count += 1

    page.apply_redactions(
        images=pymupdf.PDF_REDACT_IMAGE_NONE,
        graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
        text=pymupdf.PDF_REDACT_TEXT_REMOVE,
    )

    return count


def count_remaining_text(page):
    """QA check: how many word-objects are still detectable."""
    return len(page.get_text("words"))


# ============================================================
# GREEN DETECTION (HSV-based, adaptive)
# ============================================================

def detect_green_mask(rgb_image):
    hsv = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2HSV)
    h, s, v = cv2.split(hsv)

    mask = (
        (h >= HUE_LOW) & (h <= HUE_HIGH) &
        (s >= MIN_SATURATION) & (v >= MIN_VALUE)
    ).astype(np.uint8) * 255

    # Close small gaps along thin anti-aliased lines, then expand
    if CLOSE_KERNEL > 0:
        k = np.ones((CLOSE_KERNEL, CLOSE_KERNEL), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)

    if EXPANSION > 0:
        ksize = EXPANSION * 2 + 1
        k = np.ones((ksize, ksize), np.uint8)
        mask = cv2.dilate(mask, k, iterations=1)

    return mask


# ============================================================
# RENDER + REMOVE GREEN
# ============================================================

def process_page(page):
    matrix = pymupdf.Matrix(DPI / 72, DPI / 72)
    pix = page.get_pixmap(matrix=matrix, alpha=False)

    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n
    )
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    rgb_image = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    mask = detect_green_mask(rgb_image)

    cleaned = cv2.inpaint(img, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)
    cleaned = cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB)

    # QA: check the CLEANED image for leftover green, not the mask
    # (mask pixel count isn't the same as "did it actually clean up")
    post_mask = detect_green_mask(cleaned)
    remaining_green = int(np.count_nonzero(post_mask))

    return Image.fromarray(cleaned), int(np.count_nonzero(mask)), remaining_green


# ============================================================
# PROCESS ONE PDF
# ============================================================

def process_pdf(input_path):
    name = input_path.stem
    output_pdf = OUTPUT_DIR / f"{name}_processed.pdf"
    output_jpg = OUTPUT_DIR / f"{name}_processed.jpg"

    print()
    print("=" * 70)
    print(f"PROCESSING: {input_path.name}")
    print("=" * 70)

    doc = pymupdf.open(input_path)

    total_text_removed = 0
    for page_number, page in enumerate(doc, start=1):
        removed = remove_all_text(page)
        total_text_removed += removed
        print(f"Page {page_number}: removed {removed} text objects")

    new_doc = pymupdf.open()
    total_green = 0
    total_remaining_green = 0
    total_remaining_text = 0
    first_page = True

    for page_number, page in enumerate(doc, start=1):
        remaining_text = count_remaining_text(page)
        total_remaining_text += remaining_text

        cleaned_image, green_pixels, remaining_green = process_page(page)
        total_green += green_pixels
        total_remaining_green += remaining_green

        if first_page:
            cleaned_image.save(output_jpg, format="JPEG",
                                quality=JPEG_QUALITY, optimize=True)
            first_page = False

        png_buffer = io.BytesIO()
        cleaned_image.save(png_buffer, format="PNG")

        new_page = new_doc.new_page(width=page.rect.width, height=page.rect.height)
        new_page.insert_image(new_page.rect, stream=png_buffer.getvalue())

        print(f"  Green mask pixels : {green_pixels:,}")
        print(f"  Remaining green    : {remaining_green:,}")
        print(f"  Remaining text objs: {remaining_text}")

    new_doc.save(output_pdf, garbage=4, deflate=True)
    new_doc.close()
    doc.close()

    print()
    print(f"Text objects removed : {total_text_removed:,}")
    print(f"Green pixels removed : {total_green:,}")
    print(f"PDF : {output_pdf}")
    print(f"JPG : {output_jpg}")

    return {
        "file": input_path.name,
        "text_removed": total_text_removed,
        "text_remaining": total_remaining_text,
        "green_removed": total_green,
        "green_remaining": total_remaining_green,
        "needs_review": (
            total_remaining_text > 0
            or total_remaining_green > QA_GREEN_PIXEL_THRESHOLD
        ),
    }


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 70)
    print("IAU CONSTELLATION BATCH PROCESSOR (v2 - adaptive HSV + QA)")
    print("=" * 70)
    print()
    print(f"Input directory : {INPUT_DIR}")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    pdf_files = sorted(INPUT_DIR.glob("*.pdf"))

    if not pdf_files:
        print("ERROR: No PDF files found.")
        print(f"Expected PDFs in:\n{INPUT_DIR}")
        return

    print(f"Found {len(pdf_files)} PDF files.")

    qa_results = []

    for pdf in pdf_files:
        try:
            result = process_pdf(pdf)
            qa_results.append(result)
        except Exception as e:
            print()
            print(f"ERROR processing {pdf.name}:")
            print(e)
            qa_results.append({"file": pdf.name, "error": str(e), "needs_review": True})

    with open(QA_LOG_PATH, "w") as f:
        json.dump(qa_results, f, indent=2)

    flagged = [r for r in qa_results if r.get("needs_review")]

    print()
    print("=" * 70)
    print("ALL PROCESSING COMPLETE")
    print("=" * 70)
    print(f"Processed files are in:\n{OUTPUT_DIR}")
    print()
    print(f"QA report saved to: {QA_LOG_PATH}")
    print(f"{len(flagged)} of {len(pdf_files)} files flagged for manual review:")
    for r in flagged:
        print(f"  - {r['file']}")


if __name__ == "__main__":
    main()