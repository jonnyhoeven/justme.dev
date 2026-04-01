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
    
    offset_x = (320 - width * scale) / 2
    offset_y = (320 - height * scale) / 2

    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            
            # Skip transparent pixels
            if a < 50:
                continue
                
            # Optional: clip to circle so it forms a nice round splat face
            cx = width / 2
            cy = height / 2
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            if dist > min(width, height) / 2:
                continue

            ox = x * scale + offset_x
            oy = y * scale + offset_y
            
            # Brighter pixels have slightly lower mass so they jiggle more easily? Or higher mass so they are stabler?
            # Let's make mass random-ish but anchored to brightness for a textured feel
            luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            mass = 0.5 + (max(0, 1 - luminance) * 1.5)
            
            color = f"{r}, {g}, {b}"
            
            splats.append({
                "ox": ox,
                "oy": oy,
                "color": color,
                "mass": mass
            })
            
    # Calculate bounding box of the actual visible points
    min_x = min(s["ox"] for s in splats)
    max_x = max(s["ox"] for s in splats)
    min_y = min(s["oy"] for s in splats)
    max_y = max(s["oy"] for s in splats)
    
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    
    # Shift all particles so their center exactly matches 160, 160 (the center of our 320x320 Vitepress container)
    for s in splats:
        s["ox"] = s["ox"] - cx + 160
        s["oy"] = s["oy"] - cy + 160
            
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Generated {len(splats)} particles from image and centered them.")
    with open(out_path, "w") as f:
        json.dump(splats, f)

if __name__ == "__main__":
    generate_splats()
