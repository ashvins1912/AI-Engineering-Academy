# Stage 04 — Individual lesson lab pack: Transformers, LLMs & Generative AI

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## tokenization — Tokenization and vocabulary

**Implementation task:** Tokenization and vocabulary

**Worked fixture:** Inspect subword token IDs, special tokens, truncation and round-trip behavior.

**Expected result:** Text: 'AI systems learn quickly.' plus a long repeated prompt.

**Verification tests:** Record token IDs/count; truncation never exceeds configured max length.

**Debugging checklist:** Why does token count differ from whitespace word count?

**Interview checks:** Test Unicode, empty text and special-token insertion.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## embeddings — Embeddings and positional information

**Implementation task:** Embeddings and positional information

**Worked fixture:** Inspect embedding lookup and positional contribution for a short token sequence.

**Expected result:** Token IDs [5,8,5], embedding dim=4, positions 0,1,2.

**Verification tests:** Repeated token 5 has same token embedding before position contribution.

**Debugging checklist:** What failure occurs if tokenizer and embedding vocabulary versions differ?

**Interview checks:** Test padding index and position offset.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## attention — Self-attention Q, K and V

**Implementation task:** Self-attention Q, K and V

**Worked fixture:** Calculate scaled dot-product attention by hand for two query/key/value rows.

**Expected result:** Q=K=I₂, V=[[1,0],[0,2]].

**Verification tests:** For first query, weights≈[0.67,0.33], output≈[0.67,0.66].

**Debugging checklist:** Why divide scores by sqrt(d_k)?

**Interview checks:** Test causal mask and stable softmax; masked future weight must be zero.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## multihead — Multi-head attention and transformer blocks

**Implementation task:** Multi-head attention and transformer blocks

**Worked fixture:** Split hidden vectors into heads, attend independently and concatenate.

**Expected result:** Hidden size=4, heads=2; input shape (batch=1,seq=3,hidden=4).

**Verification tests:** Each head has width 2; concatenation restores hidden width 4.

**Debugging checklist:** What can multiple heads represent that one head may not?

**Interview checks:** Test hidden size not divisible by head count and residual shape mismatch.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## decoder — Decoder-only LLMs

**Implementation task:** Decoder-only LLMs

**Worked fixture:** Build next-token shifted labels and prove causal masking blocks future positions.

**Expected result:** Tokens [10,11,12,13], labels shifted one position.

**Verification tests:** Inputs [10,11,12], targets [11,12,13]; no position attends to later tokens.

**Debugging checklist:** Explain prefill vs autoregressive decode.

**Interview checks:** Test mask upper triangle, padding and KV cache equivalence.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## sampling — Generation and decoding

**Implementation task:** Generation and decoding

**Worked fixture:** Sample from logits using greedy, temperature and top-p policies.

**Expected result:** Logits [2,1,0], fixed RNG seed.

**Verification tests:** Greedy chooses token 0; temperature changes distribution; top-p truncates tail.

**Debugging checklist:** Why can temperature not improve factual knowledge?

**Interview checks:** Test temperature near zero, invalid p and stop token.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## finetuning — Fine-tuning and adaptation

**Implementation task:** Fine-tuning and adaptation

**Worked fixture:** Prepare instruction pairs and compare frozen baseline with a tiny adapter experiment.

**Expected result:** Three train examples and two held-out examples; deduplicate exact prompts.

**Verification tests:** Train/eval IDs disjoint; report baseline and adapted metric without claiming significance.

**Debugging checklist:** What does LoRA reduce, and what does it not eliminate?

**Interview checks:** Test duplicate leakage, prompt-format mismatch and adapter load failure.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## inference — Inference engineering

**Implementation task:** Inference engineering

**Worked fixture:** Measure prefill/decode latency and estimate KV cache growth by sequence length.

**Expected result:** Benchmark 128 vs 512 input tokens, fixed output length and concurrency=1.

**Verification tests:** Longer context increases prefill work and cache memory; record p50/p95 and peak memory.

**Debugging checklist:** Which dimensions dominate KV cache memory?

**Interview checks:** Test cancellation, max-token enforcement and overload response.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
