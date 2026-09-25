# IAU Constellation Images

This directory should contain official IAU constellation images for the "Official IAU Images" practice mode.

## Image Format

Each constellation should have a corresponding image file named `{constellation-id}.jpg`, for example:

Each constellation has a corresponding delivery image named `{constellation-id}_processed.webp`, for example:
- `ori_processed.webp` (Orion)
- `leo_processed.webp` (Leo)
- `her_processed.webp` (Hercules)
- etc.

Image specifications:
- Format: WebP (generated from the processed source artwork)
- Format: JPG (approximately 1000x1000px minimum)
- Aspect ratio: Square or landscape
- Content: Official IAU constellation illustration
- Naming: Use the constellation ID from the IAU catalog (e.g., "ori", "and", "cen")
The 88 optimized WebP delivery images are stored in `processed/` and are served as static assets from `/iau-constellations/processed/`. The practice mode derives the URL from the existing `src/data/constellations.json` IDs, so it does not maintain a second constellation mapping. Serpens uses a composite of the official Caput and Cauda charts because the IAU publishes that constellation as two charts.

- Images are loaded from `/iau-constellations/processed/{id}_processed.webp`
The current image is preloaded at high priority and the next generated IAU question is preloaded in the background
The application gracefully handles missing images with a helpful error message
### Official IAU Constellations

The 88 official IAU constellations are maintained by the International Astronomical Union. Official illustrations are available from several sources:

1. **Stellarium Sky Culture** - Stellarium provides traditional constellation figures that may be usable under their license
2. **IAU Website** - Some official resources are available with attribution
3. **Astronomy Commons** - Various open-source astronomy projects have constellation artwork

### Licensing Requirements

Before adding any images to this directory:

1. **Verify License** - Ensure the images can be legally used in this educational application
2. **Check Attribution Requirements** - Add any required attribution to the application
3. **Document Source** - Include comments in the code indicating the source and license

### Recommended Approach

For a production implementation, consider:

- Using Wikimedia Commons constellation images (check CC licenses)
- Creating custom illustrations consistent with the application's style
- Licensing official IAU artwork if available
- Implementing a dynamic loader that references external licensed sources

## Current Status

The image display is implemented and ready to show images. As soon as properly-licensed images are added to this directory with the correct naming convention, the IAU Images practice mode will display them.

## Implementation Notes

- Images are loaded from `/public/iau-constellations/{id}.jpg`
- Constellation IDs are the 3-letter abbreviations (lowercase) from the IAU catalog
- The application gracefully handles missing images with a helpful error message
- Image height is limited to 60vh to fit on screen with answer choices
