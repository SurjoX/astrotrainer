import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


# ============================================================
# IAU SOURCE
# ============================================================

IAU_URL = "https://iauarchive.eso.org/public/themes/constellations/"


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

OUTPUT_DIR = (
    PROJECT_ROOT
    / "public"
    / "iau-constellations"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# IAU ABBREVIATION -> ASTROTRAINER FILENAME
# ============================================================

CONSTELLATIONS = {
    "And": "and",
    "Ant": "ant",
    "Aps": "aps",
    "Aqr": "aqr",
    "Aql": "aql",
    "Ara": "ara",
    "Ari": "ari",
    "Aur": "aur",
    "Boo": "boo",
    "Cae": "cae",
    "Cam": "cam",
    "Cnc": "cnc",
    "CVn": "cvn",
    "CMa": "cma",
    "CMi": "cmi",
    "Cap": "cap",
    "Car": "car",
    "Cas": "cas",
    "Cen": "cen",
    "Cep": "cep",
    "Cet": "cet",
    "Cha": "cha",
    "Cir": "cir",
    "Col": "col",
    "Com": "com",
    "CrA": "cra",
    "CrB": "crb",
    "Crv": "crv",
    "Crt": "crt",
    "Cru": "cru",
    "Cyg": "cyg",
    "Del": "del",
    "Dor": "dor",
    "Dra": "dra",
    "Equ": "equ",
    "Eri": "eri",
    "For": "for",
    "Gem": "gem",
    "Gru": "gru",
    "Her": "her",
    "Hor": "hor",
    "Hya": "hya",
    "Hyi": "hyi",
    "Ind": "ind",
    "Lac": "lac",
    "Leo": "leo",
    "LMi": "lmi",
    "Lep": "lep",
    "Lib": "lib",
    "Lup": "lup",
    "Lyn": "lyn",
    "Lyr": "lyr",
    "Men": "men",
    "Mic": "mic",
    "Mon": "mon",
    "Mus": "mus",
    "Nor": "nor",
    "Oct": "oct",
    "Oph": "oph",
    "Ori": "ori",
    "Pav": "pav",
    "Peg": "peg",
    "Per": "per",
    "Phe": "phe",
    "Pic": "pic",
    "Psc": "psc",
    "PsA": "psa",
    "Pup": "pup",
    "Pyx": "pyx",
    "Ret": "ret",
    "Sge": "sge",
    "Sgr": "sgr",
    "Sco": "sco",
    "Scl": "scl",
    "Sct": "sct",
    "Ser": "ser",
    "Sex": "sex",
    "Tau": "tau",
    "Tel": "tel",
    "Tri": "tri",
    "TrA": "tra",
    "Tuc": "tuc",
    "UMa": "uma",
    "UMi": "umi",
    "Vel": "vel",
    "Vir": "vir",
    "Vol": "vol",
    "Vul": "vul",
}


# ============================================================
# FETCH IAU PAGE
# ============================================================

def get_iau_page():

    print("Fetching official IAU constellation page...")

    response = requests.get(
        IAU_URL,
        timeout=30,
        headers={
            "User-Agent": "AstroTrainer/1.0"
        }
    )

    response.raise_for_status()

    return response.text


# ============================================================
# FIND PDF LINKS
# ============================================================

def find_pdf_links(html):

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    links = []

    for link in soup.find_all(
        "a",
        href=True
    ):

        href = link["href"]

        # Ignore anything that isn't a PDF
        if ".pdf" not in href.lower():
            continue

        full_url = urljoin(
            IAU_URL,
            href
        )

        links.append(full_url)

    # Remove duplicates while preserving order
    return list(
        dict.fromkeys(links)
    )


# ============================================================
# FIND CHART FOR CONSTELLATION
# ============================================================

def find_chart_for_abbreviation(
    pdf_links,
    abbreviation
):
    """
    Find the PDF chart corresponding to
    the given IAU constellation abbreviation.

    Matching is performed against the PDF
    filename rather than the entire URL.
    """

    target = abbreviation.lower()

    candidates = []

    for url in pdf_links:

        filename = Path(
            urlparse(url).path
        ).name.lower()

        # Remove extension
        stem = Path(
            filename
        ).stem.lower()

        # ----------------------------------------------------
        # Exact filename match
        # ----------------------------------------------------

        if stem == target:
            return url

        # ----------------------------------------------------
        # Common IAU filename patterns
        #
        # Examples:
        #   UMa.pdf
        #   UMa_chart.pdf
        #   chart_UMa.pdf
        # ----------------------------------------------------

        parts = (
            stem
            .replace("-", "_")
            .replace(" ", "_")
            .split("_")
        )

        if target in parts:
            candidates.append(url)

    if not candidates:
        return None

    return candidates[0]


# ============================================================
# DOWNLOAD PDF
# ============================================================

def download_pdf(
    url,
    output_path
):

    response = requests.get(
        url,
        timeout=60,
        headers={
            "User-Agent": "AstroTrainer/1.0"
        }
    )

    response.raise_for_status()

    # --------------------------------------------------------
    # Basic validation
    # --------------------------------------------------------

    content = response.content

    if not content:
        raise ValueError(
            "Downloaded file is empty."
        )

    # PDF files normally start with %PDF
    if not content.startswith(
        b"%PDF"
    ):
        raise ValueError(
            "Downloaded file does not appear "
            "to be a PDF."
        )

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    with open(
        output_path,
        "wb"
    ) as f:

        f.write(content)


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print(
        "AstroTrainer — "
        "IAU Constellation PDF Downloader"
    )
    print("=" * 60)
    print()

    # --------------------------------------------------------
    # Fetch IAU page
    # --------------------------------------------------------

    html = get_iau_page()

    # --------------------------------------------------------
    # Find PDFs
    # --------------------------------------------------------

    pdf_links = find_pdf_links(
        html
    )

    print(
        f"Found {len(pdf_links)} PDF links "
        "on the IAU page."
    )

    print()

    if not pdf_links:

        print(
            "❌ No PDF links were found."
        )

        print(
            "The IAU page may have changed "
            "its HTML structure."
        )

        return

    # --------------------------------------------------------
    # Download each constellation
    # --------------------------------------------------------

    successful = []
    failed = []

    total = len(
        CONSTELLATIONS
    )

    for index, (
        abbreviation,
        filename
    ) in enumerate(
        CONSTELLATIONS.items(),
        start=1
    ):

        output_path = (
            OUTPUT_DIR
            / f"{filename}.pdf"
        )

        print(
            f"[{index:02d}/{total}] "
            f"{abbreviation} -> "
            f"{filename}.pdf"
        )

        # ----------------------------------------------------
        # Find corresponding PDF
        # ----------------------------------------------------

        pdf_url = (
            find_chart_for_abbreviation(
                pdf_links,
                abbreviation
            )
        )

        if pdf_url is None:

            print(
                "   ❌ Could not find PDF"
            )

            failed.append(
                abbreviation
            )

            continue

        print(
            f"   URL: {pdf_url}"
        )

        # ----------------------------------------------------
        # Download
        # ----------------------------------------------------

        try:

            download_pdf(
                pdf_url,
                output_path
            )

            size_kb = (
                output_path.stat().st_size
                / 1024
            )

            print(
                f"   ✓ Downloaded "
                f"({size_kb:.1f} KB)"
            )

            successful.append(
                abbreviation
            )

        except Exception as e:

            print(
                f"   ❌ Download failed: {e}"
            )

            # Remove partially downloaded file
            if output_path.exists():
                output_path.unlink()

            failed.append(
                abbreviation
            )

        # ----------------------------------------------------
        # Small delay
        # ----------------------------------------------------

        time.sleep(0.3)

    # ========================================================
    # SUMMARY
    # ========================================================

    print()
    print("=" * 60)
    print("DOWNLOAD COMPLETE")
    print("=" * 60)

    print(
        f"Successful: {len(successful)}"
    )

    print(
        f"Failed:     {len(failed)}"
    )

    if failed:

        print()
        print(
            "Failed constellations:"
        )

        for abbreviation in failed:
            print(
                f"  - {abbreviation}"
            )

    print()
    print(
        "PDFs saved to:"
    )

    print(
        OUTPUT_DIR
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()