# Stage 04 — Individual lesson lab pack: Transformers, LLMs & Generative AI

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## tokenization — Tokenization and vocabulary

**Implementation task:** Inspect subword token IDs and special tokens; apply ordered BPE merges with tokenize_bpe and compare with the greedy longest-piece baseline.

**Worked fixture:** Text: 'AI systems learn quickly.' plus a long repeated prompt.

**Expected result:** Record token IDs/count; truncation never exceeds configured max length.

**Verification tests:** Test Unicode, empty text, merge-rank order, token budget, unknown piece and special-token insertion.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why does token count differ from whitespace word count?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## embeddings — Embeddings and positional information

**Implementation task:** Inspect embedding lookup, absolute positional contribution and RoPE pair rotation with apply_rope.

**Worked fixture:** Token IDs [5,8,5], embedding dim=4, positions 0,1,2.

**Expected result:** Repeated token 5 has same token embedding before position contribution.

**Verification tests:** Test padding index, position offset, even hidden width and RoPE norm preservation.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What failure occurs if tokenizer and embedding vocabulary versions differ?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## attention — Self-attention Q, K and V

**Implementation task:** Calculate scaled dot-product attention by hand, then run full-sequence multi-head attention with causal and non-causal masks.

**Worked fixture:** Q=K=I₂, V=[[1,0],[0,2]].

**Expected result:** For first query, weights≈[0.67,0.33], output≈[0.67,0.66].

**Verification tests:** Test causal mask, stable softmax, multi-head shape, head divisibility and zero future-token weights.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why divide scores by sqrt(d_k)?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## multihead — Multi-head attention and transformer blocks

**Implementation task:** Run multi_head_attention and transformer_block; inspect per-head weights, residual-normalization outputs and FFN dimensions.

**Worked fixture:** Hidden size=4, heads=2; input shape (batch=1,seq=3,hidden=4).

**Expected result:** Each head has width 2; concatenation restores hidden width 4.

**Verification tests:** Test hidden size not divisible by head count, residual shape mismatch, FFN projection mismatch and causal future leakage.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What can multiple heads represent that one head may not?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## decoder — Decoder-only LLMs

**Implementation task:** Build next-token shifted labels and implement generate_autoregressive with a KV-cache position trace and explicit stop reason.

**Worked fixture:** Tokens [10,11,12,13], labels shifted one position.

**Expected result:** Inputs [10,11,12], targets [11,12,13]; no position attends to later tokens.

**Verification tests:** Test mask upper triangle, padding, cache-position growth, missing transition and max-token/stop-token behavior.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Explain prefill vs autoregressive decode.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## sampling — Generation and decoding

**Implementation task:** Sample from logits using greedy, temperature, top-k and top-p policies; compare deterministic seeds and candidate sets.

**Worked fixture:** Logits [2,1,0], fixed RNG seed.

**Expected result:** Greedy chooses token 0; temperature changes distribution; top-p truncates tail.

**Verification tests:** Test zero/negative temperature, invalid top-k/top-p, non-finite logits, deterministic seed and stop token.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why can temperature not improve factual knowledge?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## finetuning — Fine-tuning and adaptation

**Implementation task:** Prepare instruction pairs, calculate LoRA adapter parameter counts and compare frozen baseline with a tiny adapter feasibility plan.

**Worked fixture:** Three train examples and two held-out examples; deduplicate exact prompts.

**Expected result:** Train/eval IDs disjoint; report baseline and adapted metric without claiming significance.

**Verification tests:** Test duplicate leakage, prompt-format mismatch, rank/shape mismatch, adapter load failure and train/eval separation.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What does LoRA reduce, and what does it not eliminate?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## inference — Inference engineering

**Implementation task:** Estimate weight, KV-cache and activation memory with estimate_inference_memory; define prefill/decode latency and concurrency measurements.

**Worked fixture:** Benchmark 128 vs 512 input tokens, fixed output length and concurrency=1.

**Expected result:** Longer context increases prefill work and cache memory; record p50/p95 and peak memory.

**Verification tests:** Test invalid memory dimensions, cancellation, max-token enforcement, overload response and batch/context growth.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Which dimensions dominate KV cache memory?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage 4 integrated project execution

Run `python examples/stage-04/mini_causal_lm.py` and `python -m unittest discover -s examples/stage-04 -p 'test_*.py' -v`. Inspect `examples/stage-04/MODEL_CARD.md`, `PROJECT_DFD.md` and `incident-report.md`. The fixed-weight toy transformer is an educational computation trace, not a trained or production LLM.

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
