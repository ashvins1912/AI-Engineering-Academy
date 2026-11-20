# Stage 05 — Individual lesson lab pack: RAG, Visual RAG & Knowledge Systems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## ingestion — Build a parser adapter that returns normalized text plus source/page provenance.

**Implementation task:** Two-page PDF: page 1 policy paragraph; page 2 table; include corrupt-file fixture.

**Worked fixture:** Each extracted segment has document_id, page number and parser version.

**Expected result:** Test encrypted/corrupt PDF, scanned page and empty extraction.

**Verification tests:** Why must extraction provenance survive chunking?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## chunking — Compare fixed 5-token chunks with sentence/heading-aware chunks and overlap.

**Implementation task:** Text: 'Refunds apply within 30 days. Exceptions require manager approval.'

**Worked fixture:** Boundary-aware chunks retain the exception with its condition; record offsets.

**Expected result:** Test sentence crossing boundary and chunk overlap >= chunk size.

**Verification tests:** How does overlap trade recall against duplicated context?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## embeddings — Encode two documents and a query; rank using normalized cosine similarity.

**Implementation task:** Docs 'reset password' and 'refund within 30 days'; query 'money back'.

**Worked fixture:** Print vector dimensions and descending similarity ranking; scores are not probabilities.

**Expected result:** Test dimension mismatch and model-version mismatch.

**Verification tests:** Why must query and document vectors share an embedding space?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## vector-db — Create exact cosine baseline then compare approximate index recall.

**Implementation task:** Four normalized vectors in 2-D; query [1,0], top-2.

**Worked fixture:** Exact ranking is reproducible; report ANN Recall@2 against exact baseline.

**Expected result:** Test duplicate IDs, empty index and metadata filter selectivity.

**Verification tests:** What recall/latency trade-off does ANN indexing introduce?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## retrieval — Compare dense, lexical and reciprocal-rank fusion on labeled queries.

**Implementation task:** Corpus has exact policy ID 'POL-17' and paraphrase 'money returned'.

**Worked fixture:** Lexical wins exact ID; dense can win paraphrase; fusion combines rank evidence.

**Expected result:** Test typo, stale document and ACL-restricted item.

**Verification tests:** Why does hybrid retrieval help identifier-heavy corpora?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## generation — Generate an answer only from retrieved evidence and validate citation IDs.

**Implementation task:** Evidence E1 says 30-day refund; E2 says final-sale exception.

**Worked fixture:** Answer cites E1 and E2; unsupported question yields abstention.

**Expected result:** Test fabricated citation, conflicting evidence and injection in document.

**Verification tests:** Why is retrieved text evidence, not trusted instruction?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## reranking — Retrieve top 5 candidates then rerank query-document pairs.

**Implementation task:** One query, 5 passages; relevant passage initially ranked 4th.

**Worked fixture:** Reranker promotes relevant passage; report latency and nDCG change.

**Expected result:** Test truncation, timeout and candidate omission.

**Verification tests:** Why can't reranking recover a document absent from candidates?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## agentic-rag — Add one bounded second retrieval when evidence coverage is insufficient.

**Implementation task:** Question needs policy date and exception; first query finds only date.

**Worked fixture:** Second retrieval finds exception; stop after at most 2 retrieval rounds.

**Expected result:** Test no-result loop and max-iteration enforcement.

**Verification tests:** When is iterative retrieval worth its latency?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## graphrag — Extract entity-relation triples with source span, then answer a two-hop query.

**Implementation task:** Alice worksFor Acme; Acme locatedIn Bengaluru; each edge has evidence ID.

**Worked fixture:** Two-hop path Alice→Acme→Bengaluru with both evidence references.

**Expected result:** Test ambiguous Alice and unsupported relation.

**Verification tests:** Why must graph edges retain provenance and confidence?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## visual-rag — Render a PDF page and link OCR text/table region to page image coordinates.

**Implementation task:** Page with a 2-column table and rotated scan fixture.

**Worked fixture:** OCR output includes page index and bounding box for each selected region.

**Expected result:** Test rotation, low resolution and table cell order.

**Verification tests:** Why can text-only extraction lose diagram/table structure?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## multimodal-rag — Index timestamped transcript segments and sampled video keyframes.

**Implementation task:** Clip transcript at 00:10 and 00:35; sample frames at 00:12 and 00:40.

**Worked fixture:** Retrieved segment links to source time range and frame timestamp.

**Expected result:** Test timestamp drift, silence and repeated frames.

**Verification tests:** How do you preserve synchronization across modalities?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## rag-eval — Build a golden query set with expected evidence IDs and calculate Recall@K.

**Implementation task:** 5 queries, expected evidence sets; one query has no answer.

**Worked fixture:** Report Recall@1/3 and citation precision; no-answer query should abstain.

**Expected result:** Test ACL boundary, stale docs and prompt injection.

**Verification tests:** How do retrieval and answer faithfulness metrics differ?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
