"""Production-shaped boundary around the deterministic retrieval engine.

Replace the in-memory corpus and precomputed vectors with a database/vector
adapter only if it can push tenant and ACL predicates into the candidate query.
"""
from __future__ import annotations

from retrieval_engine import HybridRetriever, Principal


class RetrievalRequestError(ValueError):
    pass


class AuthorizedRetrievalService:
    def __init__(self, retriever: HybridRetriever, *, max_top_k: int = 10,
                 max_context_tokens: int = 1200):
        self.retriever = retriever
        self.max_top_k = max_top_k
        self.max_context_tokens = max_context_tokens
        self._cache = {}

    def query(self, verified_principal: Principal, payload: dict) -> dict:
        # Identity/tenant are injected by the authentication layer. Reject
        # attempts to override them in the user-controlled request body.
        if "tenant_id" in payload or "subject" in payload or "groups" in payload:
            raise RetrievalRequestError("IDENTITY_FIELDS_MUST_NOT_BE_CLIENT_CONTROLLED")
        query = payload.get("query")
        vector = payload.get("query_vector")
        top_k = payload.get("top_k", 5)
        budget = payload.get("context_budget", 300)
        if not isinstance(query, str) or not query.strip():
            raise RetrievalRequestError("QUERY_REQUIRED")
        if not isinstance(vector, list) or not vector or any(isinstance(v, bool) or not isinstance(v, (int, float)) for v in vector):
            raise RetrievalRequestError("QUERY_VECTOR_REQUIRED")
        if not isinstance(top_k, int) or isinstance(top_k, bool) or not 1 <= top_k <= self.max_top_k:
            raise RetrievalRequestError("TOP_K_OUT_OF_RANGE")
        if not isinstance(budget, int) or isinstance(budget, bool) or not 1 <= budget <= self.max_context_tokens:
            raise RetrievalRequestError("CONTEXT_BUDGET_OUT_OF_RANGE")
        result = self.retriever.search(verified_principal, query, vector,
                                       top_k=top_k, context_budget=budget,
                                       cache=self._cache)
        return {
            "abstained": result.abstained,
            "corpus_revision": result.corpus_revision,
            "context": result.context,
            "citations": [
                {"chunk_id": item.chunk_id, "document_id": item.document_id,
                 "document_version": item.document_version, "page": item.page,
                 "start_char": item.start_char, "end_char": item.end_char}
                for item in result.citations
            ],
        }
