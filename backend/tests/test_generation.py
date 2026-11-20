import asyncio
import json
from types import SimpleNamespace
import unittest

import httpx

from app.generation import (
    GenerationFailed, GenerationUnavailable, OpenAICompatibleProvider,
    generate_grounded_answer,
)


class FakeProvider:
    model = "fake-test-model"
    def __init__(self, payload):
        self.payload = payload
        self.messages = None
    async def complete(self, messages, max_tokens):
        self.messages = messages
        return self.payload


class GroundedGenerationTests(unittest.TestCase):
    def setUp(self):
        self.evidence = [{"source_id": "c1", "document_id": "d1", "page_number": 3,
                          "text": "Express shipping takes two business days."}]

    def test_valid_answer_requires_exact_retrieved_citation(self):
        provider = FakeProvider(json.dumps({
            "answer": "Express shipping takes two business days.",
            "citations": [{"source_id": "c1", "quote": "two business days"}],
            "abstain": False,
        }))
        result = asyncio.run(generate_grounded_answer("How long is express shipping?", self.evidence, provider))
        self.assertFalse(result["abstained"])
        self.assertEqual(result["citations"][0]["page_number"], 3)
        self.assertEqual(result["citations"][0]["document_id"], "d1")

    def test_no_evidence_abstains_without_provider_call(self):
        provider = FakeProvider("{}")
        result = asyncio.run(generate_grounded_answer("question", [], provider))
        self.assertTrue(result["abstained"])
        self.assertEqual(result["reason"], "no_retrieved_evidence")
        self.assertIsNone(provider.messages)

    def test_provider_abstention_is_preserved(self):
        provider = FakeProvider(json.dumps({"answer": "", "citations": [], "abstain": True}))
        result = asyncio.run(generate_grounded_answer("question", self.evidence, provider))
        self.assertTrue(result["abstained"])
        self.assertEqual(result["reason"], "provider_abstained")

    def test_fabricated_source_forces_abstention(self):
        provider = FakeProvider(json.dumps({
            "answer": "The policy says free shipping.",
            "citations": [{"source_id": "other", "quote": "free shipping"}],
            "abstain": False,
        }))
        result = asyncio.run(generate_grounded_answer("question", self.evidence, provider))
        self.assertTrue(result["abstained"])
        self.assertEqual(result["reason"], "citation_validation_failed")
        self.assertEqual(result["answer"], "")

    def test_fabricated_quote_forces_abstention(self):
        provider = FakeProvider(json.dumps({
            "answer": "The policy says free shipping.",
            "citations": [{"source_id": "c1", "quote": "free shipping"}],
            "abstain": False,
        }))
        result = asyncio.run(generate_grounded_answer("question", self.evidence, provider))
        self.assertTrue(result["abstained"])

    def test_invalid_provider_json_is_rejected(self):
        with self.assertRaisesRegex(GenerationFailed, "invalid JSON"):
            asyncio.run(generate_grounded_answer("question", self.evidence, FakeProvider("not json")))

    def test_invalid_provider_schema_is_rejected(self):
        with self.assertRaisesRegex(GenerationFailed, "schema"):
            asyncio.run(generate_grounded_answer("question", self.evidence, FakeProvider(json.dumps({"answer": 7}))))

    def test_prompt_marks_retrieved_content_as_untrusted(self):
        provider = FakeProvider(json.dumps({"answer": "", "citations": [], "abstain": True}))
        asyncio.run(generate_grounded_answer("question", self.evidence, provider))
        self.assertIn("untrusted data", provider.messages[0]["content"])
        self.assertIn("Express shipping", provider.messages[1]["content"])

    def test_provider_disabled_fails_closed(self):
        settings = SimpleNamespace(generation_enabled=False, generation_api_url="", generation_api_key="",
                                   generation_model="", generation_timeout_seconds=2)
        provider = OpenAICompatibleProvider(settings)
        with self.assertRaises(GenerationUnavailable):
            asyncio.run(provider.complete([], 10))

    def test_openai_compatible_provider_sends_json_mode_and_bearer_auth(self):
        settings = SimpleNamespace(generation_enabled=True, generation_api_url="https://llm.test/v1/chat/completions",
                                   generation_api_key="test-secret", generation_model="test-model",
                                   generation_timeout_seconds=3)
        def handler(request):
            self.assertEqual(request.headers["Authorization"], "Bearer test-secret")
            body = json.loads(request.content)
            self.assertEqual(body["response_format"], {"type": "json_object"})
            return httpx.Response(200, json={"choices": [{"message": {"content": '{"answer":"","citations":[],"abstain":true}'}}]})
        provider = OpenAICompatibleProvider(settings, transport=httpx.MockTransport(handler))
        result = asyncio.run(provider.complete([{"role": "user", "content": "hi"}], 10))
        self.assertIn('"abstain":true', result)


if __name__ == "__main__":
    unittest.main()
