from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="ACADEMY_", extra="ignore")
    database_url: str = "postgresql+asyncpg://academy:academy@localhost:5432/academy"
    jwt_public_key: str = ""
    jwt_algorithm: str = "RS256"
    jwt_issuer: str = ""
    jwt_audience: str = "ai-engineering-academy"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
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

@lru_cache
def get_settings() -> Settings:
    return Settings()
