# Implementation status

## Completed
- Curriculum navigation with stage and module expansion.
- Search across stage, module, lesson, lab and lesson-depth text.
- Lesson detail view with objectives, prerequisites, intuition, worked example, execution workflow, exercises, assessment and production note.
- Browser-local completion and bookmarks.
- Stage-namespaced lesson IDs to prevent repeated topic names from sharing progress state.
- 11 stages and 84 lesson blueprints.
- Concrete worked examples for vectors, gradient descent, linear regression, self-attention, chunking and MCP architecture.
- Phase 3 interactive foundations labs integrated into Stage 1:
  - Vector and matrix calculator with live plot, dot product, vector norms, cosine similarity and matrix-vector product.
  - Deterministic Monte Carlo π estimator with adjustable sample count and seed.
  - Gradient descent visualizer with adjustable learning rate, timed play/pause animation, single-step, ten-step and reset controls.
  - SGD, momentum and Adam comparison on a shared quadratic objective.
  - Switchable sales/student dataset exercise with filtering, derived revenue and Pandas practice prompts.
- Phase 4 classical ML workbench integrated into Stage 2, with neural network labs available from Stage 3: linear/logistic regression, trees, KNN/SVM, K-means, single-neuron gradients, multilayer chain-rule trace and optimizer comparison.
- Phase 4 advanced deep-learning labs: CNN convolution and pooling, RNN/LSTM scalar sequence-state trace, dropout/L2/batch-normalization demonstrations, softmax multiclass evaluation and illustrative overfitting/generalization curves.
- Expanded detailed lesson overrides for CNN, sequence models, model metrics and generalization.
- Phase 4 remaining-work increment: advanced CNN feature-map/pooling, RNN/LSTM state, regularization, multiclass evaluation and generalization labs are exposed through the Stage 3 neural workbench. These remain small deterministic teaching examples rather than fully trainable datasets/models.
- Phase 5 initial increment integrated into Stage 4: six interactive transformer labs for tokenization, embeddings/position, Q/K/V attention, causal masks, multi-head attention, transformer block flow and autoregressive decoding.
- Added worked lesson overrides for tokenization, embeddings, multi-head attention, decoder-only generation and sampling.
- Phase 6 RAG workbench integrated into Stage 5: source ingestion/provenance flow, interactive chunk-size/overlap controls, dense/sparse/hybrid retrieval comparison, reranking and context assembly, GraphRAG entity neighborhood exploration, schematic Visual RAG page/table evidence, and RAG evaluation metrics.
- Phase 6 lesson overrides for ingestion, vector databases, retrieval/RRF, grounded generation, reranking, GraphRAG, Visual RAG and evaluation.
- Real browser-local PDF.js PDF text extraction and Mammoth DOCX raw-text extraction integrated into the Stage 5 ingestion lab. The extracted documents flow into the same chunk explorer. File size, PDF page count, extracted text size and basic file-signature guards are applied. No file bytes are uploaded to a backend.
- Curriculum and Phase 3/4/5/6 plus PDF/DOCX ingestion validation scripts.

## Validation
- `npm run validate:curriculum`: PASS (11 stages, 84 lesson blueprints).
- `npm run validate:phase3`: PASS (five lab surfaces, Stage 1 integration, numerical invariants and gradient descent convergence).
- `npm run validate:phase4`: PASS (classical ML and advanced DL lab coverage, Stage 2/3 integration, convolution/softmax/metric invariants, neural gradient descent and SVM separation checks).
- `npm run validate:phase5`: PASS (six transformer lab surfaces, Stage 4 integration, softmax, causal-mask and attention weighted-sum invariants).
- `npm run validate:phase6`: PASS (seven RAG lab surfaces, Stage 5 integration, detailed lesson overrides, cosine similarity, RRF ordering and retrieval metric invariants).
- `npm run validate:documents`: PASS (PDF.js/DOCX parser integration, file signatures, file/page/text limits, OCR limitation and RAG chunk-index integration).
- Temporary declaration-based TypeScript inspection: the new TransformerLabs component produced no diagnostics; the whole-project smoke check remains inconclusive because the declarations do not model React JSX event typing. This is not a substitute for compiling against real dependencies.
- `git diff --check`: PASS for this increment.
- Full TypeScript/build against real React/Lucide packages: NOT VERIFIED. Frontend dependencies including React, Lucide, PDF.js and Mammoth are absent; npm install timed out because registry access/cache was unavailable in this environment.
- Deployment: NOT PERFORMED.
- Paid infrastructure: NONE provisioned.

## Remaining work
- Individually authored technical content, equations, diagrams, source code and references for the remaining lesson blueprints.
- Upgrade educational CNN/RNN/LSTM, regularization and generalization demonstrations into trainable, dataset-driven experiments with gradient-level inspection.
- Upgrade the transformer tokenizer from a tiny illustrative merge rule to a real open tokenizer fixture and add trainable projection matrices, complete tensor-shape traces, and deterministic seeded sampling/top-p.
- Replace Phase 6 heuristic retrieval and reranking with a real embedding provider, BM25 implementation, seeded benchmark corpus and a trained reranker; add OCR for scanned PDFs and image embeddings for Visual RAG. PDF and DOCX text parsing is now implemented in-browser.
- Animated and more advanced algorithm visualizations.
- Authentication and account-backed mastery.
- Backend APIs, database schema and migrations.
- Isolated code execution, model integrations and AI agent runtime.
- Full automated UI, accessibility, security and performance test suites.
