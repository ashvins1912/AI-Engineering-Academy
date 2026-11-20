# Stage 4 mini causal LM data flow

~~~mermaid
flowchart TD
 T[Text prompt] --> Z[Subword token IDs]
 Z --> E[Token + position embeddings]
 E --> Q[Q/K/V projections]
 Q --> M[Causal mask and scaled attention]
 M --> R[Residual and normalization]
 R --> F[Feed-forward toy sublayer]
 F --> L[Output logits]
 L --> S[Temperature/top-k/top-p]
 S --> N[Next token]
~~~

| Tensor | Shape | Meaning |
|---|---:|---|
| Token IDs | (1,S) | One prompt sequence |
| Embeddings | (1,S,4) | Four-dimensional hidden state |
| Attention weights | (S,) | Last query over causal prefix |
| Block output | (4,) | Final hidden vector |
| Logits | (4,) | One score per toy vocabulary item |

The final query attends only to the available prefix. The project is fixed-weight and deterministic for reproducibility; it does not train a language model.
