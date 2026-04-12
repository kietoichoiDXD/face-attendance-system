from __future__ import annotations

import io
import math
from typing import Iterable, List

from PIL import Image


def build_face_embedding(image_bytes: bytes, size: int = 32) -> List[float]:
    image = Image.open(io.BytesIO(image_bytes)).convert("L").resize((size, size))
    pixels = list(image.getdata())

    norm = math.sqrt(sum(float(p) * float(p) for p in pixels))
    if norm == 0:
        return [0.0 for _ in pixels]

    return [round(float(p) / norm, 8) for p in pixels]


def cosine_similarity(vec_a: Iterable[float], vec_b: Iterable[float]) -> float:
    a = list(vec_a)
    b = list(vec_b)
    if not a or not b or len(a) != len(b):
        return 0.0

    dot = sum(float(x) * float(y) for x, y in zip(a, b))
    norm_a = math.sqrt(sum(float(x) * float(x) for x in a))
    norm_b = math.sqrt(sum(float(y) * float(y) for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
