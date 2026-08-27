import cv2
import os
import numpy as np

# ------------------------------------------------------------
# FOLDER
# ------------------------------------------------------------

folder = "public/iau-constellations/processed"

# ------------------------------------------------------------
# SETTINGS
# ------------------------------------------------------------

threshold = 245
margin = 15

# ------------------------------------------------------------
# PROCESS ALL JPG FILES
# ------------------------------------------------------------

for filename in os.listdir(folder):

    if not filename.lower().endswith((".jpg", ".jpeg")):
        continue

    path = os.path.join(folder, filename)

    print(f"Processing: {filename}")

    # --------------------------------------------------------
    # LOAD IMAGE
    # --------------------------------------------------------

    img = cv2.imread(path)

    if img is None:
        print(f"  Could not read {filename}")
        continue

    h, w = img.shape[:2]

    # --------------------------------------------------------
    # FIND NON-WHITE PIXELS
    # --------------------------------------------------------

    gray = cv2.cvtColor(
        img,
        cv2.COLOR_BGR2GRAY
    )

    # Pixels darker than threshold
    mask = gray < threshold

    ys, xs = np.where(mask)

    if len(xs) == 0:
        print("  No content detected, skipping.")
        continue

    # --------------------------------------------------------
    # BOUNDING BOX
    # --------------------------------------------------------

    left = xs.min()
    right = xs.max()
    top = ys.min()
    bottom = ys.max()

    # --------------------------------------------------------
    # ADD MARGIN
    # --------------------------------------------------------

    left = max(
        0,
        left - margin
    )

    top = max(
        0,
        top - margin
    )

    right = min(
        w,
        right + margin
    )

    bottom = min(
        h,
        bottom + margin
    )

    # --------------------------------------------------------
    # CROP
    # --------------------------------------------------------

    cropped = img[
        top:bottom,
        left:right
    ]

    # --------------------------------------------------------
    # OVERWRITE ORIGINAL
    # --------------------------------------------------------

    success = cv2.imwrite(
        path,
        cropped,
        [
            cv2.IMWRITE_JPEG_QUALITY,
            95
        ]
    )

    if success:
        print(
            f"  {w}x{h} -> "
            f"{cropped.shape[1]}x{cropped.shape[0]}"
        )
    else:
        print(
            f"  Failed to save {filename}"
        )

print("\nDone.")