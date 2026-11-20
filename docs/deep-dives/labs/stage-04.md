# Stage 04 — Individual lesson lab pack: Transformers, LLMs & Generative AI

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## tokenization — Inspect subword token IDs, special tokens, truncation and round-trip behavior.

**Implementation task:** Text: 'AI systems learn quickly.' plus a long repeated prompt.

**Worked fixture:** Record token IDs/count; truncation never exceeds configured max length.

**Expected result:** Test Unicode, empty text and special-token insertion.

**Verification tests:** Why does token count differ from whitespace word count?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## embeddings — Inspect embedding lookup and positional contribution for a short token sequence.

**Implementation task:** Token IDs [5,8,5], embedding dim=4, positions 0,1,2.

**Worked fixture:** Repeated token 5 has same token embedding before position contribution.

**Expected result:** Test padding index and position offset.

**Verification tests:** What failure occurs if tokenizer and embedding vocabulary versions differ?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## attention — Calculate scaled dot-product attention by hand for two query/key/value rows.

**Implementation task:** Q=K=I₂, V=[[1,0],[0,2]].

**Worked fixture:** For first query, weights≈[0.67,0.33], output≈[0.67,0.66].

**Expected result:** Test causal mask and stable softmax; masked future weight must be zero.

**Verification tests:** Why divide scores by sqrt(d_k)?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## multihead — Split hidden vectors into heads, attend independently and concatenate.

**Implementation task:** Hidden size=4, heads=2; input shape (batch=1,seq=3,hidden=4).

**Worked fixture:** Each head has width 2; concatenation restores hidden width 4.

**Expected result:** Test hidden size not divisible by head count and residual shape mismatch.

**Verification tests:** What can multiple heads represent that one head may not?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## decoder — Build next-token shifted labels and prove causal masking blocks future positions.

**Implementation task:** Tokens [10,11,12,13], labels shifted one position.

**Worked fixture:** Inputs [10,11,12], targets [11,12,13]; no position attends to later tokens.

**Expected result:** Test mask upper triangle, padding and KV cache equivalence.

**Verification tests:** Explain prefill vs autoregressive decode.

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## sampling — Sample from logits using greedy, temperature and top-p policies.

**Implementation task:** Logits [2,1,0], fixed RNG seed.

**Worked fixture:** Greedy chooses token 0; temperature changes distribution; top-p truncates tail.

**Expected result:** Test temperature near zero, invalid p and stop token.

**Verification tests:** Why can temperature not improve factual knowledge?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## finetuning — Prepare instruction pairs and compare frozen baseline with a tiny adapter experiment.

**Implementation task:** Three train examples and two held-out examples; deduplicate exact prompts.

**Worked fixture:** Train/eval IDs disjoint; report baseline and adapted metric without claiming significance.

**Expected result:** Test duplicate leakage, prompt-format mismatch and adapter load failure.

**Verification tests:** What does LoRA reduce, and what does it not eliminate?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## inference — Measure prefill/decode latency and estimate KV cache growth by sequence length.

**Implementation task:** Benchmark 128 vs 512 input tokens, fixed output length and concurrency=1.

**Worked fixture:** Longer context increases prefill work and cache memory; record p50/p95 and peak memory.

**Expected result:** Test cancellation, max-token enforcement and overload response.

**Verification tests:** Which dimensions dominate KV cache memory?

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
