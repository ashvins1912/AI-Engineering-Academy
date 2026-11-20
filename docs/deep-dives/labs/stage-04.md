# Stage 04 — Individual lesson lab pack: Transformers, LLMs & Generative AI

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## tokenization — Tokenization and vocabulary

**Implementation task:** Inspect subword token IDs, special tokens, truncation and round-trip behavior.

**Worked fixture:** Text: 'AI systems learn quickly.' plus a long repeated prompt.

**Expected result:** Record token IDs/count; truncation never exceeds configured max length.

**Verification tests:** Test Unicode, empty text and special-token insertion.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why does token count differ from whitespace word count?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## embeddings — Embeddings and positional information

**Implementation task:** Inspect embedding lookup and positional contribution for a short token sequence.

**Worked fixture:** Token IDs [5,8,5], embedding dim=4, positions 0,1,2.

**Expected result:** Repeated token 5 has same token embedding before position contribution.

**Verification tests:** Test padding index and position offset.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What failure occurs if tokenizer and embedding vocabulary versions differ?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## attention — Self-attention Q, K and V

**Implementation task:** Calculate scaled dot-product attention by hand for two query/key/value rows.

**Worked fixture:** Q=K=I₂, V=[[1,0],[0,2]].

**Expected result:** For first query, weights≈[0.67,0.33], output≈[0.67,0.66].

**Verification tests:** Test causal mask and stable softmax; masked future weight must be zero.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why divide scores by sqrt(d_k)?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## multihead — Multi-head attention and transformer blocks

**Implementation task:** Split hidden vectors into heads, attend independently and concatenate.

**Worked fixture:** Hidden size=4, heads=2; input shape (batch=1,seq=3,hidden=4).

**Expected result:** Each head has width 2; concatenation restores hidden width 4.

**Verification tests:** Test hidden size not divisible by head count and residual shape mismatch.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What can multiple heads represent that one head may not?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## decoder — Decoder-only LLMs

**Implementation task:** Build next-token shifted labels and prove causal masking blocks future positions.

**Worked fixture:** Tokens [10,11,12,13], labels shifted one position.

**Expected result:** Inputs [10,11,12], targets [11,12,13]; no position attends to later tokens.

**Verification tests:** Test mask upper triangle, padding and KV cache equivalence.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Explain prefill vs autoregressive decode.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## sampling — Generation and decoding

**Implementation task:** Sample from logits using greedy, temperature and top-p policies.

**Worked fixture:** Logits [2,1,0], fixed RNG seed.

**Expected result:** Greedy chooses token 0; temperature changes distribution; top-p truncates tail.

**Verification tests:** Test temperature near zero, invalid p and stop token.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why can temperature not improve factual knowledge?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## finetuning — Fine-tuning and adaptation

**Implementation task:** Prepare instruction pairs and compare frozen baseline with a tiny adapter experiment.

**Worked fixture:** Three train examples and two held-out examples; deduplicate exact prompts.

**Expected result:** Train/eval IDs disjoint; report baseline and adapted metric without claiming significance.

**Verification tests:** Test duplicate leakage, prompt-format mismatch and adapter load failure.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What does LoRA reduce, and what does it not eliminate?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## inference — Inference engineering

**Implementation task:** Measure prefill/decode latency and estimate KV cache growth by sequence length.

**Worked fixture:** Benchmark 128 vs 512 input tokens, fixed output length and concurrency=1.

**Expected result:** Longer context increases prefill work and cache memory; record p50/p95 and peak memory.

**Verification tests:** Test cancellation, max-token enforcement and overload response.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Which dimensions dominate KV cache memory?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
