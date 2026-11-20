# Stage 4 project model card — fixed-weight toy causal transformer

## Purpose
Demonstrate the complete data path from subword tokenization to embedding lookup, causal self-attention, residual/normalization, logits and next-token selection.

## Architecture
Tiny vocabulary, fixed 4-dimensional embedding table, causal scaled dot-product attention, one residual/normalization demonstration and a tied-embedding toy output projection.

## Intended use
Educational numerical trace only. It is not a trained model and does not represent production LLM quality or capability.

## Prohibited use
Do not use generated outputs for real-world decisions or present them as factual language-model responses.

## Limitations
Weights are fixed and hand-authored; there is no pretraining, SFT, instruction following, safety tuning, distributed inference or production KV cache. The tokenizer is a greedy longest-piece teaching example, not BPE.
