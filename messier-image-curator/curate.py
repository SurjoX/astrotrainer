#!/usr/bin/env python3

import json
import math
import re
import time
from pathlib import Path
from urllib.parse import quote

import requests
from PIL import Image, ImageDraw, ImageFont


API = "https://commons.wikimedia.org/w/api.php"

ROOT = Path(__file__).resolve().parent
CANDIDATE_DIR = ROOT / "candidates"
METADATA_DIR = ROOT / "metadata"
REVIEW_DIR = ROOT / "review"

MAX_CANDIDATES = 8

# Minimum dimensions for an image to be considered useful.
MIN_WIDTH = 600
MIN_HEIGHT = 400

# Don't hammer Wikimedia.
REQUEST_DELAY = 0.15

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "AstroTrainer-MessierImageCurator/1.0 "
        "(educational astronomy project; contact via GitHub)"
    )
})


# ---------------------------------------------------------------------------
# Basic API helpers
# ---------------------------------------------------------------------------

def api(params):
    params = {
        "format": "json",
        "formatversion": "2",
        **params,
    }

    response = SESSION.get(API, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def get_page_redirect(title):
    """
    Resolve a category redirect such as:

        Category:Messier 1

    to the actual category if Wikimedia has redirected it.
    """
    data = api({
        "action": "query",
        "titles": title,
        "redirects": 1,
    })

    pages = data["query"]["pages"]

    if not pages:
        return title

    page = pages[0]

    # If the API resolved a redirect, the returned title is the target.
    return page.get("title", title)


def get_category_files(category):
    """
    Return all File: pages directly contained in a Commons category.
    """
    files = []
    continuation = {}

    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category,
            "cmnamespace": 6,  # File namespace
            "cmlimit": "max",
            **continuation,
        }

        data = api(params)

        files.extend(
            item["title"]
            for item in data["query"]["categorymembers"]
        )

        if "continue" not in data:
            break

        continuation = data["continue"]
        time.sleep(REQUEST_DELAY)

    return files


def get_file_info(file_titles):
    """
    Retrieve metadata and original download URLs for a batch of files.
    """
    results = []

    # MediaWiki allows batches, but keep these reasonably small.
    for i in range(0, len(file_titles), 50):
        batch = file_titles[i:i + 50]

        data = api({
            "action": "query",
            "titles": "|".join(batch),
            "prop": "imageinfo|categories",
            "iiprop": (
                "url|size|mime|mediatype|extmetadata"
            ),
            "iiurlwidth": 2400,
            "cllimit": "max",
        })

        for page in data["query"]["pages"]:
            if "imageinfo" not in page:
                continue

            info = page["imageinfo"][0]
            metadata = info.get("extmetadata", {})

            categories = [
                c["title"]
                for c in page.get("categories", [])
            ]

            results.append({
                "title": page["title"],
                "url": info.get("url"),
                "thumburl": info.get("thumburl"),
                "width": info.get("width", 0),
                "height": info.get("height", 0),
                "size": info.get("size", 0),
                "mime": info.get("mime", ""),
                "mediatype": info.get("mediatype", ""),
                "categories": categories,

                "description": clean_metadata(
                    metadata.get("ImageDescription")
                ),
                "artist": clean_metadata(
                    metadata.get("Artist")
                ),
                "credit": clean_metadata(
                    metadata.get("Credit")
                ),
                "license": clean_metadata(
                    metadata.get("License")
                ),
                "license_url": clean_metadata(
                    metadata.get("LicenseUrl")
                ),
                "date": clean_metadata(
                    metadata.get("DateTimeOriginal")
                ),
            })

        time.sleep(REQUEST_DELAY)

    return results


def clean_metadata(value):
    if not value:
        return ""

    if isinstance(value, dict):
        value = value.get("value", "")

    # Remove basic HTML.
    value = re.sub(r"<[^>]+>", " ", str(value))
    value = re.sub(r"\s+", " ", value)

    return value.strip()


# ---------------------------------------------------------------------------
# Candidate filtering
# ---------------------------------------------------------------------------

HARD_REJECT_TERMS = [
    "finder chart",
    "finding chart",
    "star chart",
    "star map",
    "sky map",
    "sky chart",
    "constellation chart",
    "constellation map",
    "annotated",
    "annotation",
    "labelled",
    "labeled",
    "labeling",
    "marked",
    "diagram",
    "schematic",
    "illustration",
    "drawing",
    "sketch",
    "finder",
    "location map",
    "location chart",
    "position chart",
    "asterism",
    "lines",
    "zigzag",
    "overlay",
    "orbit diagram",
]

SOFT_REJECT_TERMS = [
    "chart",
    "map",
    "atlas",
    "poster",
    "montage",
    "collage",
    "comparison",
    "comparison image",
    "simulation",
    "artist impression",
]

