"""
Supabase Storage Server-Side Service
Manages direct server-side uploads of media files and Base64 images to Supabase Storage.
Used by backend endpoints and background migration utilities without exposing secrets to frontend.
"""

import base64
import hashlib
from io import BytesIO
import mimetypes
import os
import time
import urllib.request
import urllib.error
from typing import Optional, Tuple
from PIL import Image, UnidentifiedImageError
from backend.app.config import settings

def is_supabase_storage_configured() -> bool:
    """Check if Supabase Storage environment credentials are set."""
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def get_public_url(file_path: str, bucket: Optional[str] = None) -> str:
    """Construct the public CDN URL for a file in the Supabase Storage bucket."""
    bucket_name = bucket or settings.SUPABASE_STORAGE_BUCKET
    clean_path = file_path.lstrip("/")
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{clean_path}"


def parse_data_url(data_url: str) -> Tuple[bytes, str, str]:
    """
    Parse a Base64 data URL string into raw bytes, mime type, and appropriate extension.
    Example: 'data:image/jpeg;base64,...' -> (bytes, 'image/jpeg', '.jpg')
    """
    if not data_url.startswith("data:"):
        raise ValueError("Provided string is not a valid data URL")

    header, encoded = data_url.split(",", 1)
    mime_type = "image/jpeg"
    if ";" in header:
        meta = header.split(";")[0]
        if ":" in meta:
            mime_type = meta.split(":")[1]

    ext_map = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
    }
    ext = ext_map.get(mime_type, mimetypes.guess_extension(mime_type) or ".jpg")
    data_bytes = base64.b64decode(encoded)
    return data_bytes, mime_type, ext


def optimize_image_bytes(
    raw_bytes: bytes,
    max_dimension: int = 1600,
    quality: int = 80
) -> Tuple[bytes, str, str]:
    """
    Step 39: Validates image bytes, resizes if larger than max_dimension,
    and converts photographic formats to WebP.
    """
    try:
        img = Image.open(BytesIO(raw_bytes))
        img.verify()
        img = Image.open(BytesIO(raw_bytes))

        # Preserve transparency for RGBA / LA modes
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            processed = img.convert("RGBA")
        else:
            processed = img.convert("RGB")

        # Downscale if exceeding max_dimension
        if processed.width > max_dimension or processed.height > max_dimension:
            processed.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

        out = BytesIO()
        processed.save(out, format="WEBP", quality=quality, method=6)
        return out.getvalue(), "image/webp", ".webp"
    except Exception:
        # Fallback to original bytes if not a standard raster image
        return raw_bytes, "image/jpeg", ".jpg"


def upload_bytes_to_storage(
    data: bytes,
    file_path: str,
    content_type: str = "image/jpeg",
    bucket: Optional[str] = None,
    upsert: bool = True
) -> str:
    """
    Uploads raw binary bytes to a Supabase Storage bucket using service role authorization.
    Returns the public URL of the uploaded object.
    """
    if not is_supabase_storage_configured():
        raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in backend settings")

    bucket_name = bucket or settings.SUPABASE_STORAGE_BUCKET
    clean_path = file_path.lstrip("/")
    endpoint = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket_name}/{clean_path}"

    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": content_type,
        "x-upsert": "true" if upsert else "false",
    }

    req = urllib.request.Request(
        url=endpoint,
        data=data,
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status in (200, 201):
                return get_public_url(clean_path, bucket_name)
            raise RuntimeError(f"Supabase Storage returned unexpected HTTP status: {resp.status}")
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Supabase Storage HTTP {e.code} error: {error_msg}") from e
    except Exception as e:
        raise RuntimeError(f"Failed to upload object to Supabase Storage: {str(e)}") from e


def upload_base64_image_to_storage(
    data_url: str,
    folder: str = "uploads",
    filename_prefix: str = "img",
    bucket: Optional[str] = None,
    optimize: bool = True,
    custom_path: Optional[str] = None
) -> str:
    """
    Takes a data URL (or returns existing HTTP URL untouched), decodes it, optimizes it to WebP
    with max dimension 1600px, uploads to Supabase Storage, and returns the public CDN URL.
    """
    # If already a hosted URL (http/https), no need to upload
    if isinstance(data_url, str) and (data_url.startswith("http://") or data_url.startswith("https://")):
        return data_url

    if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
        return data_url

    data_bytes, mime_type, ext = parse_data_url(data_url)

    if optimize:
        data_bytes, mime_type, ext = optimize_image_bytes(data_bytes, max_dimension=1600, quality=80)

    if custom_path:
        file_path = custom_path.lstrip("/")
    else:
        # Generate content-hash-based filename for deduplication & cache efficiency
        content_hash = hashlib.sha256(data_bytes).hexdigest()[:16]
        timestamp = int(time.time())
        filename = f"{filename_prefix}_{timestamp}_{content_hash}{ext}"
        clean_folder = folder.strip("/")
        file_path = f"{clean_folder}/{filename}" if clean_folder else filename

    return upload_bytes_to_storage(
        data=data_bytes,
        file_path=file_path,
        content_type=mime_type,
        bucket=bucket
    )
