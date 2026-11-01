import os
import io
import time
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image, ImageChops, ImageEnhance
import numpy as np
import cv2

ELA_ARTIFACTS_DIR = os.path.abspath("backend/uploads/ela_artifacts")
os.makedirs(ELA_ARTIFACTS_DIR, exist_ok=True)

SUPPORTED_IMAGE_MIMES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png"
}

def compute_error_level_analysis(
    image: Image.Image,
    resave_quality: int = 90,
    scale: float = 15.0
) -> Tuple[float, float, float, float, Image.Image]:
    """
    Computes Error Level Analysis (ELA) on a Pillow RGB image.
    Returns: (mean_error, max_error, high_error_ratio_percent, block_max_std, ela_visual_image)
    """
    # 1. Convert to RGB
    im_rgb = image.convert("RGB")

    # 2. Resave to memory buffer at specified quality
    buf = io.BytesIO()
    im_rgb.save(buf, format="JPEG", quality=resave_quality)
    buf.seek(0)
    resaved = Image.open(buf)

    # 3. Compute absolute difference array
    orig_arr = np.array(im_rgb, dtype=np.float32)
    resaved_arr = np.array(resaved, dtype=np.float32)
    diff = np.abs(orig_arr - resaved_arr)

    # 4. Quantitative Metrics
    mean_err = float(np.mean(diff))
    max_err = float(np.max(diff))
    high_error_ratio = float(np.sum(diff > 25) / diff.size) * 100.0

    # 5. Local Patch Analysis (16x16 blocks) to detect localized spliced regions
    h, w, c = diff.shape
    block_size = 16
    block_stds = []
    for y in range(0, h - block_size, block_size):
        for x in range(0, w - block_size, block_size):
            patch = diff[y:y+block_size, x:x+block_size]
            block_stds.append(float(np.std(patch)))
    
    block_max_std = float(max(block_stds)) if block_stds else 0.0

    # 6. Generate amplified ELA visual representation for reviewer inspection
    ela_amplified = np.clip(diff * scale, 0, 255).astype(np.uint8)
    ela_image = Image.fromarray(ela_amplified)

    return mean_err, max_err, high_error_ratio, block_max_std, ela_image

def analyze_document_image(
    file_path: str,
    mime_type: str,
    original_name: str = ""
) -> Dict[str, Any]:
    """
    Performs image tampering and compression integrity analysis on document evidence.
    Returns structured analysis record with explainable indicators.
    """
    display_name = original_name or os.path.basename(file_path)

    # Check file existence
    if not os.path.exists(file_path):
        return {
            "document_name": display_name,
            "status": "Warning",
            "is_suspicious": False,
            "mean_error": None,
            "max_error": None,
            "high_error_ratio": None,
            "details": f"File not accessible on storage: {file_path}",
            "ela_artifact_url": None,
            "requires_human_verification": True,
            "disclaimer": "File could not be opened for forensic analysis."
        }

    # Only raster images (JPEG, JPG, PNG) support ELA
    ext = os.path.splitext(file_path)[1].lower()
    is_image = mime_type in SUPPORTED_IMAGE_MIMES or ext in [".jpg", ".jpeg", ".png"]

    if not is_image:
        return {
            "document_name": display_name,
            "status": "Not Applicable",
            "is_suspicious": False,
            "mean_error": None,
            "max_error": None,
            "high_error_ratio": None,
            "details": f"Document is '{mime_type}' (non-raster format). ELA forensic analysis applies exclusively to photographic/raster JPEG/PNG attachments.",
            "ela_artifact_url": None,
            "requires_human_verification": False,
            "disclaimer": "ELA analysis is applicable only to raster images."
        }

    try:
        pil_im = Image.open(file_path)
        mean_err, max_err, high_ratio, block_std, ela_im = compute_error_level_analysis(pil_im)

        # Save ELA visualization artifact
        clean_name = f"ela_{int(time.time())}_{os.path.basename(file_path)}"
        if not clean_name.lower().endswith(".jpg"):
            clean_name += ".jpg"
        ela_out_path = os.path.join(ELA_ARTIFACTS_DIR, clean_name)
        ela_im.save(ela_out_path, format="JPEG", quality=95)
        ela_relative_url = f"/uploads/ela_artifacts/{clean_name}"

        # Evaluate tampering threshold
        # Tampered/spliced images exhibit sharp localized compression divergence (high block_std or high max_err with high_ratio)
        is_suspicious = (high_ratio > 0.005 and max_err >= 35.0) or (block_std > 20.0 and max_err >= 30.0)

        if is_suspicious:
            status = "Warning"
            details = (
                f"Localized compression inconsistencies detected (Mean Error: {mean_err:.2f}, "
                f"Peak Error: {max_err:.1f}, High-Discrepancy Ratio: {high_ratio:.3f}%, Block StdDev: {block_std:.1f}). "
                f"Indicates possible digital modification, cut-and-paste alteration, or multi-source image splicing."
            )
        else:
            status = "Pass"
            details = (
                f"Uniform compression error levels observed across image surface (Mean Error: {mean_err:.2f}, "
                f"Peak Error: {max_err:.1f}). No localized editing anomalies or spliced pixel clusters detected."
            )

        return {
            "document_name": display_name,
            "file_path": file_path,
            "status": status,
            "is_suspicious": is_suspicious,
            "mean_error": round(mean_err, 3),
            "max_error": round(max_err, 1),
            "high_error_ratio": round(high_ratio, 3),
            "block_max_std": round(block_std, 1),
            "details": details,
            "ela_artifact_url": ela_relative_url,
            "requires_human_verification": is_suspicious,
            "disclaimer": (
                "STATUTORY FORENSIC NOTICE: Error Level Analysis (ELA) highlights compression differentials and "
                "is an analytical decision-support indicator only. It does NOT independently establish legal proof of fraud or forgery. "
                "Physical inspection of original records by authorized Scrutiny Officers is required."
            )
        }

    except Exception as e:
        return {
            "document_name": display_name,
            "status": "Warning",
            "is_suspicious": False,
            "mean_error": None,
            "max_error": None,
            "high_error_ratio": None,
            "details": f"Image processing error or corrupted raster payload: {str(e)}",
            "ela_artifact_url": None,
            "requires_human_verification": True,
            "disclaimer": "Corrupted or unreadable image attachment requires manual reviewer inspection."
        }