GOOD_TERMS = [
    "astrophotography",
    "astrophotograph",
    "observatory",
    "telescope",
    "hubble",
    "jwst",
    "webb",
    "nasa",
    "esa",
    "eso",
    "spitzer",
    "chandra",
    "2mass",
    "sdss",
    "dss",
    "pan-starrs",
    "survey",
    "deep field",
    "deep image",
    "rgb",
    "luminance",
    "ha",
    "h-alpha",
    "oiii",
    "sii",
    "infrared",
    "x-ray",
    "ultraviolet",
    "radio",
    "composite",
    "color",
    "colour",
]

BAD_MIME = {
    "image/svg+xml",
    "image/x-djvu",
    "application/pdf",
}


def searchable_text(item):
    parts = [
        item["title"],
        item["description"],
        item["artist"],
        item["credit"],
        " ".join(item["categories"]),
    ]

    return " ".join(parts).lower()


def contains_term(text, term):
    return term.lower() in text


def is_obvious_junk(item):
    text = searchable_text(item)

    if item["mime"] in BAD_MIME:
        return True

    if not item["url"]:
        return True

    if item["width"] < MIN_WIDTH or item["height"] < MIN_HEIGHT:
        return True

    # Reject tiny / extremely narrow images.
    ratio = item["width"] / max(item["height"], 1)

    if ratio > 4.5 or ratio < 0.22:
        return True

    for term in HARD_REJECT_TERMS:
        if contains_term(text, term):
            return True

    return False


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def score_candidate(item, messier_number):
    if is_obvious_junk(item):
        return -10_000

    text = searchable_text(item)

    score = 0

    # Resolution.
    pixels = item["width"] * item["height"]

    if pixels >= 40_000_000:
        score += 12
    elif pixels >= 20_000_000:
        score += 10
    elif pixels >= 10_000_000:
        score += 8
    elif pixels >= 5_000_000:
        score += 5
    elif pixels >= 2_000_000:
        score += 2

    # Strong positive source terms.
    for term in GOOD_TERMS:
        if term in text:
            score += 4

    # Observatory / institutional sources get a boost.
    institutional = [
        "nasa",
        "esa",
        "hubble",
        "jwst",
        "webb",
        "eso",
        "stsci",
        "spitzer",
        "chandra",
        "2mass",
        "sdss",
    ]

    for term in institutional:
        if term in text:
            score += 6

    # Scientific wavelength information can be valuable.
    wavelength_terms = [
        "infrared",
        "x-ray",
        "ultraviolet",
        "radio",
        "h-alpha",
        "h alpha",
        "oiii",
        "sii",
    ]

    if any(term in text for term in wavelength_terms):
        score += 3

    # Prefer actual object images.
    object_patterns = [
        rf"\bm{messier_number}\b",
        rf"messier[\s_-]*{messier_number}\b",
    ]

    if any(re.search(pattern, text, re.I) for pattern in object_patterns):
        score += 3

    # Penalize generic "chart/map/atlas" even when it wasn't hard rejected.
    for term in SOFT_REJECT_TERMS:
        if term in text:
            score -= 6

    # Penalize suspiciously small files.
    if item["size"] < 100_000:
        score -= 3

    return score


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def download_file(item, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)

    if destination.exists():
        return True

    try:
        with SESSION.get(
            item["url"],
            stream=True,
            timeout=60
        ) as response:

            response.raise_for_status()

            with destination.open("wb") as f:
                for chunk in response.iter_content(chunk_size=1024 * 256):
                    if chunk:
                        f.write(chunk)

        return True

    except Exception as exc:
        print(f"    Download failed: {exc}")

        if destination.exists():
            destination.unlink()

        return False


# ---------------------------------------------------------------------------
# Image normalization / contact sheets
# ---------------------------------------------------------------------------

def safe_extension(item):
    url = item["url"].lower()

    for ext in [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]:
        if ext in url:
            return ext

    return ".jpg"


def make_thumbnail(path, width=360, height=240):
    try:
        image = Image.open(path).convert("RGB")
        image.thumbnail((width, height))
        return image
    except Exception:
        return None


def make_contact_sheet(messier_number, items):
    object_dir = CANDIDATE_DIR / f"M{messier_number}"

    image_paths = sorted(object_dir.glob("*"))

    thumbnails = []

    for path in image_paths:
        thumbnail = make_thumbnail(path)

        if thumbnail:
            thumbnails.append((path, thumbnail))

    if not thumbnails:
        return

    cols = 2
    cell_w = 500
    cell_h = 350
    rows = math.ceil(len(thumbnails) / cols)

    sheet = Image.new(
        "RGB",
        (cols * cell_w, rows * cell_h),
        "white"
    )

    draw = ImageDraw.Draw(sheet)

    for index, (path, thumbnail) in enumerate(thumbnails):
        col = index % cols
        row = index // cols

        x = col * cell_w
        y = row * cell_h

        tx = x + (cell_w - thumbnail.width) // 2
        ty = y + 10

        sheet.paste(thumbnail, (tx, ty))

        draw.text(
            (x + 10, y + 265),
            path.name,
            fill="black"
        )

    REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    output = REVIEW_DIR / f"M{messier_number}.jpg"
    sheet.save(output, quality=92)


