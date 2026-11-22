import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).parent / "advanced_retrieval"
sys.path.insert(0, str(ROOT))
from retrieval_engine import (
    AccessContext, Chunk, GraphEdge, IndexMigration, Query, Retriever,
    assemble_context, compress_evidence, cosine, filter_before_ranking,
    graph_expand, late_interaction_score, mean_reciprocal_rank, plan_query,
    recall_at_k, reciprocal_rank_fusion, retrieval_cache_key,
)
from retrieval_gateway import RetrievalGateway


def chunk(chunk_id="a-1", doc_id="doc-A", tenant="tenant-A", text="Retention policy keeps records for 90 days.",
          subjects=frozenset({"user-A"}), roles=frozenset(), valid_from="2020-01-01",
          expires_at=None, vector=(1.0, 0.0), token_vectors=((1.0, 0.0),)):
    return Chunk(chunk_id, doc_id, tenant, "v3", text, 4, 100, 180,
                 subjects, roles, valid_from, expires_at, vector, token_vectors)


class AccessFilterTests(unittest.TestCase):
    def setUp(self):
        self.access = AccessContext("tenant-A", "user-A", frozenset(), frozenset({"doc-A"}), "2026-11-22")

    def test_tenant_and_document_acl_filter_before_ranking(self):
        allowed = chunk()
        cross_tenant = chunk("b-1", "doc-B", "tenant-B", "Retention policy keeps records for 900 days.",
                             frozenset({"user-B"}))
        wrong_doc = chunk("a-2", "doc-C", "tenant-A")
        retriever = Retriever()
        hits, rejected = retriever.retrieve(Query("retention policy", vector=(1.0, 0.0)),
                                             [allowed, cross_tenant, wrong_doc], self.access)
        self.assertEqual([hit.chunk.chunk_id for hit in hits], ["a-1"])
        self.assertEqual(rejected, 2)
        self.assertEqual(retriever.last_ranked_candidates, ("a-1",))
        self.assertNotIn("b-1", retriever.last_ranked_candidates)

    def test_role_acl_and_subject_acl(self):
        role_chunk = chunk("role-1", subjects=frozenset(), roles=frozenset({"legal"}))
        denied = chunk("private-1", subjects=frozenset({"other-user"}))
        access = AccessContext("tenant-A", "user-A", frozenset({"legal"}),
                               frozenset({"doc-A"}), "2026-11-22")
        eligible, rejected = filter_before_ranking([role_chunk, denied], access)
        self.assertEqual([item.chunk_id for item in eligible], ["role-1"])
        self.assertEqual(rejected, 1)

    def test_temporal_validity_filters_future_and_expired_chunks(self):
        future = chunk("future", valid_from="2027-01-01")
        expired = chunk("expired", expires_at="2026-01-01")
        eligible, rejected = filter_before_ranking([chunk(), future, expired], self.access)
        self.assertEqual([item.chunk_id for item in eligible], ["a-1"])
        self.assertEqual(rejected, 2)


class RankingTests(unittest.TestCase):
    def test_lexical_dense_hybrid_and_late_interaction(self):
        a = chunk("a", text="retention policy 90 days", vector=(1.0, 0.0),
                  token_vectors=((1.0, 0.0), (0.0, 1.0)))
        b = chunk("b", text="unrelated finance", vector=(0.0, 1.0),
                  token_vectors=((0.0, 1.0),))
        access = AccessContext("tenant-A", "user-A", frozenset(), frozenset({"doc-A"}), "2026-11-22")
        query = Query("retention policy", vector=(1.0, 0.0),
                      token_vectors=((1.0, 0.0), (0.0, 1.0)))
        retriever = Retriever()
        for strategy in ("lexical", "dense", "hybrid", "late-interaction"):
            hits, _ = retriever.retrieve(query, [a, b], access, strategy, 2)
            self.assertEqual(hits[0].chunk.chunk_id, "a")

    def test_cosine_and_late_interaction_numerics(self):
        self.assertAlmostEqual(cosine((1.0, 0.0), (1.0, 0.0)), 1.0)
        self.assertAlmostEqual(cosine((1.0, 0.0), (0.0, 1.0)), 0.0)
        score = late_interaction_score(((1.0, 0.0), (0.0, 1.0)),
                                       ((1.0, 0.0), (0.0, 1.0)))
        self.assertAlmostEqual(score, 1.0)

    def test_reciprocal_rank_fusion(self):
        fused = reciprocal_rank_fusion([["a", "b"], ["b", "a"]], k0=10)
        self.assertAlmostEqual(fused["a"], fused["b"])
        self.assertGreater(fused["a"], 0)

    def test_reranker_reorders_with_exact_phrase_evidence(self):
        access = AccessContext("tenant-A", "user-A", frozenset(), frozenset({"doc-A"}), "2026-11-22")
        q = Query("retention policy")
        hits, _ = Retriever().retrieve(q, [
            chunk("a", text="Retention policy keeps records for 90 days."),
            chunk("b", text="A finance note mentions a policy for retention indirectly.")
        ], access, "lexical", 2)
        reranked = Retriever.rerank(q, hits, 2)
        self.assertEqual(reranked[0].chunk.chunk_id, "a")


