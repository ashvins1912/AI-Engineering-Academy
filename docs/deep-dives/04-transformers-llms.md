# Stage 04 — Transformers, LLM Internals and Generative AI

> **Mastery objective:** trace a token from raw text to a generated next token, derive attention equations, prove causal masking, understand the transformer block and explain fine-tuning/inference constraints.

## Learning contract
For each topic, calculate a tiny example, preserve tensor shapes, implement the central operation, test a failure and explain the design trade-off. Toy tokenizers, fixed projections and deterministic decoding are teaching references—not pretrained language models.

## Topic 1 — Tokenization and vocabulary
Tokenizers map text into model-specific token IDs. BPE-style tokenizers learn frequent subword merges; WordPiece uses likelihood-style vocabulary construction; byte-level schemes ensure arbitrary text can be represented. Special tokens mark boundaries, roles, padding and task structure. Context limits are measured in tokens, not words.

**Worked example:** a word may split into subword pieces such as trans, form, er; punctuation and whitespace can be represented inside tokens. A tokenizer/model vocabulary mismatch can map IDs to the wrong embedding rows.
**Diagram**
~~~mermaid
flowchart LR
 T[Raw text] --> N[Normalization]
 N --> P[Subword segmentation]
 P --> I[Token IDs]
 I --> E[Embedding lookup]
~~~
**Animation storyboard:** reveal normalization, merge the most frequent pair, show final token pieces, map each piece to an ID and stop at max-token truncation.
**Implementation:** use tokenize_greedy in examples/stage-04/transformers.py as a deliberately simple longest-piece teaching tokenizer.
**Failure lab:** Unicode, empty input, unknown piece, special-token injection and truncation boundary.
**Mastery gate:** explain token/word differences, reproduce IDs and state why tokenizer version is part of the model contract.

## Topic 2 — Embeddings and positional information
An embedding matrix E∈R^(V×d) maps token ID i to row Eᵢ. A batch of IDs with shape (B,S) becomes (B,S,d). Positional information distinguishes order; it may be learned, sinusoidal or encoded through mechanisms such as RoPE. Padding and special-token rows have explicit behavior.

**Worked example:** repeated token ID 5 returns the same token vector at positions 0 and 2 before positional contribution. The combined representation differs after adding position vectors.
**Diagram**
~~~mermaid
flowchart TD
 IDs[Token IDs: B × S] --> L[Embedding table V × d]
 L --> X[Token vectors B × S × d]
 P[Position information] --> A[Combine token and position]
 X --> A
 A --> H[Transformer input]
~~~
**Animation storyboard:** select token ID and position separately; display the lookup row, position vector and combined vector; move the same token to another position.
**Implementation:** embedding_lookup validates IDs and dimensions.
**Failure lab:** out-of-range IDs, vocabulary mismatch, wrong hidden width, padding index and position overflow.
**Mastery gate:** derive lookup shapes and explain why token identity alone cannot represent order.

## Topic 3 — Self-attention: Q, K and V
For input X, learned projections produce Q=XWQ, K=XWK and V=XWV. Scaled dot-product attention is softmax(QKᵀ/√dₖ)V. Queries express what a position seeks; keys determine match scores; values carry content. Stable softmax subtracts the maximum score before exponentiation.

**Worked example:** q=[1,0], keys k₁=[1,0], k₂=[0,1], dₖ=2 gives scaled scores [1/√2,0]. Softmax weights are approximately [0.67,0.33]. With values [2,0] and [0,4], output is approximately [1.34,1.32].
**Diagram**
~~~mermaid
flowchart LR
 X[Input vectors] --> Q[WQ → Q]
 X --> K[WK → K]
 X --> V[WV → V]
 Q --> S[QKᵀ / √dₖ]
 K --> S
 S --> M[Mask and softmax]
 M --> W[Attention weights]
 W --> O[Weighted sum of V]
 V --> O
~~~
**Animation storyboard:** compute each Q·K score, divide by √dₖ, normalize, then reveal weighted value contributions one dimension at a time.
**Implementation:** softmax and scaled_dot_product_attention.
**Failure lab:** mismatched dimensions, overflow logits, missing scaling and a softmax row that does not sum to one.
**Mastery gate:** derive Q/K/V, reproduce scores and output by hand, and explain the scaling factor.

## Topic 4 — Causal and padding masks
A causal decoder must not see future tokens. The causal mask blocks positions j>i before softmax; padding masks prevent attention to padded positions. These masks have different semantics and may be combined. Masking after softmax is incorrect because probability mass has already been allocated.

**Worked example:** for sequence length 4, query position 2 may attend to keys [0,1,2] but not key 3. The future weight is exactly zero after masked softmax.
**Diagram**
~~~mermaid
flowchart TD
 S[Attention scores] --> C[Causal mask]
 P[Padding mask] --> C
 C --> F[Masked scores]
 F --> M[Softmax]
 M --> W[No future/padding probability]
~~~
**Animation storyboard:** reveal a lower-triangular attention matrix one query row at a time; turn future cells off and recompute the normalized row.
**Implementation:** causal_mask and masked attention.
**Failure lab:** invert mask polarity, apply mask after softmax, leak a future token or mask the current token.
**Mastery gate:** construct the mask and prove future weights are zero for every query position.

## Topic 5 — Multi-head attention
Each head uses its own Q/K/V projections and attends in a subspace. Head outputs concatenate and pass through an output projection. With d_model=8 and 2 heads, each head commonly has width 4; concatenation restores width 8. d_model must be compatible with head count in the usual equal-width design.

