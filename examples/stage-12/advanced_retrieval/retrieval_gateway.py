"""Authorization-aware production boundary for retrieval adapters."""
from dataclasses import dataclass

from retrieval_engine import AccessContext, Chunk, Query, Retriever, RetrievalHit


@dataclass(frozen=True)
class RetrievalDecision:
    hits: tuple[RetrievalHit, ...]
    rejected_before_ranking: int
    policy_version: str


class RetrievalGateway:
    def __init__(self, policy_version: str, retriever: Retriever | None = None):
        self.policy_version = policy_version
        self.retriever = retriever or Retriever()

    def search(self, query: Query, chunks: list[Chunk], access: AccessContext,
               strategy: str = "hybrid", top_k: int = 5) -> RetrievalDecision:
        hits, rejected = self.retriever.retrieve(query, chunks, access, strategy, top_k)
        # Defense in depth: every returned chunk is checked again before context assembly.
        safe = tuple(hit for hit in hits if (
            hit.chunk.tenant_id == access.tenant_id
            and hit.chunk.doc_id in access.allowed_doc_ids
            and (not hit.chunk.allowed_subjects and not hit.chunk.allowed_roles
                 or access.subject in hit.chunk.allowed_subjects
                 or bool(access.roles & hit.chunk.allowed_roles))
            and hit.chunk.valid_from <= access.as_of
            and (hit.chunk.expires_at is None or access.as_of < hit.chunk.expires_at)
        ))
        return RetrievalDecision(safe, rejected + len(hits) - len(safe), self.policy_version)
