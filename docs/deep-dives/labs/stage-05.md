# Stage 05 — Individual lesson lab pack: RAG, Visual RAG & Knowledge Systems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## ingestion — Document ingestion and parsing

**Implementation task:** Document ingestion and parsing

**Worked fixture:** Build a parser adapter that returns normalized text plus source/page provenance.

**Expected result:** Two-page PDF: page 1 policy paragraph; page 2 table; include corrupt-file fixture.

**Verification tests:** Each extracted segment has document_id, page number and parser version.

**Debugging checklist:** Why must extraction provenance survive chunking?

**Interview checks:** Test encrypted/corrupt PDF, scanned page and empty extraction.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## chunking — Chunking strategies

**Implementation task:** Chunking strategies

**Worked fixture:** Compare fixed 5-token chunks with sentence/heading-aware chunks and overlap.

**Expected result:** Text: 'Refunds apply within 30 days. Exceptions require manager approval.'

**Verification tests:** Boundary-aware chunks retain the exception with its condition; record offsets.

**Debugging checklist:** How does overlap trade recall against duplicated context?

**Interview checks:** Test sentence crossing boundary and chunk overlap >= chunk size.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## embeddings — Embedding models and vector spaces

**Implementation task:** Embedding models and vector spaces

**Worked fixture:** Encode two documents and a query; rank using normalized cosine similarity.

**Expected result:** Docs 'reset password' and 'refund within 30 days'; query 'money back'.

**Verification tests:** Print vector dimensions and descending similarity ranking; scores are not probabilities.

**Debugging checklist:** Why must query and document vectors share an embedding space?

**Interview checks:** Test dimension mismatch and model-version mismatch.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## vector-db — Vector indexes and databases

**Implementation task:** Vector indexes and databases

**Worked fixture:** Create exact cosine baseline then compare approximate index recall.

**Expected result:** Four normalized vectors in 2-D; query [1,0], top-2.

**Verification tests:** Exact ranking is reproducible; report ANN Recall@2 against exact baseline.

**Debugging checklist:** What recall/latency trade-off does ANN indexing introduce?

**Interview checks:** Test duplicate IDs, empty index and metadata filter selectivity.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## retrieval — Retrieval strategies

**Implementation task:** Retrieval strategies

**Worked fixture:** Compare dense, lexical and reciprocal-rank fusion on labeled queries.

**Expected result:** Corpus has exact policy ID 'POL-17' and paraphrase 'money returned'.

**Verification tests:** Lexical wins exact ID; dense can win paraphrase; fusion combines rank evidence.

**Debugging checklist:** Why does hybrid retrieval help identifier-heavy corpora?

**Interview checks:** Test typo, stale document and ACL-restricted item.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## generation — Grounded answer generation

**Implementation task:** Grounded answer generation

**Worked fixture:** Generate an answer only from retrieved evidence and validate citation IDs.

**Expected result:** Evidence E1 says 30-day refund; E2 says final-sale exception.

**Verification tests:** Answer cites E1 and E2; unsupported question yields abstention.

**Debugging checklist:** Why is retrieved text evidence, not trusted instruction?

**Interview checks:** Test fabricated citation, conflicting evidence and injection in document.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## reranking — Reranking and relevance optimization

**Implementation task:** Reranking and relevance optimization

**Worked fixture:** Retrieve top 5 candidates then rerank query-document pairs.

**Expected result:** One query, 5 passages; relevant passage initially ranked 4th.

**Verification tests:** Reranker promotes relevant passage; report latency and nDCG change.

**Debugging checklist:** Why can't reranking recover a document absent from candidates?

**Interview checks:** Test truncation, timeout and candidate omission.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## agentic-rag — Adaptive and agentic RAG

**Implementation task:** Adaptive and agentic RAG

**Worked fixture:** Add one bounded second retrieval when evidence coverage is insufficient.

**Expected result:** Question needs policy date and exception; first query finds only date.

**Verification tests:** Second retrieval finds exception; stop after at most 2 retrieval rounds.

**Debugging checklist:** When is iterative retrieval worth its latency?

**Interview checks:** Test no-result loop and max-iteration enforcement.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## graphrag — GraphRAG and knowledge graphs

**Implementation task:** GraphRAG and knowledge graphs

**Worked fixture:** Extract entity-relation triples with source span, then answer a two-hop query.

**Expected result:** Alice worksFor Acme; Acme locatedIn Bengaluru; each edge has evidence ID.

**Verification tests:** Two-hop path Alice→Acme→Bengaluru with both evidence references.

**Debugging checklist:** Why must graph edges retain provenance and confidence?

**Interview checks:** Test ambiguous Alice and unsupported relation.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## visual-rag — Visual RAG for PDFs and images

**Implementation task:** Visual RAG for PDFs and images

**Worked fixture:** Render a PDF page and link OCR text/table region to page image coordinates.

**Expected result:** Page with a 2-column table and rotated scan fixture.

**Verification tests:** OCR output includes page index and bounding box for each selected region.

**Debugging checklist:** Why can text-only extraction lose diagram/table structure?

**Interview checks:** Test rotation, low resolution and table cell order.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## multimodal-rag — Audio and video RAG

**Implementation task:** Audio and video RAG

**Worked fixture:** Index timestamped transcript segments and sampled video keyframes.

**Expected result:** Clip transcript at 00:10 and 00:35; sample frames at 00:12 and 00:40.

**Verification tests:** Retrieved segment links to source time range and frame timestamp.

**Debugging checklist:** How do you preserve synchronization across modalities?

**Interview checks:** Test timestamp drift, silence and repeated frames.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## rag-eval — RAG evaluation and optimization

**Implementation task:** RAG evaluation and optimization

**Worked fixture:** Build a golden query set with expected evidence IDs and calculate Recall@K.

**Expected result:** 5 queries, expected evidence sets; one query has no answer.

**Verification tests:** Report Recall@1/3 and citation precision; no-answer query should abstain.

**Debugging checklist:** How do retrieval and answer faithfulness metrics differ?

**Interview checks:** Test ACL boundary, stale docs and prompt injection.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