**Worked example:** two heads produce vectors h₁ and h₂; concatenate [h₁;h₂], then apply WO to return to model width.
**Diagram**
~~~mermaid
flowchart TD
 X[Hidden states] --> P[Q/K/V projections]
 P --> H1[Head 1 attention]
 P --> H2[Head 2 attention]
 P --> HN[Head N attention]
 H1 --> C[Concatenate]
 H2 --> C
 HN --> C
 C --> O[Output projection]
~~~
**Animation storyboard:** split channels into heads, compute each attention map independently, show each head output and concatenate in head order.
**Implementation:** split_heads and merge_heads.
**Failure lab:** hidden size not divisible by heads, concatenate along wrong axis and forget output projection.
**Mastery gate:** calculate per-head width, trace shapes and explain why independent heads can learn different relationships.

## Topic 6 — Transformer blocks, residuals and normalization
A common pre-normalization decoder block computes x′=x+Attention(LN(x)), then y=x′+MLP(LN(x′)). The feed-forward network expands d_model to d_ff, applies GELU/SwiGLU and projects back. Residuals preserve a shortcut gradient path; normalization placement varies by architecture.

**Worked example:** input [0.2,0.6,0.4] plus attention output [0.3,0.1,0.5] gives residual vector [0.5,0.7,0.9] before normalization.
**Diagram**
~~~mermaid
flowchart TD
 X[Hidden state x] --> N1[LayerNorm]
 N1 --> A[Masked attention]
 A --> R1[Residual add]
 X --> R1
 R1 --> N2[LayerNorm]
 N2 --> F[Feed-forward MLP]
 F --> R2[Residual add]
 R1 --> R2
 R2 --> Y[Block output]
~~~
**Animation storyboard:** toggle residual paths, calculate normalized values and reveal MLP expansion/nonlinearity/projection while preserving the hidden dimension.
**Implementation:** layer_norm and transformer_block toy reference.
**Failure lab:** residual dimension mismatch, normalize over the wrong axis, omit residual or use inconsistent pre/post-LN ordering.
**Mastery gate:** trace a complete block and explain residual, normalization and MLP roles.

## Topic 7 — Decoder-only LLMs and autoregressive generation
Causal language modeling predicts the next token from the preceding prefix. Training inputs and targets are shifted: tokens [t₀,t₁,t₂] predict [t₁,t₂,t₃]. Inference repeatedly runs the decoder on the prefix, selects a token, appends it and stops on EOS or a limit. Prefill processes the prompt; decode generates tokens incrementally. KV cache reuses prior keys/values.

**Worked example:** input IDs [10,11,12] have next-token labels [11,12,13]. Position 2 cannot attend to a future position.
**Diagram**
~~~mermaid
flowchart TD
 P[Prompt tokens] --> F[Prefill]
 F --> L[Final-position logits]
 L --> S[Sampling policy]
 S --> T[Append next token]
 T --> D{EOS or limit?}
 D -->|No| L
 D -->|Yes| O[Generated sequence]
~~~
**Animation storyboard:** show shifted targets, causal prefix, final-position logits, chosen next token and repeated decode step. Compare cache reuse with recomputing the full prefix.
**Implementation:** shifted_lm_examples, decode_logits and KV cache estimate.
**Failure lab:** unshifted targets, future-token leakage, ignored EOS, missing stop condition and cache position mismatch.
**Mastery gate:** derive next-token alignment and explain prefill, decode and cache behavior.

## Topic 8 — LLM engineering: fine-tuning and inference
Supervised fine-tuning (SFT) adapts a model using curated instruction/response examples. LoRA learns low-rank updates to selected matrices while freezing base weights; QLoRA combines quantized base weights with trainable adapters. Data deduplication and held-out evaluation prevent leakage. Inference engineering balances context length, KV-cache memory, batching, quantization, streaming, latency and cost.

**Worked example:** for one 4096×4096 projection, full weights contain 16,777,216 parameters. Rank-8 LoRA uses approximately 8×(4096+4096)=65,536 adapter parameters for that matrix. KV cache bytes scale as 2×layers×sequence×KV heads×head dimension×bytes/value×batch.
**Diagram**
~~~mermaid
flowchart TD
 D[Curated instruction data] --> S[Deduplicate and split]
 S --> F[SFT / LoRA adaptation]
 F --> E[Held-out evaluation]
 E --> R[Model registry]
 R --> I[Inference serving]
 I --> M[Latency, memory, throughput and cost]
~~~
**Animation storyboard:** vary LoRA rank and compare trainable parameter count; then increase context length and layers to show KV cache growth.
**Implementation:** lora_parameter_count and kv_cache_bytes.
**Failure lab:** train/eval overlap, tokenizer mismatch, adapter/base mismatch, context overflow and serving overload.
**Mastery gate:** estimate adapter and cache memory, design leakage-safe SFT evaluation and define quality/latency/cost metrics.

## Stage 4 integrated project — Tiny causal transformer trace

Run:
~~~bash
python examples/stage-04/mini_causal_lm.py
python -m unittest discover -s examples/stage-04 -p 'test_*.py' -v
~~~

The project traces a fixed-weight toy sequence through tokenization, embeddings, causal attention, transformer-block residuals, logits and next-token selection. It also estimates LoRA parameters and KV-cache memory. It is a deterministic educational reference, not a trained or production language model.

## Stage 4 mastery gate
Pass all eight evidence checklists, reproduce Q/K/V and mask calculations, verify multi-head and transformer-block shapes, implement autoregressive decoding and explain fine-tuning/inference trade-offs. RAG work remains blocked until this stage passes.

## Primary references
- Attention Is All You Need: https://arxiv.org/abs/1706.03762
- The Illustrated Transformer: https://jalammar.github.io/illustrated-transformer/
- Hugging Face tokenizers: https://huggingface.co/docs/tokenizers/
- PyTorch scaled dot-product attention: https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html
