import json
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).parent / "advanced_retrieval"
sys.path.insert(0, str(ROOT))
from retrieval_engine import (
    Chunk, HybridRetriever, Principal, bm25_scores, cosine_similarity,
    decompose_query, graph_neighbors, ndcg_at_k, recall_at_k, reciprocal_rank, rerank_by_term_overlap,
    reciprocal_rank_fusion,
)
from retrieval_service import AuthorizedRetrievalService, RetrievalRequestError


def chunk(chunk_id, tenant="A", text="retention policy", vector=(1.0, 0.0),
          users=frozenset(), groups=frozenset(), parent=None, page=1):
    return Chunk(chunk_id, tenant, chunk_id, "v1", text, page, 0, len(text),
                 tuple(vector), users, groups, parent)


class RetrievalScoringTests(unittest.TestCase):
    def test_cosine_similarity_known_value(self):
        self.assertAlmostEqual(cosine_similarity((1, 0, 0), (0.8, 0.6, 0)), 0.8)

    def test_cosine_rejects_dimension_mismatch(self):
        with self.assertRaisesRegex(ValueError, "EMBEDDING_DIMENSION_MISMATCH"):
            cosine_similarity((1, 0), (1, 0, 0))

    def test_zero_vector_returns_zero_similarity(self):
        self.assertEqual(cosine_similarity((0, 0), (1, 0)), 0.0)

    def test_bm25_rewards_matching_terms(self):
        docs = [chunk("match", text="retention policy audit"), chunk("other", text="vector database index")]
        scores = bm25_scores("retention policy", docs)
        self.assertGreater(scores["match"], scores["other"])

    def test_bm25_empty_query_returns_empty_scores(self):
        self.assertEqual(bm25_scores("   ", [chunk("a")]), {})

    def test_rrf_uses_rank_positions_not_raw_scores(self):
        fused = reciprocal_rank_fusion([["a", "b"], ["b", "a"]], k=60)
        self.assertAlmostEqual(fused["a"], fused["b"])

    def test_rrf_rejects_invalid_configuration(self):
        with self.assertRaisesRegex(ValueError, "RRF_K_MUST_BE_POSITIVE"):
            reciprocal_rank_fusion([["a"]], k=0)
        with self.assertRaisesRegex(ValueError, "INVALID_RRF_WEIGHTS"):
            reciprocal_rank_fusion([["a"]], weights=(1, 2))


