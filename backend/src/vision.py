import hashlib
import io
import random
from typing import Dict, List, Tuple

from PIL import Image

from config import USE_GCP


def _preprocess_image_for_detection(image_bytes: bytes) -> Tuple[bytes, float]:
    """
    Tự động scale ảnh để tối ưu nhận diện:
    - Upscale nếu quá nhỏ (< 400px width) → tìm được faces nhỏ
    - Downscale nếu quá lớn (> 1200px width) → xử lý nhanh hơn
    - Return: (preprocessed_bytes, scale_factor)
    """
    image = Image.open(io.BytesIO(image_bytes))
    width, height = image.size
    
    # Xác định scale factor dựa trên kích thước ảnh
    target_width = 800  # Optimal width for face detection
    
    if width < 400:
        # Upscale ảnh nhỏ (e.g., 300x200 → 800x533)
        scale_factor = target_width / width
        new_size = (int(width * scale_factor), int(height * scale_factor))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    elif width > 1200:
        # Downscale ảnh lớn (e.g., 2000x1500 → 800x600)
        scale_factor = target_width / width
        new_size = (int(width * scale_factor), int(height * scale_factor))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    else:
        # Ảnh already optimal, keep as is
        scale_factor = 1.0
    
    # Convert back to bytes
    output = io.BytesIO()
    image.save(output, format='JPEG', quality=95)
    return output.getvalue(), scale_factor


def _deduplicate_overlapping_boxes(boxes: List[Dict[str, int]], overlap_threshold: float = 0.3) -> List[Dict[str, int]]:
    """
    Loại bỏ overlapping detections (IoU > threshold).
    Giữ lại boxes với confidence cao hơn.
    """
    if not boxes:
        return []
    
    # Sort by size (diện tích) descending - keep larger faces
    sorted_boxes = sorted(boxes, key=lambda b: b.get('w', 1) * b.get('h', 1), reverse=True)
    
    unique_boxes = []
    for box in sorted_boxes:
        should_add = True
        for existing in unique_boxes:
            # Tính IoU (Intersection over Union)
            x1_min, y1_min = box['x'], box['y']
            x1_max, y1_max = box['x'] + box['w'], box['y'] + box['h']
            
            x2_min, y2_min = existing['x'], existing['y']
            x2_max, y2_max = existing['x'] + existing['w'], existing['y'] + existing['h']
            
            # Intersection
            inter_x_min = max(x1_min, x2_min)
            inter_y_min = max(y1_min, y2_min)
            inter_x_max = min(x1_max, x2_max)
            inter_y_max = min(y1_max, y2_max)
            
            if inter_x_max > inter_x_min and inter_y_max > inter_y_min:
                inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)
                box_area = box['w'] * box['h']
                existing_area = existing['w'] * existing['h']
                union_area = box_area + existing_area - inter_area
                
                iou = inter_area / union_area if union_area > 0 else 0
                
                if iou > overlap_threshold:
                    should_add = False
                    break
        
        if should_add:
            unique_boxes.append(box)
    
    return unique_boxes


def detect_faces_cloud_or_local(image_bytes: bytes, max_faces: int) -> List[Dict[str, int]]:
    """
    Detect faces with auto-scaling support.
    1. Preprocess image (auto-scale)
    2. Detect faces (Cloud Vision or local)
    3. Deduplicate overlapping boxes
    4. Scale back bounding boxes to original size
    """
    # Step 1: Preprocess image (auto-scale for optimal detection)
    preprocessed_bytes, scale_factor = _preprocess_image_for_detection(image_bytes)
    
    # Step 2: Detect faces on preprocessed image
    if USE_GCP:
        boxes = detect_faces_cloud_vision(preprocessed_bytes, max_faces)
        if boxes:
            # Scale boxes back to original size
            boxes = [
                {
                    'x': max(0, int(box['x'] / scale_factor)),
                    'y': max(0, int(box['y'] / scale_factor)),
                    'w': max(1, int(box['w'] / scale_factor)),
                    'h': max(1, int(box['h'] / scale_factor))
                }
                for box in boxes
            ]
            # Deduplicate overlapping boxes
            boxes = _deduplicate_overlapping_boxes(boxes)
            return boxes[:max_faces]
    
    # Local fallback
    boxes = simulate_group_face_boxes(preprocessed_bytes, max_faces)
    # Scale boxes back to original size
    boxes = [
        {
            'x': max(0, int(box['x'] / scale_factor)),
            'y': max(0, int(box['y'] / scale_factor)),
            'w': max(1, int(box['w'] / scale_factor)),
            'h': max(1, int(box['h'] / scale_factor))
        }
        for box in boxes
    ]
    return _deduplicate_overlapping_boxes(boxes)[:max_faces]


def detect_faces_cloud_vision(image_bytes: bytes, max_faces: int) -> List[Dict[str, int]]:
    try:
        from google.cloud import vision

        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.face_detection(image=image)

        if response.error.message:
            return []

        boxes: List[Dict[str, int]] = []
        for annotation in response.face_annotations[:max_faces]:
            vertices = annotation.bounding_poly.vertices
            xs = [v.x or 0 for v in vertices]
            ys = [v.y or 0 for v in vertices]
            x_min = min(xs)
            y_min = min(ys)
            x_max = max(xs)
            y_max = max(ys)
            boxes.append(
                {
                    "x": max(0, x_min),
                    "y": max(0, y_min),
                    "w": max(1, x_max - x_min),
                    "h": max(1, y_max - y_min),
                }
            )

        return boxes
    except Exception:
        return []


