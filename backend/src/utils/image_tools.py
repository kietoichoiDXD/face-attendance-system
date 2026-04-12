from __future__ import annotations

import io
from typing import Dict, Tuple

from PIL import Image


def _to_pixel_coords(vertices: Dict[str, int], width: int, height: int) -> Tuple[int, int]:
    x = int(vertices.get("x", 0))
    y = int(vertices.get("y", 0))
    return max(0, min(width, x)), max(0, min(height, y))


def crop_face(image_bytes: bytes, bounding_poly: Dict[str, list]) -> bytes:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    width, height = image.size

    vertices = bounding_poly.get("vertices", [])
    if len(vertices) < 4:
        return image_bytes

    p1 = _to_pixel_coords(vertices[0], width, height)
    p3 = _to_pixel_coords(vertices[2], width, height)

    left = min(p1[0], p3[0])
    top = min(p1[1], p3[1])
    right = max(p1[0], p3[0])
    bottom = max(p1[1], p3[1])

    if right <= left or bottom <= top:
        return image_bytes

    cropped = image.crop((left, top, right, bottom))
    output = io.BytesIO()
    cropped.save(output, format="JPEG")
    return output.getvalue()


def poly_to_ratio_box(bounding_poly: Dict[str, list], image_width: int, image_height: int) -> Dict[str, float]:
    vertices = bounding_poly.get("vertices", [])
    if len(vertices) < 4:
        return {"Left": 0.0, "Top": 0.0, "Width": 1.0, "Height": 1.0}

    xs = [int(v.get("x", 0)) for v in vertices]
    ys = [int(v.get("y", 0)) for v in vertices]

    left = max(0, min(xs))
    top = max(0, min(ys))
    right = max(xs)
    bottom = max(ys)

    width = max(1, right - left)
    height = max(1, bottom - top)

    return {
        "Left": round(left / max(1, image_width), 4),
        "Top": round(top / max(1, image_height), 4),
        "Width": round(width / max(1, image_width), 4),
        "Height": round(height / max(1, image_height), 4),
    }


def image_size(image_bytes: bytes) -> Tuple[int, int]:
    image = Image.open(io.BytesIO(image_bytes))
    return image.size
