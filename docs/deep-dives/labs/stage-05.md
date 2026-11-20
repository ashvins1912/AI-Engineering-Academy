# Stage 05 — Individual lesson lab pack: RAG, Visual RAG & Knowledge Systems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## ingestion — Document ingestion and parsing

**Implementation task:** Build a parser adapter that returns normalized text plus source/page provenance.

**Worked fixture:** Two-page PDF: page 1 policy paragraph; page 2 table; include corrupt-file fixture.

**Expected result:** Each extracted segment has document_id, page number and parser version.

**Verification tests:** Test encrypted/corrupt PDF, scanned page and empty extraction.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why must extraction provenance survive chunking?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## chunking — Chunking strategies

**Implementation task:** Compare fixed 5-token chunks with sentence/heading-aware chunks and overlap.

**Worked fixture:** Text: 'Refunds apply within 30 days. Exceptions require manager approval.'

**Expected result:** Boundary-aware chunks retain the exception with its condition; record offsets.

**Verification tests:** Test sentence crossing boundary and chunk overlap >= chunk size.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How does overlap trade recall against duplicated context?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## rag-embeddings — Embedding models and vector spaces

**Implementation task:** Encode two documents and a query; rank using normalized cosine similarity.

**Worked fixture:** Docs 'reset password' and 'refund within 30 days'; query 'money back'.

**Expected result:** Print vector dimensions and descending similarity ranking; scores are not probabilities.

**Verification tests:** Test dimension mismatch and model-version mismatch.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why must query and document vectors share an embedding space?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## vector-db — Vector indexes and databases

**Implementation task:** Create exact cosine baseline then compare approximate index recall.

**Worked fixture:** Four normalized vectors in 2-D; query [1,0], top-2.

**Expected result:** Exact ranking is reproducible; report ANN Recall@2 against exact baseline.

**Verification tests:** Test duplicate IDs, empty index and metadata filter selectivity.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What recall/latency trade-off does ANN indexing introduce?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## retrieval — Retrieval strategies

**Implementation task:** Compare dense, lexical and reciprocal-rank fusion on labeled queries.

**Worked fixture:** Corpus has exact policy ID 'POL-17' and paraphrase 'money returned'.

**Expected result:** Lexical wins exact ID; dense can win paraphrase; fusion combines rank evidence.

**Verification tests:** Test typo, stale document and ACL-restricted item.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why does hybrid retrieval help identifier-heavy corpora?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## generation — Grounded answer generation

**Implementation task:** Generate an answer only from retrieved evidence and validate citation IDs.

**Worked fixture:** Evidence E1 says 30-day refund; E2 says final-sale exception.

**Expected result:** Answer cites E1 and E2; unsupported question yields abstention.

**Verification tests:** Test fabricated citation, conflicting evidence and injection in document.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why is retrieved text evidence, not trusted instruction?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## reranking — Reranking and relevance optimization

**Implementation task:** Retrieve top 5 candidates then rerank query-document pairs.

**Worked fixture:** One query, 5 passages; relevant passage initially ranked 4th.

**Expected result:** Reranker promotes relevant passage; report latency and nDCG change.

**Verification tests:** Test truncation, timeout and candidate omission.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why can't reranking recover a document absent from candidates?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## agentic-rag — Adaptive and agentic RAG

**Implementation task:** Add one bounded second retrieval when evidence coverage is insufficient.

**Worked fixture:** Question needs policy date and exception; first query finds only date.

**Expected result:** Second retrieval finds exception; stop after at most 2 retrieval rounds.

**Verification tests:** Test no-result loop and max-iteration enforcement.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** When is iterative retrieval worth its latency?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## graphrag — GraphRAG and knowledge graphs

**Implementation task:** Extract entity-relation triples with source span, then answer a two-hop query.

**Worked fixture:** Alice worksFor Acme; Acme locatedIn Bengaluru; each edge has evidence ID.

**Expected result:** Two-hop path Alice→Acme→Bengaluru with both evidence references.

**Verification tests:** Test ambiguous Alice and unsupported relation.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why must graph edges retain provenance and confidence?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## visual-rag — Visual RAG for PDFs and images

**Implementation task:** Render a PDF page and link OCR text/table region to page image coordinates.

**Worked fixture:** Page with a 2-column table and rotated scan fixture.

**Expected result:** OCR output includes page index and bounding box for each selected region.

**Verification tests:** Test rotation, low resolution and table cell order.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why can text-only extraction lose diagram/table structure?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## multimodal-rag — Audio and video RAG

**Implementation task:** Index timestamped transcript segments and sampled video keyframes.

**Worked fixture:** Clip transcript at 00:10 and 00:35; sample frames at 00:12 and 00:40.

**Expected result:** Retrieved segment links to source time range and frame timestamp.

**Verification tests:** Test timestamp drift, silence and repeated frames.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How do you preserve synchronization across modalities?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## rag-eval — RAG evaluation and optimization

**Implementation task:** Build a golden query set with expected evidence IDs and calculate Recall@K.

**Worked fixture:** 5 queries, expected evidence sets; one query has no answer.

**Expected result:** Report Recall@1/3 and citation precision; no-answer query should abstain.

**Verification tests:** Test ACL boundary, stale docs and prompt injection.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How do retrieval and answer faithfulness metrics differ?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