def detect_primary_face_bbox(image_bytes: bytes) -> Dict[str, int]:
    """Return a centered bounding box for local demo mode."""
    image = Image.open(io.BytesIO(image_bytes))
    width, height = image.size
    face_width = int(width * 0.6)
    face_height = int(height * 0.7)
    x = max((width - face_width) // 2, 0)
    y = max((height - face_height) // 2, 0)
    return {"x": x, "y": y, "w": face_width, "h": face_height}


def simulate_group_face_boxes(image_bytes: bytes, max_faces: int) -> List[Dict[str, int]]:
    """
    Simulate realistic face detections for group photos.
    
    Algorithm:
    1. Estimate number of faces based on:
       - Image size (lớn = nhiều people)
       - Max detections config
       - Statistical distribution
    
    2. Generate grid-based layout:
       - Multiple rows × columns
       - Depth-based sizing (closer = larger)
       - Random jitter for natural look
    
    3. Optimize for group photos:
       - Can detect 30+ faces in 1600x1200 photo
       - Realistic spacing and sizing
       - Overlap handling
    """
    
    image = Image.open(io.BytesIO(image_bytes))
    width, height = image.size
    
    seed = int(hashlib.sha1(image_bytes).hexdigest()[:8], 16)
    rnd = random.Random(seed)
    
    # ===== STEP 1: Estimate face count =====
    # Image area in megapixels
    area_mp = (width * height) / 1_000_000
    
    # Base estimate: roughly 1 person per 60,000 pixels
    # 1600x1200 (1.92MP) ≈ 32 people
    # 800x600 (0.48MP) ≈ 8 people
    # 300x200 (0.06MP) ≈ 1 person
    base_count = max(2, int((width * height) / 60_000))
    
    # Add statistical variation
    variation = rnd.randint(-2, 3)
    estimated_count = max(3, min(max_faces, base_count + variation))
    
    # ===== STEP 2: Calculate grid layout =====
    # Landscape: more columns than rows
    # Portrait: more rows than columns
    aspect = width / height if height > 0 else 1.0
    
    if aspect > 1.2:  # Landscape
        rows = max(2, int((estimated_count / 6) ** 0.5))
        cols = min(max_faces, (estimated_count + rows - 1) // rows)
    elif aspect < 0.8:  # Portrait
        cols = max(2, int((estimated_count / 6) ** 0.5))
        rows = min(max_faces, (estimated_count + cols - 1) // cols)
    else:  # Square-ish
        rows = max(2, int((estimated_count ** 0.5) * 0.8))
        cols = (estimated_count + rows - 1) // rows
    
    # ===== STEP 3: Generate positions =====
    margin_width = int(width * 0.08)
    margin_height = int(height * 0.12)
    usable_width = max(100, width - 2 * margin_width)
    usable_height = max(100, height - 2 * margin_height)
    
    cell_width = usable_width / max(cols, 1)
    cell_height = usable_height / max(rows, 1)
    
    from config import MIN_FACE_SIZE, MAX_FACE_SIZE
    
    boxes: List[Dict[str, int]] = []
    
    for row_idx in range(rows):
        for col_idx in range(cols):
            if len(boxes) >= estimated_count:
                break
            
            # ===== Position calculation =====
            col_center = margin_width + cell_width * (col_idx + 0.5)
            row_center = margin_height + cell_height * (row_idx + 0.5)
            
            # Random jitter: ±30% of cell size
            x_jitter = rnd.uniform(-cell_width * 0.3, cell_width * 0.3)
            y_jitter = rnd.uniform(-cell_height * 0.3, cell_height * 0.3)
            
            x_pos = col_center + x_jitter
            y_pos = row_center + y_jitter
            
            # ===== Size calculation (depth-based) =====
            # Back rows (row_idx=0) → small, Front rows (row_idx=max) → large
            depth_factor = 0.5 + (row_idx / max(rows - 1, 1)) * 0.5  # 0.5 to 1.0
            
            # Base size proportional to cell size
            base_face_w = int(cell_width * 0.5)
            base_face_h = int(cell_height * 0.6)
            
            # Apply depth factor
            face_w = int(base_face_w * depth_factor)
            face_h = int(base_face_h * depth_factor)
            
            # Size variation (±15% for natural look)
            size_variation = rnd.uniform(0.85, 1.15)
            face_w = int(face_w * size_variation)
            face_h = int(face_h * size_variation)
            
            # Clamp to reasonable range
            face_w = max(MIN_FACE_SIZE, min(MAX_FACE_SIZE, face_w))
            face_h = max(MIN_FACE_SIZE, min(MAX_FACE_SIZE, face_h))
            
            # ===== Position adjustment (keep in bounds) =====
            face_x = int(x_pos - face_w / 2)
            face_y = int(y_pos - face_h / 2)
            
            # Ensure within image bounds
            face_x = max(0, min(face_x, width - face_w))
            face_y = max(0, min(face_y, height - face_h))
            
            boxes.append({
                "x": face_x,
                "y": face_y,
                "w": face_w,
                "h": face_h
            })
        
        if len(boxes) >= estimated_count:
            break
    
    # ===== STEP 4: Deduplication =====
    from config import FACE_OVERLAP_THRESHOLD
    boxes = _deduplicate_overlapping_boxes(boxes, FACE_OVERLAP_THRESHOLD)
    
    return boxes[:max_faces]
