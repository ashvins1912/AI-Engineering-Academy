from __future__ import annotations

from threading import Lock
import math

import httpx
from starlette.concurrency import run_in_threadpool

from .config import get_settings

_model = None
_model_lock = Lock()


class EmbeddingProviderUnavailable(RuntimeError):
    pass


class EmbeddingProviderFailed(RuntimeError):
    pass


def _validate_vectors(vectors, expected_count: int, dimension: int) -> list[list[float]]:
    result = [[float(value) for value in row] for row in vectors]
    if len(result) != expected_count or any(len(row) != dimension for row in result):
        raise EmbeddingProviderFailed("embedding provider returned an unexpected vector shape")
    if any(not math.isfinite(value) for row in result for value in row):
        raise EmbeddingProviderFailed("embedding provider returned non-finite values")
    return result


def encode_texts(texts: list[str]) -> list[list[float]]:
    """Local SentenceTransformers adapter; load only when explicitly selected."""
    if not texts:
        return []
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer
                settings = get_settings()
                _model = SentenceTransformer(settings.embedding_model, device=settings.embedding_device)
    vectors = _model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return _validate_vectors(vectors.tolist(), len(texts), get_settings().embedding_dimension)


async def encode_texts_async(
    texts: list[str],
    transport: httpx.AsyncBaseTransport | None = None,
) -> list[list[float]]:
    if not texts:
        return []
    settings = get_settings()
    if settings.embedding_provider == "local":
        return await run_in_threadpool(encode_texts, texts)
    if settings.embedding_provider != "http":
        raise EmbeddingProviderUnavailable("embedding provider must be local or http")
    if not settings.embedding_api_url or not settings.embedding_api_key:
        raise EmbeddingProviderUnavailable("remote embedding endpoint and API key are required")
    headers = {"Authorization": f"Bearer {settings.embedding_api_key}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=settings.embedding_timeout_seconds, transport=transport) as client:
            response = await client.post(settings.embedding_api_url, headers=headers,
                                         json={"model": settings.embedding_model, "input": texts})
            response.raise_for_status()
            rows = response.json()["data"]
        rows = sorted(rows, key=lambda row: int(row.get("index", 0)))
        vectors = [row["embedding"] for row in rows]
        return _validate_vectors(vectors, len(texts), settings.embedding_dimension)
    except (EmbeddingProviderUnavailable, EmbeddingProviderFailed):
        raise
    except Exception:
        raise EmbeddingProviderFailed("remote embedding request failed") from None
