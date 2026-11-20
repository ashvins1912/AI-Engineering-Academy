from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="ACADEMY_", extra="ignore")
    database_url: str = "postgresql+asyncpg://academy:academy@localhost:5432/academy"
    jwt_public_key: str = ""
    jwks_url: str = ""
    max_request_bytes: int = 11 * 1024 * 1024
    jwt_algorithm: str = "RS256"
    jwt_issuer: str = ""
    jwt_audience: str = "ai-engineering-academy"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    embedding_provider: str = "local"
    embedding_api_url: str = ""
    embedding_api_key: str = ""
    embedding_timeout_seconds: int = 20
    generation_enabled: bool = False
    generation_api_url: str = ""
    generation_api_key: str = ""
    generation_model: str = ""
    generation_timeout_seconds: int = 30
    generation_max_tokens: int = 1000
    generation_context_chars: int = 16000
    embedding_device: str = "cpu"
    max_upload_bytes: int = 10 * 1024 * 1024
    max_pdf_pages: int = 50
    max_ocr_pages: int = 20
    max_extracted_chars: int = 500_000
    ocr_enabled: bool = True
    ocr_language: str = "eng"
    ocr_dpi: int = 160
    cors_origins: str = "http://localhost:5173"
    rate_limit_per_minute: int = 20
    storage_backend: str = "local"
    storage_root: str = "./var/private-uploads"
    s3_bucket: str = ""
    s3_kms_key_id: str = ""
    s3_prefix: str = "academy-private"
    s3_endpoint_url: str = ""
    malware_scan_required: bool = False
    clamav_host: str = ""
    clamav_port: int = 3310
    ingestion_job_max_attempts: int = 5
    ingestion_job_lease_seconds: int = 900
    ingestion_max_concurrent_jobs_per_tenant: int = 1

@lru_cache
def get_settings() -> Settings:
    return Settings()
