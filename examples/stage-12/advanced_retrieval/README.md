# Stage 12 Topic 3 — Advanced retrieval and context engineering

An offline retrieval benchmark for lexical, dense, hybrid RRF and late-interaction scoring, with ACL-before-ranking, temporal filtering, graph evidence expansion, reranking, provenance-preserving compression, cache-key isolation and index migration gates.

## Run

```bash
python examples/stage-12/advanced_retrieval/retrieval_engine.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

## Important invariants

- Tenant, document ACL and temporal predicates are applied before any retrieval scoring.
- Graph expansion re-checks the ACL of every evidence chunk; graph edges are not authority.
- Citations preserve document ID, immutable version, page and source offsets.
- Compression selects exact source sentences; it does not generate replacement facts.
- Cache keys include tenant, subject, roles, allowed documents, freshness date, model, embedding, index and policy versions.
- Index promotion requires a measured shadow-overlap gate and supports rollback.

The vectors and ranking scores are synthetic. This lab does not benchmark a real vector database or model and does not certify retrieval quality on production data.
