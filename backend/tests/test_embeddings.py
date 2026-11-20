import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import httpx

from app.embeddings import (
    EmbeddingProviderFailed, EmbeddingProviderUnavailable, encode_texts_async,
)


class RemoteEmbeddingTests(unittest.TestCase):
    def settings(self, **overrides):
        values = dict(embedding_provider="http", embedding_api_url="https://embed.test/v1/embeddings",
                      embedding_api_key="test-secret", embedding_model="test-embed",
                      embedding_timeout_seconds=2, embedding_dimension=2)
        values.update(overrides)
        return SimpleNamespace(**values)

    def test_empty_input_does_not_call_provider(self):
        self.assertEqual(asyncio.run(encode_texts_async([])), [])

    def test_remote_embeddings_are_sorted_by_index_and_shape_checked(self):
        def handler(request):
            self.assertEqual(request.headers["Authorization"], "Bearer test-secret")
            return httpx.Response(200, json={"data": [
                {"index": 1, "embedding": [0.0, 1.0]},
                {"index": 0, "embedding": [1.0, 0.0]},
            ]})
        with patch("app.embeddings.get_settings", return_value=self.settings()):
            result = asyncio.run(encode_texts_async(["first", "second"], httpx.MockTransport(handler)))
        self.assertEqual(result, [[1.0, 0.0], [0.0, 1.0]])

    def test_remote_embedding_dimension_mismatch_fails(self):
        def handler(request):
            return httpx.Response(200, json={"data": [{"index": 0, "embedding": [1.0, 0.0, 2.0]}]})
        with patch("app.embeddings.get_settings", return_value=self.settings()):
            with self.assertRaises(EmbeddingProviderFailed):
                asyncio.run(encode_texts_async(["query"], httpx.MockTransport(handler)))

    def test_remote_embedding_missing_credentials_fails_closed(self):
        with patch("app.embeddings.get_settings", return_value=self.settings(embedding_api_key="")):
            with self.assertRaises(EmbeddingProviderUnavailable):
                asyncio.run(encode_texts_async(["query"]))

    def test_unknown_provider_is_rejected(self):
        with patch("app.embeddings.get_settings", return_value=self.settings(embedding_provider="unknown")):
            with self.assertRaises(EmbeddingProviderUnavailable):
                asyncio.run(encode_texts_async(["query"]))

    def test_remote_embedding_http_failure_is_sanitized(self):
        def handler(request):
            return httpx.Response(503, text="secret provider diagnostic")
        with patch("app.embeddings.get_settings", return_value=self.settings()):
            with self.assertRaisesRegex(EmbeddingProviderFailed, "request failed"):
                asyncio.run(encode_texts_async(["query"], httpx.MockTransport(handler)))


if __name__ == "__main__":
    unittest.main()
