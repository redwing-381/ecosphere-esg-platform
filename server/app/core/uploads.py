"""Safe local file upload handling for evidence proofs."""
import secrets
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import ValidationError

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}


def save_proof(file: UploadFile) -> str:
    """Validate type/size and store a proof file, returning its relative path."""
    ext = Path(file.filename or "").suffix.lower()
    if file.content_type not in ALLOWED_TYPES or ext not in ALLOWED_EXTS:
        raise ValidationError("Proof must be a JPG, PNG, WEBP or PDF file")

    data = file.file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise ValidationError(f"File exceeds the {settings.max_upload_mb} MB limit")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_hex(16)}{ext}"
    (upload_dir / name).write_bytes(data)
    return f"{settings.upload_dir}/{name}"
