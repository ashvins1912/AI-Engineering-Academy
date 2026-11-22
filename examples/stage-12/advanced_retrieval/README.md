# Stage 12 Topic 3 — Advanced Retrieval and Context Engineering

## Run locally

```bash
python examples/stage-12/advanced_retrieval/retrieval_engine.py
python examples/stage-12/advanced_retrieval/benchmark.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The lab is fully offline. It uses a synthetic two-tenant corpus and fixed three-dimensional vectors so every score can be inspected and reproduced. It does not call an embedding model, hosted reranker, vector database or network service.

## Pipeline

1. Resolve the verified principal outside the query body.
2. Apply tenant, user and group ACL predicates before candidate generation.
3. Compute BM25 lexical scores and cosine dense scores on authorized candidates only.
4. Fuse independent rankings with weighted reciprocal-rank fusion (RRF).
5. Expand a parent context only if the parent independently passes the same ACL.
6. Pack context under an explicit token budget.
7. Return source-version/page/character-span citations; abstain when no authorized evidence is available.
8. Cache only with principal, groups, policy version, query, vector, corpus revision and budgets in the key.

## Numerical walkthrough

For RRF with k=60, a chunk ranked 1st lexically and 3rd densely receives:

`1/(60+1) + 1/(60+3) = 0.032522...`

A chunk ranked 2nd in both lists receives:

`1/62 + 1/62 = 0.032258...`

The first chunk ranks slightly higher. RRF combines rank positions rather than assuming BM25 and cosine scores share a calibrated scale.

For cosine similarity, q=[1,0,0] and d=[0.8,0.6,0] produce:

`(1×0.8 + 0×0.6 + 0×0) / (1×1) = 0.8`

The vector fixture is intentionally tiny; real embeddings are learned representations and must be versioned with the index.

## Failure labs

- **Filter after top-k:** place an unauthorized high-score chunk first. The engine filters it before scoring, so it cannot crowd out authorized evidence.
- **Cache tenant collision:** issue the same query as two tenants; the cache key includes tenant, subject, groups and policy version.
- **Stale index:** change corpus_revision; cached results no longer match the new key.
- **Parent leakage:** a child may be visible while its parent is not; parent text is omitted unless independently authorized.
- **Citation drift:** page, document version and character offsets are carried with every returned chunk.
- **Context overflow:** the packer respects a token budget and does not silently exceed it.
- **No evidence:** return abstained=true with no fabricated citations.

## Metrics

The module implements Recall@K, MRR and NDCG@K. Use a fixed query set with relevance judgments; report metrics by tenant, document type, freshness and query class. A high average must not hide an authorization failure or a poor critical slice.

## Production adapter boundary

`retrieval_service.py` validates request shape and budgets, injects identity from a verified principal and refuses client-controlled identity fields. It is still an adapter around an in-memory teaching engine. A production vector database must apply tenant and ACL predicates in the query before ANN candidate generation/ranking, and must prove equivalent isolation with database integration tests. Evaluate filters, rerankers, chunking and compression against a versioned dataset before promotion.

## Important limitations

- Dense vectors are supplied fixtures, not generated embeddings.
- BM25 is a compact educational implementation, not a drop-in replacement for Lucene/Elasticsearch.
- RRF is a ranking fusion baseline; tune weights and k using held-out judgments.
- The context budget counts whitespace tokens, not a model tokenizer.
- No graph database, ANN index or hosted reranker is provisioned.