class ContextAndGraphTests(unittest.TestCase):
    def setUp(self):
        self.access = AccessContext("tenant-A", "user-A", frozenset(), frozenset({"doc-A"}), "2026-11-22")
        self.query = Query("legal hold deletion")

    def test_context_compression_preserves_exact_source_sentences_and_citation(self):
        source = chunk(text="A legal hold pauses deletion until released. Unrelated billing notes are stored separately.")
        hit = Retriever().retrieve(self.query, [source], self.access, "lexical")[0][0]
        evidence = compress_evidence(hit, self.query, 12)
        self.assertIsNotNone(evidence)
        self.assertEqual(evidence.text, "A legal hold pauses deletion until released.")
        self.assertEqual(evidence.citation.doc_id, "doc-A")
        self.assertEqual(evidence.citation.version, "v3")
        self.assertEqual(evidence.citation.page, 4)
        self.assertEqual(evidence.citation.start_offset, 100)

    def test_context_budget_is_enforced(self):
        source = chunk(text="Legal hold pauses deletion. Legal hold needs review. Deletion is suspended.")
        hits, _ = Retriever().retrieve(self.query, [source], self.access, "lexical")
        evidence = assemble_context(hits, self.query, 5)
        self.assertLessEqual(sum(len(item.text.split()) for item in evidence), 5)

    def test_graph_expansion_rechecks_acl(self):
        seed = chunk("seed", text="legal hold policy")
        allowed = chunk("edge-safe", text="legal hold approval process")
        forbidden = chunk("edge-private", "doc-B", "tenant-B", "secret unrelated content",
                          frozenset({"user-B"}))
        hits = [type("Hit", (), {"chunk": seed, "score": 1.0, "strategy": "dense"})()]
        expanded = graph_expand(hits, [
            GraphEdge("seed", "references", "target-safe", "edge-safe"),
            GraphEdge("seed", "references", "target-private", "edge-private"),
        ], {c.chunk_id: c for c in [seed, allowed, forbidden]}, self.access, 1)
        self.assertEqual({hit.chunk.chunk_id for hit in expanded}, {"seed", "edge-safe"})

    def test_graph_hop_limit_is_bounded(self):
        with self.assertRaisesRegex(ValueError, "GRAPH_HOPS_OUT_OF_RANGE"):
            graph_expand([], [], {}, self.access, 4)


class CacheMigrationMetricsTests(unittest.TestCase):
    def setUp(self):
        self.query = Query("current retention policy")
        self.access = AccessContext("tenant-A", "user-A", frozenset({"legal"}),
                                    frozenset({"doc-A"}), "2026-11-22")

    def key(self, access=None, index="idx-v1", policy="p1"):
        return retrieval_cache_key(self.query, access or self.access, model_version="m1",
                                   embedding_version="e1", index_version=index, policy_version=policy)

    def test_cache_key_isolation_across_tenant_acl_and_versions(self):
        base = self.key()
        other_tenant = AccessContext("tenant-B", "user-A", frozenset({"legal"}),
                                     frozenset({"doc-A"}), "2026-11-22")
        other_acl = AccessContext("tenant-A", "user-A", frozenset(),
                                  frozenset({"doc-B"}), "2026-11-22")
        self.assertNotEqual(base, self.key(other_tenant))
        self.assertNotEqual(base, self.key(other_acl))
        self.assertNotEqual(base, self.key(index="idx-v2"))
        self.assertNotEqual(base, self.key(policy="p2"))

    def test_index_migration_blocks_bad_overlap_and_supports_rollback(self):
        migration = IndexMigration("idx-v1", "idx-v2", min_overlap=0.75)
        migration.observe(["a", "b", "c"], ["a", "x", "y"])
        with self.assertRaisesRegex(ValueError, "INDEX_MIGRATION_QUALITY_GATE_FAILED"):
            migration.promote()
        good = IndexMigration("idx-v1", "idx-v2", min_overlap=0.75)
        good.observe(["a", "b", "c"], ["a", "b", "c", "d"])
        self.assertEqual(good.promote(), "idx-v2")
        self.assertEqual(good.rollback(), "idx-v1")

    def test_retrieval_metrics(self):
        self.assertAlmostEqual(recall_at_k(["a", "x", "b"], {"a", "b"}, 2), 0.5)
        self.assertAlmostEqual(mean_reciprocal_rank([["x", "a"], ["b"]], [{"a"}, {"b"}]), 0.75)

    def test_query_planner_flags_freshness_and_graph(self):
        plan = plan_query("Find the latest policy and what it depends on")
        self.assertTrue(plan.require_fresh)
        self.assertTrue(plan.graph_expansion)
        self.assertEqual(plan.strategy, "hybrid")


class GatewayTests(unittest.TestCase):
    def test_gateway_returns_only_authorized_evidence(self):
        access = AccessContext("tenant-A", "user-A", frozenset(), frozenset({"doc-A"}), "2026-11-22")
        chunks = [chunk(), chunk("bad", "doc-B", "tenant-B", "retention policy 900 days",
                                 frozenset({"user-B"}))]
        decision = RetrievalGateway("policy-v4").search(Query("retention policy", vector=(1.0, 0.0)),
                                                         chunks, access)
        self.assertEqual([hit.chunk.chunk_id for hit in decision.hits], ["a-1"])
        self.assertEqual(decision.rejected_before_ranking, 1)
        self.assertEqual(decision.policy_version, "policy-v4")


if __name__ == "__main__":
    unittest.main()
