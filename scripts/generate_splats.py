import json
import logging
import sys
from pathlib import Path

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

    scale = 260 / TARGET_SIZE

    splats = []

    cx_img, cy_img = width / 2, height / 2
    r_limit_sq = (min(width, height) / 2) ** 2

    min_x, max_x = float("inf"), float("-inf")
    min_y, max_y = float("inf"), float("-inf")

    pixel_data = (
        img.get_flattened_data()
        if hasattr(img, "get_flattened_data")
        else img.getdata()
    )

    for i, (r, g, b, a) in enumerate(pixel_data):
        if a < 50:
            continue

        y, x = divmod(i, width)
        dx = x - cx_img
        dy = y - cy_img
        if (dx * dx + dy * dy) > r_limit_sq:
            continue
        ox = x * scale
        oy = y * scale

        if ox < min_x:
            min_x = ox
        if ox > max_x:
            max_x = ox
        if oy < min_y:
            min_y = oy
        if oy > max_y:
            max_y = oy
        ox = x * scale
        splats.append({"ox": ox, "oy": oy, "r": r, "g": g, "b": b})

    if splats:
        offset_cx = (min_x + max_x) / 2 - 160
        offset_cy = (min_y + max_y) / 2 - 160
        for s in splats:
            s["ox"] -= offset_cx
            s["oy"] -= offset_cy

    compact_splats = [
        [round(s["ox"], 2), round(s["oy"], 2), s["r"], s["g"], s["b"]]
        for s in splats
    ]

    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Generated {len(compact_splats)} particles. Centering and saving...")
        with open(out_path, "w") as f:
            json.dump(compact_splats, f, separators=(",", ":"))
        logger.info(f"Successfully saved optimized splats to {out_path}")
    except Exception as e:
        logger.error(f"Failed to save splats to {out_path}: {e}")
        sys.exit(1)


if __name__ == "__main__":
    generate_splats()
