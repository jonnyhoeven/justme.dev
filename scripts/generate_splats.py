import json
import math
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Please install Pillow")
    sys.exit(1)

def generate_splats():
    base_dir = Path(__file__).parent.parent
    image_path = base_dir / "public" / "images" / "ava.webp"
    out_path = base_dir / "public" / "data" / "splats.json"
    
    if not image_path.exists():
        print(f"Error: {image_path} not found.")
        sys.exit(1)

    print(f"Loading {image_path}...")
    img = Image.open(image_path).convert("RGBA")
    
    TARGET_SIZE = 55
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
    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')

    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            
            # Skip transparent pixels
            if a < 50:
                continue
                
            # Optimized circle clipping (dist squared avoids sqrt)
            dx = x - cx_img
            dy = y - cy_img
            if (dx*dx + dy*dy) > r_limit_sq:
                continue

            # Start with raw scaled coords; final centering pass below handles alignment
            ox = x * scale
            oy = y * scale
            
            # Bounding box tracking
            if ox < min_x: min_x = ox
            if ox > max_x: max_x = ox
            if oy < min_y: min_y = oy
            if oy > max_y: max_y = oy
            
            luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            mass = 0.5 + (max(0, 1 - luminance) * 1.5)
            
            splats.append({
                "ox": ox,
                "oy": oy,
                "color": f"{r}, {g}, {b}",
                "mass": mass
            })
            
    # Precision re-centering to exact 160, 160
    if splats:
        offset_cx = (min_x + max_x) / 2 - 160
        offset_cy = (min_y + max_y) / 2 - 160
        for s in splats:
            s["ox"] -= offset_cx
            s["oy"] -= offset_cy
            
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Generated {len(splats)} particles from image and centered them.")
    with open(out_path, "w") as f:
        json.dump(splats, f)

if __name__ == "__main__":
    generate_splats()