class AuthorizationAndIsolationTests(unittest.TestCase):
    def setUp(self):
        self.principal = Principal("alice", "A", frozenset({"analysts"}))
        self.chunks = [
            chunk("allowed", "A", "retention policy audit logs", (1, 0)),
            chunk("other-tenant", "B", "retention policy secret", (1, 0)),
            chunk("other-user", "A", "retention policy legal hold", (1, 0), frozenset({"legal"})),
            chunk("group-only", "A", "audit logs for analysts", (0.8, 0.2), groups=frozenset({"analysts"})),
        ]
        self.retriever = HybridRetriever(self.chunks, corpus_revision="v1")

    def test_tenant_filter_happens_before_ranking(self):
        result = self.retriever.search(self.principal, "retention policy", (1, 0), top_k=10)
        ids = {hit.chunk.chunk_id for hit in result.hits}
        self.assertNotIn("other-tenant", ids)
        self.assertTrue(all(hit.chunk.tenant_id == "A" for hit in result.hits))

    def test_user_acl_is_enforced(self):
        result = self.retriever.search(self.principal, "legal hold", (1, 0), top_k=10)
        self.assertNotIn("other-user", {hit.chunk.chunk_id for hit in result.hits})

    def test_group_acl_is_enforced(self):
        result = self.retriever.search(self.principal, "analysts audit", (0.8, 0.2), top_k=10)
        self.assertIn("group-only", {hit.chunk.chunk_id for hit in result.hits})

    def test_cache_isolated_by_tenant_and_subject(self):
        cache = {}
        tenant_a = self.retriever.search(self.principal, "retention policy", (1, 0), cache=cache)
        tenant_b = self.retriever.search(Principal("bob", "B"), "retention policy", (1, 0), cache=cache)
        self.assertFalse(tenant_a.cache_hit)
        self.assertFalse(tenant_b.cache_hit)
        self.assertTrue(all(hit.chunk.tenant_id == "B" for hit in tenant_b.hits))
        self.assertNotEqual({h.chunk.chunk_id for h in tenant_a.hits},
                            {h.chunk.chunk_id for h in tenant_b.hits})

    def test_cache_key_includes_policy_version(self):
        cache = {}
        first = self.retriever.search(self.principal, "retention policy", (1, 0), cache=cache)
        second_principal = Principal("alice", "A", frozenset({"analysts"}), policy_version="2")
        second = self.retriever.search(second_principal, "retention policy", (1, 0), cache=cache)
        self.assertFalse(first.cache_hit)
        self.assertFalse(second.cache_hit)

    def test_corpus_revision_invalidates_cache(self):
        cache = {}
        self.retriever.search(self.principal, "retention policy", (1, 0), cache=cache)
        updated = HybridRetriever(self.chunks, corpus_revision="v2")
        result = updated.search(self.principal, "retention policy", (1, 0), cache=cache)
        self.assertFalse(result.cache_hit)
        self.assertEqual(result.corpus_revision, "v2")

    def test_no_authorized_evidence_abstains(self):
        result = self.retriever.search(Principal("unknown", "Z"), "retention policy", (1, 0))
        self.assertTrue(result.abstained)
        self.assertEqual(result.hits, ())
        self.assertEqual(result.citations, ())

    def test_zero_similarity_and_no_lexical_match_abstains(self):
        result = self.retriever.search(self.principal, "unrelated", (0, 0), top_k=10)
        self.assertTrue(result.abstained)

    def test_parent_context_is_independently_authorized(self):
        parent = chunk("parent", "A", "confidential parent text", (0, 1), frozenset({"legal"}))
        child = chunk("child", "A", "retention child evidence", (1, 0), frozenset({"alice"}), parent="parent")
        retriever = HybridRetriever([parent, child], corpus_revision="parent-test")
        result = retriever.search(self.principal, "retention child", (1, 0), top_k=1)
        self.assertEqual(result.hits[0].chunk.chunk_id, "child")
        self.assertIsNone(result.hits[0].parent_context)
        self.assertNotIn("confidential parent text", result.context)

    def test_citation_preserves_version_page_and_offsets(self):
        result = self.retriever.search(self.principal, "retention policy", (1, 0), top_k=1)
        citation = result.citations[0]
        self.assertEqual(citation.document_version, "v1")
        self.assertGreaterEqual(citation.page, 1)
        self.assertEqual((citation.start_char, citation.end_char), (0, len(citation.quote)))

    def test_graph_neighbor_expansion_rechecks_acl(self):
        visible = chunk("visible", "A", "visible source", (1, 0), frozenset({"alice"}))
        allowed = chunk("allowed-neighbor", "A", "allowed linked evidence", (1, 0), frozenset({"alice"}))
        forbidden = chunk("forbidden-neighbor", "B", "secret linked evidence", (1, 0), frozenset({"bob"}))
        visible = Chunk(**{**visible.__dict__, "related_ids": ("allowed-neighbor", "forbidden-neighbor")})
        result = graph_neighbors(["visible"], [visible, allowed, forbidden], self.principal)
        self.assertEqual([item.chunk_id for item in result], ["allowed-neighbor"])

    def test_graph_neighbor_limit_is_bounded(self):
        with self.assertRaisesRegex(ValueError, "GRAPH_NEIGHBOR_LIMIT_INVALID"):
            graph_neighbors([], [], self.principal, max_neighbors=21)

    def test_reranker_preserves_authorized_hits(self):
        hits = list(self.retriever.search(self.principal, "legal hold", (1, 0), top_k=10).hits)
        reranked = rerank_by_term_overlap("legal hold", hits)
        self.assertTrue(all(item.chunk.tenant_id == "A" for item in reranked))
        self.assertEqual(reranked, rerank_by_term_overlap("legal hold", hits))
    def test_context_budget_is_not_exceeded(self):
        result = self.retriever.search(self.principal, "retention policy", (1, 0),
                                       top_k=10, context_budget=3)
        token_count = len(result.context.split())
        self.assertLessEqual(token_count, 3)

    def test_invalid_query_and_budget_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "QUERY_REQUIRED"):
            self.retriever.search(self.principal, " ", (1, 0))
        with self.assertRaisesRegex(ValueError, "INVALID_RETRIEVAL_BUDGET"):
            self.retriever.search(self.principal, "retention", (1, 0), top_k=0)


class EvaluationAndServiceTests(unittest.TestCase):
    def test_retrieval_metrics(self):
        retrieved = ["a", "x", "b"]
        relevant = {"a", "b"}
        self.assertEqual(recall_at_k(retrieved, relevant, 2), 0.5)
        self.assertEqual(reciprocal_rank(retrieved, relevant), 1.0)
        self.assertGreater(ndcg_at_k(retrieved, relevant, 3), 0.9)
        self.assertGreater(ndcg_at_k(["a", "b"], {"a": 3.0, "b": 1.0}, 2), 0.99)

    def test_query_decomposition_is_deterministic(self):
        self.assertEqual(decompose_query("retention and audit also access"),
                         ["retention", "audit", "access"])

    def test_service_rejects_client_identity_override(self):
        retriever = HybridRetriever([chunk("a")], corpus_revision="v1")
        service = AuthorizedRetrievalService(retriever)
        with self.assertRaisesRegex(RetrievalRequestError, "IDENTITY_FIELDS_MUST_NOT_BE_CLIENT_CONTROLLED"):
            service.query(Principal("alice", "A"), {"query": "retention", "query_vector": [1, 0], "tenant_id": "B"})

    def test_service_enforces_top_k_and_context_budget(self):
        service = AuthorizedRetrievalService(HybridRetriever([chunk("a")], corpus_revision="v1"),
                                              max_top_k=3, max_context_tokens=20)
        principal = Principal("alice", "A")
        with self.assertRaisesRegex(RetrievalRequestError, "TOP_K_OUT_OF_RANGE"):
            service.query(principal, {"query": "retention", "query_vector": [1, 0], "top_k": 4})
        with self.assertRaisesRegex(RetrievalRequestError, "CONTEXT_BUDGET_OUT_OF_RANGE"):
            service.query(principal, {"query": "retention", "query_vector": [1, 0], "context_budget": 21})

    def test_service_uses_verified_principal_and_returns_citations(self):
        service = AuthorizedRetrievalService(HybridRetriever([chunk("a")], corpus_revision="v1"))
        result = service.query(Principal("alice", "A"),
                               {"query": "retention", "query_vector": [1, 0]})
        self.assertFalse(result["abstained"])
        self.assertEqual(result["citations"][0]["chunk_id"], "a")


if __name__ == "__main__":
    unittest.main()