# ---------------------------------------------------------------------------
# HTML review gallery
# ---------------------------------------------------------------------------

def generate_review_html():
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    rows = []

    for m in range(1, 111):
        directory = CANDIDATE_DIR / f"M{m}"

        if not directory.exists():
            continue

        images = []

        for path in sorted(directory.iterdir()):
            if path.suffix.lower() not in {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".tif",
                ".tiff",
            }:
                continue

            images.append(path)

        if not images:
            continue

        cards = []

        for image in images:
            # Relative path from review/index.html
            relative = image.relative_to(REVIEW_DIR.parent)

            cards.append(
                f"""
                <div class="image-card">
                    <img src="../{relative.as_posix()}">
                    <div class="filename">{image.name}</div>
                </div>
                """
            )

        rows.append(
            f"""
            <section>
                <h2>M{m}</h2>
                <div class="grid">
                    {''.join(cards)}
                </div>
            </section>
            """
        )

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Messier Image Candidates</title>

<style>
body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #111;
    color: #eee;
    margin: 0;
    padding: 30px;
}}

h1 {{
    margin-top: 0;
}}

section {{
    margin-bottom: 50px;
    border-bottom: 1px solid #333;
    padding-bottom: 30px;
}}

.grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}}

.image-card {{
    background: #1d1d1d;
    border-radius: 10px;
    padding: 10px;
}}

.image-card img {{
    width: 100%;
    height: 240px;
    object-fit: contain;
    background: #000;
    border-radius: 6px;
}}

.filename {{
    font-size: 13px;
    margin-top: 8px;
    word-break: break-all;
    color: #aaa;
}}
</style>

</head>

<body>

<h1>AstroTrainer — Messier Image Candidates</h1>

<p>
Review the candidate images below.
The downloaded files are in the <code>candidates/</code> directory.
</p>

{''.join(rows)}

</body>
</html>
"""

    output = REVIEW_DIR / "index.html"
    output.write_text(html, encoding="utf-8")

    return output


# ---------------------------------------------------------------------------
# Main collection
# ---------------------------------------------------------------------------

def collect_messier(m):
    print(f"\n{'=' * 60}")
    print(f"M{m}")
    print(f"{'=' * 60}")

    category = f"Category:Messier {m}"

    try:
        resolved = get_page_redirect(category)
    except Exception as exc:
        print(f"  Could not resolve category: {exc}")
        return []

    print(f"  Category: {resolved}")

    try:
        files = get_category_files(resolved)
    except Exception as exc:
        print(f"  Could not retrieve files: {exc}")
        return []

    print(f"  Files found: {len(files)}")

    if not files:
        return []

    try:
        info = get_file_info(files)
    except Exception as exc:
        print(f"  Could not retrieve metadata: {exc}")
        return []

    scored = []

    for item in info:
        item["messier"] = m
        item["score"] = score_candidate(item, m)

        if item["score"] > -10_000:
            scored.append(item)

    scored.sort(
        key=lambda x: (
            x["score"],
            x["width"] * x["height"],
        ),
        reverse=True,
    )

    selected = scored[:MAX_CANDIDATES]

    print(f"  Usable candidates: {len(scored)}")
    print(f"  Downloading top {len(selected)}")

    object_dir = CANDIDATE_DIR / f"M{m}"
    object_dir.mkdir(parents=True, exist_ok=True)

    saved_metadata = []

    for index, item in enumerate(selected, start=1):
        extension = safe_extension(item)

        filename = f"{index:02d}{extension}"
        destination = object_dir / filename

        print(
            f"    {index:02d}. "
            f"score={item['score']:>4} "
            f"{item['width']}x{item['height']} "
            f"{item['title']}"
        )

        if download_file(item, destination):
            metadata = {
                **item,
                "local_file": str(
                    destination.relative_to(ROOT)
                ),
            }

            saved_metadata.append(metadata)

    metadata_path = (
        METADATA_DIR / f"M{m}.json"
    )

    METADATA_DIR.mkdir(parents=True, exist_ok=True)

    metadata_path.write_text(
        json.dumps(
            saved_metadata,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    make_contact_sheet(m, saved_metadata)

    return saved_metadata


def main():
    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    all_metadata = []

    for m in range(1, 111):
        try:
            metadata = collect_messier(m)
            all_metadata.extend(metadata)
        except KeyboardInterrupt:
            print("\nStopped by user.")
            break
        except Exception as exc:
            print(f"\nERROR processing M{m}: {exc}")

    output = ROOT / "ALL_METADATA.json"

    output.write_text(
        json.dumps(
            all_metadata,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    review = generate_review_html()

    print("\n")
    print("=" * 60)
    print("DONE")
    print("=" * 60)
    print(f"Metadata: {output}")
    print(f"Review gallery: {review}")
    print()
    print("Open the review gallery with:")
    print(f"  open {review}")


if __name__ == "__main__":
    main()
