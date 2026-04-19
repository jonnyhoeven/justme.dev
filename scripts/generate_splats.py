import json
import logging
import sys
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

try:
    from PIL import Image
except ImportError:
    logger.error("Pillow is not installed. Please install it (e.g., pip install Pillow).")
    sys.exit(1)


def generate_splats():
    base_dir = Path(__file__).parent.parent
    image_path = base_dir / "public" / "images" / "ava.webp"
    out_path = base_dir / "public" / "data" / "splats.json"

    if not image_path.exists():
        logger.error(f"Image not found: {image_path}")
        sys.exit(1)

    try:
        logger.info(f"Loading image: {image_path}")
        img = Image.open(image_path).convert("RGBA")
    except Exception as e:
        logger.error(f"Failed to open image {image_path}: {e}")
        sys.exit(1)

    TARGET_SIZE = 27
    img.thumbnail((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)

    width, height = img.size

    # Scale bounds slightly smaller than the 320x320 box (260) to provide a 30px padding
    # This prevents the particles and their physics jiggle from clipping on the `<canvas>` edges!
    scale = 260 / TARGET_SIZE

    splats = []

    # Pre-calculate centering and clipping constants
    cx_img, cy_img = width / 2, height / 2
    r_limit_sq = (min(width, height) / 2) ** 2

    # Values to track the actual bounding box in one pass
    min_x, max_x = float("inf"), float("-inf")
    min_y, max_y = float("inf"), float("-inf")

    # Optimized iteration using get_flattened_data() (modern) or getdata() (legacy)
    # This avoids the overhead of nested loops and individual pixel lookups
    pixel_data = (
        img.get_flattened_data()
        if hasattr(img, "get_flattened_data")
        else img.getdata()
    )

    for i, (r, g, b, a) in enumerate(pixel_data):
        # Skip transparent pixels early
        if a < 50:
            continue

        y, x = divmod(i, width)

        # Optimized circle clipping (dist squared avoids sqrt)
        dx = x - cx_img
        dy = y - cy_img
        if (dx * dx + dy * dy) > r_limit_sq:
            continue

        # Start with raw scaled coords
        ox = x * scale
        oy = y * scale

        # Bounding box tracking (using if-statements is faster than min/max in a loop)
        if ox < min_x:
            min_x = ox
        if ox > max_x:
            max_x = ox
        if oy < min_y:
            min_y = oy
        if oy > max_y:
            max_y = oy

        # Start with raw scaled coords
        ox = x * scale
        splats.append({"ox": ox, "oy": oy, "r": r, "g": g, "b": b})

    # Precision re-centering to exact 160, 160
    if splats:
        offset_cx = (min_x + max_x) / 2 - 160
        offset_cy = (min_y + max_y) / 2 - 160
        for s in splats:
            s["ox"] -= offset_cx
            s["oy"] -= offset_cy

    # Final compact format: [[ox, oy, r, g, b], ...]
    # Rounding to 2 decimals saved ~30% per float coordinate
    compact_splats = [
        [round(s["ox"], 2), round(s["oy"], 2), s["r"], s["g"], s["b"]]
        for s in splats
    ]

    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Generated {len(compact_splats)} particles. Centering and saving...")
        with open(out_path, "w") as f:
            # Use compact separators to remove all whitespace
            json.dump(compact_splats, f, separators=(",", ":"))
        logger.info(f"Successfully saved optimized splats to {out_path}")
    except Exception as e:
        logger.error(f"Failed to save splats to {out_path}: {e}")
        sys.exit(1)


if __name__ == "__main__":
    generate_splats()
