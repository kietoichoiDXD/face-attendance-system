#!/usr/bin/env python3
"""
Comprehensive test for multi-face detection and matching
Tests with large group sizes (30-40 students)
"""

import base64
import io
from PIL import Image
from main import app

def create_test_image(width: int, height: int, color=(100, 120, 140)):
    """Create a test JPEG image"""
    img = Image.new('RGB', (width, height), color)
    b = io.BytesIO()
    img.save(b, format='JPEG', quality=95)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

def main():
    c = app.test_client()
    
    print("=" * 60)
    print("MULTI-FACE DETECTION TEST (AI Engineer Edition)")
    print("=" * 60)
    
    # ===== PHASE 1: Register 30 students =====
    print("\n[PHASE 1] Registering 30 students...")
    
    class_id = "CNTT-K44-01"
    student_names = [
        "Trần Văn A", "Trần Thị B", "Phạm Văn C", "Hoàng Thị D", "Nguyễn Văn E",
        "Lê Thị F", "Đỗ Văn G", "Vũ Thị H", "Bùi Văn I", "Đinh Thị J",
        "Tạ Văn K", "Hà Thị L", "Quy Văn M", "Lý Thị N", "Giang Văn O",
        "Khương Thị P", "Hữu Văn Q", "Khánh Thị R", "Sơn Văn S", "Hương Thị T",
        "Dũng Văn U", "Duyên Thị V", "Hiệu Văn W", "Linh Thị X", "Tuyết Văn Y",
        "Iris Thị Z", "Tấn Văn AA", "Hải Thị AB", "Minh Văn AC", "Hồng Thị AD"
    ]
    
    image = create_test_image(100, 100)
    registered = 0
    
    for idx, name in enumerate(student_names):
        student_id = f"SV{2000 + idx + 1}"
        r = c.post(f'/students/{student_id}/face', json={
            'name': name,
            'class_id': class_id,
            'image': image
        })
        if r.status_code == 200:
            registered += 1
    
    print(f"✓ Registered: {registered}/{len(student_names)} students")
    
    # ===== PHASE 2: Test different image sizes =====
    test_cases = [
        (300, 200, "Small (300x200) - Will be upscaled"),
        (800, 600, "Medium (800x600) - Optimal"),
        (1200, 900, "Large (1200x900) - Will be downscaled"),
        (1600, 1200, "Extra-Large (1600x1200) - Aggressive downscale"),
    ]
    
    print("\n[PHASE 2] Testing multi-face detection with different sizes...\n")
    
    for width, height, description in test_cases:
        test_image = create_test_image(width, height, (80+width//100, 100+height//100, 120))
        
        r = c.post(f'/classes/{class_id}/attendance', json={
            'image': test_image,
            'threshold': 0.72  # Using new lower threshold
        })
        
        if r.status_code != 200:
            print(f"✗ {description}")
            print(f"  Error: {r.status_code}")
            continue
        
        result = r.get_json()
        
        print(f"✓ {description}")
        print(f"  Faces detected: {result.get('total_faces')} / {result.get('total_students')} students")
        print(f"  Students recognized: {result.get('present_count')}")
        print(f"  Recognition rate: {result.get('present_count') / result.get('total_students', 1) * 100:.1f}%")
        
        # Show top 5 recognized students
        recognized = result.get('recognized_students', [])[:5]
        if recognized:
            print(f"  Top recognitions:")
            for student in recognized:
                print(f"    - {student['name']}: {student['confidence']:.2f} confidence")
        
        print()
    
    # ===== PHASE 3: Analyze detection distribution =====
    print("[PHASE 3] Analysis Summary\n")
    
    # Test with standard Medium size for final analysis
    analysis_image = create_test_image(1000, 750, (120, 140, 160))
    r = c.post(f'/classes/{class_id}/attendance', json={
        'image': analysis_image,
        'threshold': 0.72
    })
    
    if r.status_code == 200:
        result = r.get_json()
        
        print(f"Standard test (1000x750):")
        print(f"  Total faces detected: {result.get('total_faces')}")
        print(f"  Students recognized: {result.get('present_count')}")
        print(f"  Recognition coverage: {result.get('present_count')}/{result.get('total_students')} = {result.get('present_count')/result.get('total_students')*100:.1f}%")
        print(f"\n  Distribution by confidence:")
        
        confidences = [s['confidence'] for s in result.get('recognized_students', [])]
        if confidences:
            print(f"    Min: {min(confidences):.2f}")
            print(f"    Max: {max(confidences):.2f}")
            print(f"    Avg: {sum(confidences)/len(confidences):.2f}")
        
        print(f"\n  Recognized students:")
        for student in sorted(result.get('recognized_students', []), 
                             key=lambda s: s['confidence'], reverse=True)[:15]:
            print(f"    {student['name']:<20} {student['confidence']:.2f}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETED")
    print("=" * 60)

if __name__ == '__main__':
    main()
