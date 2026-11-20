from __future__ import annotations

import os
from pathlib import Path, PurePosixPath
from typing import Protocol
from uuid import uuid4


class StorageError(RuntimeError):
    pass


class PrivateObjectStore(Protocol):
    def put(self, key: str, data: bytes) -> None: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...


def _validate_key(key: str) -> str:
    path = PurePosixPath(key)
    if not key or path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts) or "\\" in key:
        raise StorageError("invalid object key")
    return str(path)


class LocalPrivateObjectStore:
    """Local development adapter; use an encrypted private object store in production."""

    def __init__(self, root: str | Path):
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(self.root, 0o700)

    def _path(self, key: str) -> Path:
        safe = _validate_key(key)
        target = (self.root / safe).resolve()
        if self.root not in target.parents:
            raise StorageError("object key escapes private storage root")
        return target

    def put(self, key: str, data: bytes) -> None:
        if not data:
            raise StorageError("empty objects are not accepted")
        target = self._path(key)
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        temporary = target.with_name(target.name + "." + uuid4().hex + ".tmp")
        try:
            descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, target)
            os.chmod(target, 0o600)
        finally:
            if temporary.exists():
                temporary.unlink()

    def get(self, key: str) -> bytes:
        target = self._path(key)
        try:
            return target.read_bytes()
        except FileNotFoundError:
            raise StorageError("object not found") from None

    def delete(self, key: str) -> None:
        target = self._path(key)
        try:
            target.unlink()
        except FileNotFoundError:
            return


class S3PrivateObjectStore:
    """S3-compatible adapter requiring server-side KMS encryption and a private bucket."""

    def __init__(self, bucket: str, kms_key_id: str, prefix: str = "", endpoint_url: str = ""):
        if not bucket or not kms_key_id:
            raise StorageError("S3 bucket and KMS key ID are required")
        try:
            import boto3
        except ImportError:
            raise StorageError("boto3 is required for S3 storage") from None
        self.bucket = bucket
        self.kms_key_id = kms_key_id
        self.prefix = prefix.strip("/")
        self.client = boto3.client("s3", endpoint_url=endpoint_url or None)

    def _key(self, key: str) -> str:
        safe = _validate_key(key)
        return f"{self.prefix}/{safe}" if self.prefix else safe

    def put(self, key: str, data: bytes) -> None:
        try:
            self.client.put_object(Bucket=self.bucket, Key=self._key(key), Body=data,
                                   ServerSideEncryption="aws:kms", SSEKMSKeyId=self.kms_key_id)
        except Exception:
            raise StorageError("private object write failed") from None

    def get(self, key: str) -> bytes:
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=self._key(key))
            return response["Body"].read()
        except Exception:
            raise StorageError("private object read failed") from None

    def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=self._key(key))
        except Exception:
            raise StorageError("private object delete failed") from None


def create_object_store(settings) -> PrivateObjectStore:
    if settings.storage_backend == "local":
        return LocalPrivateObjectStore(settings.storage_root)
    if settings.storage_backend == "s3":
        return S3PrivateObjectStore(settings.s3_bucket, settings.s3_kms_key_id,
                                    settings.s3_prefix, settings.s3_endpoint_url)
    raise StorageError("storage backend must be local or s3")
