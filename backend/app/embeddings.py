from __future__ import annotations

from threading import Lock
import math

from .config import get_settings

_model = None
_model_lock = Lock()


def encode_texts(texts: list[str]) -> list[list[float]]:
    """Load the embedding model only on first use and validate output dimensions."""
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
    dimension = get_settings().embedding_dimension
    result = vectors.tolist()
    if len(result) != len(texts) or any(len(row) != dimension for row in result):
        raise RuntimeError("embedding provider returned an unexpected vector shape")
    if any(not math.isfinite(float(value)) for row in result for value in row):
        raise RuntimeError("embedding provider returned non-finite values")
    return result
