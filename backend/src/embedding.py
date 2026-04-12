import io
import math
from typing import List

from PIL import Image


def build_face_embedding(image_bytes: bytes, size: int = 32) -> List[float]:
    """Create a lightweight deterministic embedding from image pixels."""
    image = Image.open(io.BytesIO(image_bytes)).convert("L").resize((size, size))
    pixels = list(image.getdata())
    vector = [value / 255.0 for value in pixels]

    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0:
        return vector
    return [x / norm for x in vector]


def build_face_embedding_from_hash(hash_bytes: bytes, size: int = 32) -> List[float]:
    """
    Generate deterministic embedding from hash bytes (for detected faces without image data).
    
    Used when we want to generate a unique embedding per detected face
    without actually extracting and processing the face region.
    """
    # Use hash bytes to seed random-like but deterministic vector
    vector = []
    for i in range(size * size):
        byte_val = hash_bytes[i % len(hash_bytes)]
        normalized = (byte_val / 255.0)
        vector.append(normalized)
    
    # Normalize vector
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0:
        return vector
    return [x / norm for x in vector]


def build_face_embedding_from_box(image_bytes: bytes, box: dict, size: int = 32) -> List[float]:
    """
    Extract face region from bounding box and build embedding.
    
    Args:
        image_bytes: Full image data
        box: Bounding box dict with keys: x, y, w, h
        size: Output embedding size (default 32x32)
    
    Returns:
        Normalized embedding vector
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        
        # Ensure box coordinates are within image bounds
        x = max(0, box.get('x', 0))
        y = max(0, box.get('y', 0))
        w = min(box.get('w', 1), image.width - x)
        h = min(box.get('h', 1), image.height - y)
        
        # Crop face region
        face_image = image.crop((x, y, x + w, y + h))
        
        # Convert to grayscale and resize
        face_image = face_image.convert("L").resize((size, size))
        
        # Extract pixels and normalize
        pixels = list(face_image.getdata())
        vector = [value / 255.0 for value in pixels]
        
        # L2 normalization
        norm = math.sqrt(sum(x * x for x in vector))
        if norm == 0:
            return vector
        return [x / norm for x in vector]
    
    except Exception:
        # Fallback: return zero vector
        return [0.0] * (size * size)


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))
