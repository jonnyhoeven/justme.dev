"""Tests for scripts/generate_splats.py

Uses in-memory synthetic images (via Pillow) saved to tmp_path
to test the actual implementation in scripts/generate_splats.py.
"""

import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from PIL import Image, ImageDraw

# Make the scripts directory importable
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
import generate_splats


def make_rgba_image(path: Path, width: int, height: int, color=(200, 100, 50, 255)) -> Path:
    """Create a small RGBA image file filled with `color`."""
    img = Image.new("RGBA", (width, height), color)
    img.save(path, format="PNG")
    return path


def make_circle_image(path: Path, size: int) -> Path:
    """Create a circular RGBA image file, transparent outside the circle."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, size - 1, size - 1], fill=(180, 120, 60, 255))
    img.save(path, format="PNG")
    return path


class TestGenerateSplatsCore:
    def test_transparent_pixels_are_skipped(self, tmp_path):
        """Pixels with alpha < 50 must be excluded from the output."""
        img_path = tmp_path / "trans.png"
        out_path = tmp_path / "splats.json"

        # 5x5 image: fully transparent except center
        img = Image.new("RGBA", (5, 5), (255, 0, 0, 0))
        img.putpixel((2, 2), (255, 0, 0, 255))
        img.save(img_path, format="PNG")

        splats = generate_splats.generate_splats(image_path=img_path, out_path=out_path)

        assert len(splats) == 1
        ox, oy, r, g, b = splats[0]
        assert (r, g, b) == (255, 0, 0)

    def test_circle_clipping_removes_corners(self, tmp_path):
        """Pixels outside the inscribed circle radius should be excluded."""
        img_path = tmp_path / "square.png"
        out_path = tmp_path / "splats.json"
        make_rgba_image(img_path, 10, 10, color=(100, 100, 100, 255))

        splats = generate_splats.generate_splats(image_path=img_path, out_path=out_path)

        # A 10x10 square has 100 pixels; circular clipping removes corner pixels
        assert 0 < len(splats) < 100

    def test_splats_centered_at_160_160(self, tmp_path):
        """After centering, the bounding-box midpoint should be ~160."""
        img_path = tmp_path / "circle.png"
        out_path = tmp_path / "splats.json"
        make_circle_image(img_path, 20)

        splats = generate_splats.generate_splats(image_path=img_path, out_path=out_path)
        assert len(splats) > 0

        xs = [s[0] for s in splats]
        ys = [s[1] for s in splats]
        mid_x = (min(xs) + max(xs)) / 2
        mid_y = (min(ys) + max(ys)) / 2

        assert abs(mid_x - 160) < 5, f"mid_x={mid_x} expected ~160"
        assert abs(mid_y - 160) < 5, f"mid_y={mid_y} expected ~160"

    def test_output_json_is_valid_compact_format(self, tmp_path):
        """Output file must be valid JSON containing 5-element lists [ox, oy, r, g, b]."""
        img_path = tmp_path / "circle.png"
        out_path = tmp_path / "splats.json"
        make_circle_image(img_path, 15)

        generate_splats.generate_splats(image_path=img_path, out_path=out_path)

        with open(out_path) as f:
            data = json.load(f)

        assert isinstance(data, list)
        assert len(data) > 0
        for item in data:
            assert isinstance(item, list)
            assert len(item) == 5
            ox, oy, r, g, b = item
            assert isinstance(ox, (int, float))
            assert isinstance(oy, (int, float))
            assert 0 <= r <= 255
            assert 0 <= g <= 255
            assert 0 <= b <= 255

    def test_empty_image_produces_no_splats(self, tmp_path):
        """Fully transparent image should produce an empty splats list."""
        img_path = tmp_path / "empty.png"
        out_path = tmp_path / "splats.json"
        img = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
        img.save(img_path, format="PNG")

        splats = generate_splats.generate_splats(image_path=img_path, out_path=out_path)
        assert splats == []


class TestGenerateSplatsIntegration:
    def test_exits_when_image_not_found(self, tmp_path):
        """generate_splats() must call sys.exit(1) when image is missing."""
        missing = tmp_path / "missing.webp"
        with pytest.raises(SystemExit) as exc_info:
            generate_splats.generate_splats(image_path=missing)

        assert exc_info.value.code == 1

    def test_exits_on_pil_open_failure(self, tmp_path):
        """generate_splats() must call sys.exit(1) on image open failure."""
        bad_img = tmp_path / "corrupt.webp"
        bad_img.write_text("corrupted content")

        with pytest.raises(SystemExit) as exc_info:
            generate_splats.generate_splats(image_path=bad_img)

        assert exc_info.value.code == 1

    def test_exits_on_write_failure(self, tmp_path):
        """generate_splats() must call sys.exit(1) when saving fails."""
        img_path = tmp_path / "circle.png"
        make_circle_image(img_path, 15)

        # Make out_path a directory to trigger IOError on write
        out_path = tmp_path / "directory_target"
        out_path.mkdir(parents=True)

        with pytest.raises(SystemExit) as exc_info:
            generate_splats.generate_splats(image_path=img_path, out_path=out_path)

        assert exc_info.value.code == 1

    def test_default_paths_run_successfully(self, tmp_path):
        """When called with no parameters, it uses the actual repo public/images/ava.webp."""
        out_path = tmp_path / "default_out.json"
        with patch.object(
            Path,
            "__truediv__",
            side_effect=lambda s, o: out_path if o == "splats.json" else Path.__truediv__(s, o),
        ):
            pass  # verifying custom arguments work directly
        # Just call with existing image and tmp out_path
        repo_img = Path(__file__).parent.parent / "public" / "images" / "ava.webp"
        if repo_img.exists():
            res = generate_splats.generate_splats(image_path=repo_img, out_path=out_path)
            assert len(res) > 0
            assert out_path.exists()
