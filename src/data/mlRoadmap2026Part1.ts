import { bVal, nVal, type RoadmapTrack } from './mlRoadmap2026Types'

export const mlRoadmapTracksPart1: RoadmapTrack[] = [
  // =========================================================================
  // TRACK 01 — PYTHON PROGRAMMING (9 TOPICS)
  // =========================================================================
  {
    id: 'ml26-01-python',
    number: 1,
    phase: 'foundations',
    phaseLabel: 'Foundations',
    title: 'Python Programming',
    summary: 'Master Python fundamentals, OOP, DSA, environments, NumPy, Pandas, visualization, and interactive notebooks.',
    architectAuditNote: 'Production ML failures often start in Python: Python-loop bottlenecks instead of NumPy vectorization, unpinned pip environments, or silent mutable-state bugs.',
    topics: [
      {
        id: 'py-fundamentals',
        title: 'Python Fundamentals: Variables, data types, loops, and functions',
        explanation: 'Dynamic typing, immutable vs. mutable containers, comprehensions, type hints, and pure functions form clean, testable ML codebases.',
        analogy: 'Labeled kitchen jars (variables) and repeatable recipe cards (functions) so every dish tastes identical.',
        technicalDetail: 'Use PEP 484 type hints (`list[float]`, `dict[str, Any]`) and list/generator comprehensions to keep ETL pipelines memory-safe and readable.',
        productionPitfall: 'Using mutable default arguments like `def add(x, buf=[]):` leaks state across requests.',
        pythonSnippet: `def normalize_scores(scores: list[float]) -> list[float]:\n    hi = max(scores) or 1.0\n    return [round(s / hi, 4) for s in scores]`
      },
      {
        id: 'py-oop',
        title: 'Object-Oriented Programming',
        explanation: 'Encapsulate model weights, preprocessing state, and `.fit() / .transform() / .predict()` contracts inside cohesive classes and dataclasses.',
        analogy: 'A standardized car dashboard: whether the engine is electric or gas, the steering wheel and pedals expose the same interface.',
        technicalDetail: 'Follow scikit-learn estimator conventions (`fit` learns state only from train; `transform` applies it deterministically) and use `@dataclass(frozen=True)` for configs.',
        productionPitfall: 'Deep 5-level inheritance hierarchies instead of clean composition make ML pipelines impossible to debug.',
        pythonSnippet: `from dataclasses import dataclass\n\n@dataclass\nclass StandardScalerLite:\n    mean: float = 0.0\n    std: float = 1.0\n    def fit(self, xs: list[float]):\n        self.mean = sum(xs) / len(xs)\n        self.std = (sum((x - self.mean)**2 for x in xs) / len(xs)) ** 0.5 or 1.0\n        return self\n    def transform(self, xs: list[float]) -> list[float]:\n        return [(x - self.mean) / self.std for x in xs]`
      },
      {
        id: 'py-dsa',
        title: 'Data Structures and Algorithms',
        explanation: 'Choosing hash maps (`dict`/`set` O(1)), heaps (`heapq` for Top-K retrieval), and trees directly determines data-prep and inference speed.',
        analogy: 'Looking up a word in a sorted dictionary (O(log N)) or indexed drawer (O(1)) instead of reading every page from page 1 (O(N)).',
        technicalDetail: 'Use `set` for O(1) membership filtering, `collections.Counter` for vocabulary frequency counts, and `heapq.nlargest` for Top-K search results.',
        productionPitfall: 'Checking `if item in huge_list:` inside a loop creates hidden O(N²) runtime explosions at 100k+ rows.',
        pythonSnippet: `import heapq\nscores = [("doc1", 0.72), ("doc2", 0.94), ("doc3", 0.88), ("doc4", 0.41)]\ntop_2 = heapq.nlargest(2, scores, key=lambda x: x[1])`
      },
      {
        id: 'py-files-exceptions',
        title: 'File Handling and Exception Handling',
        explanation: 'Stream large datasets safely with context managers (`with open(...)`), structured JSONL/CSV I/O, and explicit exception guards.',
        analogy: 'Automatic fire doors that always latch shut even when an alarm triggers, plus clear incident tags instead of silent crashes.',
        technicalDetail: 'Stream line-by-line generators for GB-scale JSONL files, catch specific exceptions (`ValueError`, `KeyError`), and never use bare `except: pass`.',
        productionPitfall: 'Loading a 15 GB JSON file with `json.load()` crashes container RAM with OOMKill.',
        pythonSnippet: `import json\nfrom pathlib import Path\n\ndef iter_jsonl(path: Path):\n    with path.open("r", encoding="utf-8") as f:\n        for line_no, raw in enumerate(f, 1):\n            try:\n                yield json.loads(raw)\n            except json.JSONDecodeError as err:\n                raise ValueError(f"Malformed JSON at line {line_no}") from err`
      },
      {
        id: 'py-venv',
        title: 'Virtual Environments and Package Management',
        explanation: 'Isolate Python interpreters and lock exact dependency versions (`uv`, `venv`, `poetry`, `pyproject.toml`) so training and production match byte-for-byte.',
        analogy: 'Separate sterile lab benches for each experiment so chemicals from Project A never contaminate Project B.',
        technicalDetail: 'Pin transitive dependencies via lockfiles (`uv.lock` / `requirements.lock`) and verify CUDA + PyTorch wheel compatibility in CI.',
        productionPitfall: 'Unpinned `numpy>=1.0` upgrades silently break binary ABI compatibility on production deploy day.',
        pythonSnippet: `# Reproducible environment workflow with uv / venv\n# uv venv .venv && source .venv/bin/activate\n# uv pip install -r requirements.lock`
      },
      {
        id: 'py-numpy',
        title: 'NumPy: Numerical computing',
        explanation: 'Contiguous C-backed multi-dimensional arrays (`ndarray`) with SIMD vectorization and broadcasting deliver 50×–200× speedups over Python loops.',
        analogy: 'Moving 1,000 bricks on one forklift pallet at once instead of carrying one brick by hand 1,000 times.',
        technicalDetail: 'Understand shapes `(B, T, D)`, broadcasting rules, zero-copy views vs. `.copy()`, and `float32`/`bfloat16` memory footprints.',
        productionPitfall: 'Accidental broadcasting of shape `(N, 1) + (N,)` allocates an unintended `(N, N)` matrix and blows up RAM.',
        pythonSnippet: `import numpy as np\nX = np.random.randn(1000, 128).astype(np.float32)\n# Vectorized L2 row normalization\nX_norm = X / np.linalg.norm(X, axis=1, keepdims=True)`
      },
      {
        id: 'py-pandas',
        title: 'Pandas: Data manipulation and analysis',
        explanation: 'Tabular DataFrames for fast ingestion, joins, group-by aggregations, datetime resampling, missing-value pipelines, and Parquet export.',
        analogy: 'A programmable super-spreadsheet that handles millions of rows reproducibly with audit trails.',
        technicalDetail: 'Prefer vectorized column operations, `.assign()` method chaining, categorical dtypes for memory cuts, and Parquet over CSV.',
        productionPitfall: 'Iterating with `.iterrows()` is 100× slower than vectorized column ops or Polars/DuckDB.',
        pythonSnippet: `import pandas as pd\nsummary = (\n    df.dropna(subset=["revenue"])\n      .assign(net=lambda d: d["revenue"] - d["discount"])\n      .groupby("segment", as_index=False)["net"].mean()\n)`
      },
      {
        id: 'py-viz',
        title: 'Matplotlib & Seaborn: Data visualization',
        explanation: 'Inspect distributions, correlations, class imbalance, residual curves, and learning diagnostics visually before trusting summary numbers.',
        analogy: 'An X-ray machine: two datasets can have identical averages (Anscombe’s Quartet) yet completely opposite shapes.',
        technicalDetail: 'Use histograms/KDEs for skew, box/violin plots for outliers, heatmaps for feature collinearity, and calibration/PR curves for models.',
        productionPitfall: 'Skipping EDA plots hides bimodal distributions, sentinel values (`-999`), and broken timestamp gaps.',
        pythonSnippet: `import seaborn as sns, matplotlib.pyplot as plt\nsns.histplot(data=df, x="transaction_usd", hue="is_fraud", log_scale=True)\nplt.title("Transaction Amount Distribution by Class"); plt.tight_layout()`
      },
      {
        id: 'py-jupyter',
        title: 'Jupyter Notebook: Interactive development',
        explanation: 'Interactive cell-by-cell exploration for EDA and prototyping—disciplined teams promote validated logic from notebooks into versioned `.py` modules.',
        analogy: 'An architect’s sketchbook for fast visual exploration before drafting blueprints for construction.',
        technicalDetail: 'Always run "Restart Kernel & Run All Cells" before committing, strip heavy outputs with `nbstripout`, and extract reusable pipelines into `src/`.',
        productionPitfall: 'Out-of-order cell execution creates hidden global-variable state that cannot be reproduced.',
        pythonSnippet: `# Notebook hygiene: keep exploration thin and import tested modules\nfrom src.features import build_feature_matrix\nX_train, y_train = build_feature_matrix("data/train.parquet")`
      }
    ],
    mermaidDfd: `flowchart LR
  ENV["Locked Venv (uv/pyproject)"] --> RAW["Raw CSV / Parquet / JSONL"]
  RAW --> PD["Pandas / Polars Tabular Clean"]
  PD --> NP["NumPy Contiguous float32 Tensor"]
  NP --> VIZ["Matplotlib & Seaborn Diagnostics"]
  VIZ --> MOD["Tested OOP Python Module (src/)"]`,
    dfdNodeLabels: { ENV: 'Locked Venv', RAW: 'File I/O', PD: 'Pandas DataFrame', NP: 'NumPy Array', VIZ: 'EDA Plots', MOD: 'OOP Module' },
    dfdSteps: [
      { step: 1, nodeId: 'ENV', title: 'Pinned Virtual Environment', description: 'Lock Python + NumPy + Pandas versions for bit-exact reproducibility.', payload: { python: '3.12', lockfile: 'uv.lock', isolated: true } },
      { step: 2, nodeId: 'PD', title: 'Vectorized Tabular Prep', description: 'Filter nulls, join tables, and cast float64/object columns to float32/category.', payload: { rows: 250000, ram_saved_pct: 64, format: 'parquet' } },
      { step: 3, nodeId: 'NP', title: 'Contiguous NumPy Vectorization', description: 'Execute C-level SIMD matrix operations without Python interpreter loop overhead.', payload: { shape: '[250000, 32]', dtype: 'float32', speedup: '112x' } },
      { step: 4, nodeId: 'MOD', title: 'Promoted Reusable Module', description: 'Move validated notebook prototype into typed, unit-tested OOP code.', payload: { tests_passed: 14, type_checked: true, notebook_debt: 0 } }
    ],
    simTitle: 'Python Loop vs. NumPy Vectorization & Memory Simulator',
    simSubtitle: 'Scale dataset rows, feature count, dtype precision, and vectorization to inspect runtime and RAM footprint.',
    simControls: [
      { id: 'rowsK', label: 'Dataset Rows (Thousands)', type: 'slider', min: 10, max: 1000, step: 10, unit: 'k rows', defaultValue: 200 },
      { id: 'cols', label: 'Numeric Feature Columns', type: 'slider', min: 4, max: 128, step: 4, unit: 'cols', defaultValue: 32 },
      { id: 'vectorized', label: 'Use NumPy Vectorization (vs. Python for-loop)', type: 'toggle', defaultValue: true },
      { id: 'useFloat32', label: 'Downcast float64 → float32', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const rows = nVal(vals.rowsK, 200) * 1000
      const cols = nVal(vals.cols, 32)
      const vec = bVal(vals.vectorized, true)
      const f32 = bVal(vals.useFloat32, true)
      const bytesPerVal = f32 ? 4 : 8
      const ramMb = Number(((rows * cols * bytesPerVal) / (1024 * 1024)).toFixed(1))
      const pyLoopMs = Math.round((rows * cols) / 9500)
      const numpyMs = Math.max(2, Math.round((rows * cols) / 950000))
      const activeMs = vec ? numpyMs : pyLoopMs
      const speedup = Math.round(pyLoopMs / Math.max(1, numpyMs))
      const health = !vec && activeMs > 1500 ? 'breaking' : ramMb > 250 || !f32 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: vec
          ? `NumPy SIMD Vectorized: ${activeMs}ms (${speedup}× faster than Python loops) using ${ramMb} MB RAM`
          : `Python Loop Bottleneck: ${activeMs.toLocaleString()}ms — switch to NumPy vectorization for ${speedup}× speedup`,
        explanation: `Contiguous ${f32 ? 'float32' : 'float64'} arrays eliminate per-element Python object boxing (28 bytes/float) and run directly in compiled C/BLAS loops.`,
        kpis: [
          { label: 'Execution Latency', value: `${activeMs.toLocaleString()} ms`, sub: vec ? 'NumPy C/SIMD' : 'Pure Python loop', status: activeMs < 150 ? 'optimal' : activeMs < 1500 ? 'tradeoff' : 'breaking' },
          { label: 'Vector Speedup', value: `${vec ? speedup : 1}×`, sub: 'vs. row iteration', status: vec ? 'optimal' : 'breaking' },
          { label: 'Array Memory', value: `${ramMb} MB`, sub: f32 ? 'float32 (4B)' : 'float64 (8B)', status: ramMb < 120 ? 'optimal' : 'tradeoff' },
          { label: 'Total Elements', value: `${((rows * cols) / 1e6).toFixed(1)}M`, sub: `${(rows / 1000)}k × ${cols}`, status: 'optimal' }
        ],
        bars: [
          { label: 'Python Loop Time', pct: 100, display: `${pyLoopMs.toLocaleString()} ms`, tone: 'danger' },
          { label: 'Active Runtime', pct: Math.max(2, Math.round((activeMs / Math.max(1, pyLoopMs)) * 100)), display: `${activeMs.toLocaleString()} ms`, tone: vec ? 'positive' : 'danger' },
          { label: 'RAM Efficiency (vs float64)', pct: f32 ? 50 : 100, display: `${ramMb} MB`, tone: f32 ? 'positive' : 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live Python-Style Vectorized Pipeline & O(1) Top-K Sandbox',
    playgroundTask: 'Run a real benchmark comparing O(N) hash-set deduplication, Top-K extraction, and OOP StandardScaler fit/transform without test leakage.',
    executableCode: `// Track 01 — OOP StandardScaler + O(1) Deduplication + Top-K Extraction
class StandardScaler {
  fit(arr) {
    this.mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    this.std = Math.sqrt(arr.reduce((s, x) => s + (x - this.mean) ** 2, 0) / arr.length) || 1;
    return this;
  }
  transform(arr) { return arr.map(x => Number(((x - this.mean) / this.std).toFixed(4))); }
}
const trainVals = [10, 20, 30, 40, 50];
const testVals  = [25, 60];
const scaler = new StandardScaler().fit(trainVals);
const scaledTrain = scaler.transform(trainVals);
const scaledTest  = scaler.transform(testVals);

// O(1) Set deduplication vs O(N^2)
const rawIds = ["u1", "u2", "u1", "u3", "u2", "u4"];
const uniqueIds = [...new Set(rawIds)];

console.log("[Scaler] Mean =", scaler.mean, "| Std =", scaler.std.toFixed(2));
console.log("[Scaled Train]", JSON.stringify(scaledTrain), "| [Scaled Test]", JSON.stringify(scaledTest));
console.log("[Dedup O(N)]", rawIds.length, "->", uniqueIds.length, "unique IDs");

assert(Math.abs(scaledTrain[2]) < 1e-6, "Train median value normalized cleanly to 0.0");
assert(uniqueIds.length === 4, "Set deduplication kept exactly 4 unique records");
emitMetric("Train Mean", String(scaler.mean), "Fitted on train only", "optimal");
emitMetric("Unique IDs", String(uniqueIds.length), "O(N) Hash Set", "optimal");
emitArtifact("Scaler Output", { mean: scaler.mean, std: Number(scaler.std.toFixed(3)), scaledTest });`,
    pythonReference: `import numpy as np\n\nclass StandardScaler:\n    def fit(self, X: np.ndarray):\n        self.mean_ = X.mean(axis=0)\n        self.std_ = np.where(X.std(axis=0) == 0, 1.0, X.std(axis=0))\n        return self\n    def transform(self, X: np.ndarray) -> np.ndarray:\n        return (X - self.mean_) / self.std_`
  },

  // =========================================================================
  // TRACK 02 — MATHEMATICS FOR MACHINE LEARNING (6 TOPICS)
  // =========================================================================
  {
    id: 'ml26-02-math',
    number: 2,
    phase: 'foundations',
    phaseLabel: 'Foundations',
    title: 'Mathematics for Machine Learning',
    summary: 'Master Linear Algebra, Calculus, Probability, Statistics, Optimization, and Information Theory.',
    architectAuditNote: 'Every modern model—from Ridge Regression to GPT-5—is linear algebra (dot products), calculus (chain-rule gradients), optimization (AdamW), and information theory (cross-entropy).',
    topics: [
      {
        id: 'math-linalg',
        title: 'Linear Algebra: Vectors, matrices, and eigenvalues',
        explanation: 'Data points are vectors, model layers are matrix multiplications ($y = Wx + b$), and eigenvalues/eigenvectors uncover the dominant directions of variance (PCA).',
        analogy: 'A matrix is a machine that rotates and stretches space; eigenvectors are the special arrows that only stretch without rotating.',
        technicalDetail: 'Dot product $a \\cdot b = \\|a\\|\\|b\\|\\cos\\theta$ powers attention & cosine similarity; SVD/eigendecomposition powers PCA and LoRA low-rank matrices.',
        productionPitfall: 'Forgetting to L2-normalize vectors causes raw dot products to favor longer documents over semantically closer matches.',
        pythonSnippet: `import numpy as np\nA = np.array([[2.0, 1.0], [1.0, 2.0]])\neigvals, eigvecs = np.linalg.eigh(A)\nprint("Eigenvalues:", eigvals)`
      },
      {
        id: 'math-calculus',
        title: 'Calculus: Derivatives, gradients, and partial derivatives',
        explanation: 'Partial derivatives measure how nudging each weight changes total loss; the gradient vector points uphill, so subtracting it walks downhill toward minimum error.',
        analogy: 'Standing blindfolded on a foggy mountain: feeling the steepest slope beneath your boots tells you which way is downhill.',
        technicalDetail: 'The multivariable chain rule $\\frac{\\partial L}{\\partial w} = \\frac{\\partial L}{\\partial \\hat{y}} \\frac{\\partial \\hat{y}}{\\partial z} \\frac{\\partial z}{\\partial w}$ is the exact engine of backpropagation.',
        productionPitfall: 'Saturating activations (sigmoid tails) drive derivatives near 0, causing vanishing gradients in deep layers.',
        pythonSnippet: `# Numerical gradient verification (finite differences)\nf = lambda w: (w - 3.0) ** 2\nw, eps = 1.0, 1e-5\ngrad_num = (f(w + eps) - f(w - eps)) / (2 * eps)\nassert abs(grad_num - 2*(w - 3.0)) < 1e-6`
      },
      {
        id: 'math-prob',
        title: 'Probability Theory: Random variables and probability distributions',
        explanation: 'Models predict probability distributions (Bernoulli for binary clicks, Categorical/Softmax for next tokens, Gaussian for continuous noise) and update beliefs via Bayes’ theorem.',
        analogy: 'Weather forecasting: predicting "80% chance of rain" lets you make calibrated decisions instead of blind yes/no guesses.',
        technicalDetail: 'Bayes’ rule $P(y|x) \\propto P(x|y)P(y)$ underpins Naive Bayes, MAP regularization (Gaussian prior = L2 weight decay), and Bayesian optimization.',
        productionPitfall: 'Confusing $P(\\text{fraud}|\\text{alert})$ with $P(\\text{alert}|\\text{fraud})$ creates false-alarm nightmares on rare 0.1% events.',
        pythonSnippet: `# Bayes update for 0.5% base fraud rate, 95% sensitivity, 2% false positive\np_fraud, tpr, fpr = 0.005, 0.95, 0.02\nposterior = (tpr * p_fraud) / (tpr * p_fraud + fpr * (1 - p_fraud))`
      },
      {
        id: 'math-stats',
        title: 'Statistics: Mean, variance, standard deviation, and hypothesis testing',
        explanation: 'Quantifies central tendency, spread, confidence intervals, and p-values so you prove a model gain is real rather than lucky sampling noise.',
        analogy: 'Checking whether a basketball player truly improved or just made 3 lucky shots in a row.',
        technicalDetail: 'Always report uncertainty (bootstrap CIs, standard error $\\sigma/\\sqrt{n}$), check statistical power, and watch out for heavy-tailed skewed revenue metrics.',
        productionPitfall: 'Using mean instead of median/P95 hides severe latency or whale-user skew.',
        pythonSnippet: `from scipy.stats import ttest_ind\nt_stat, p_val = ttest_ind(treatment_rev, control_rev, equal_var=False)`
      },
      {
        id: 'math-opt',
        title: 'Optimization: Gradient descent and optimization algorithms',
        explanation: 'Iteratively updates parameters $w \\leftarrow w - \\eta \\nabla L(w)$ using mini-batch stochastic gradients, momentum, and adaptive per-parameter scaling (AdamW).',
        analogy: 'A heavy ball rolling down a curved valley (momentum) that automatically shortens its stride on steep cliffs (adaptive step size).',
        technicalDetail: 'Learning rate $\\eta$ is the single most sensitive hyperparameter: too small stalls; too large diverges; cosine decay with warmup stabilizes convergence.',
        productionPitfall: 'Skipping gradient clipping on deep/sequence models causes sudden NaN weight explosions.',
        pythonSnippet: `w, lr = 8.0, 0.1\nfor _ in range(30):\n    grad = 2 * (w - 2.0)  # d/dw (w - 2)^2\n    w -= lr * grad`
      },
      {
        id: 'math-info',
        title: 'Information Theory: Entropy, information gain, and cross-entropy',
        explanation: 'Entropy $H(p) = -\\sum p \\log p$ measures surprise/uncertainty; Information Gain guides decision-tree splits; Cross-Entropy is the universal loss for classification and LLMs.',
        analogy: 'Playing 20 Questions: the best question splits possibilities in half (highest information gain), reducing remaining confusion (entropy) fastest.',
        technicalDetail: 'Minimizing Cross-Entropy $H(p, q) = H(p) + D_{KL}(p \\| q)$ maximizes log-likelihood and directly minimizes KL divergence between truth and model.',
        productionPitfall: 'Passing raw unclipped probabilities `log(0)` yields `-inf` / NaN loss—always compute log-softmax in log space.',
        pythonSnippet: `import numpy as np\ndef cross_entropy(p_true, p_pred):\n    p_pred = np.clip(p_pred, 1e-12, 1.0)\n    return float(-np.sum(p_true * np.log(p_pred)))`
      }
    ],
    mermaidDfd: `flowchart LR
  VEC["Vectors & Matrices (Wx+b)"] --> PROB["Softmax Probability Dist"]
  PROB --> CE["Cross-Entropy Loss (Info Theory)"]
  CE --> GRAD["Partial Derivatives (Chain Rule)"]
  GRAD --> OPT["Gradient Descent / AdamW Step"]
  OPT -->|Updated Weights| VEC`,
    dfdNodeLabels: { VEC: 'Linear Algebra', PROB: 'Probability', CE: 'Cross-Entropy', GRAD: 'Calculus Gradients', OPT: 'Optimization' },
    dfdSteps: [
      { step: 1, nodeId: 'VEC', title: 'Matrix Projection', description: 'Compute dot products z = Wx + b across all input features simultaneously.', payload: { x: [1.2, -0.4], logits: [2.1, 0.3] } },
      { step: 2, nodeId: 'PROB', title: 'Probability Normalization', description: 'Convert raw logits into a valid probability distribution summing to 1.0.', payload: { p_class0: 0.858, p_class1: 0.142 } },
      { step: 3, nodeId: 'CE', title: 'Cross-Entropy Surprise Loss', description: 'Measure negative log probability assigned to the true target class.', payload: { true_class: 0, cross_entropy_loss: 0.153, entropy_bits: 0.589 } },
      { step: 4, nodeId: 'OPT', title: 'Gradient Descent Update', description: 'Move parameters opposite the gradient scaled by learning rate η.', payload: { grad: -0.142, lr: 0.05, delta_w: '+0.0071' } }
    ],
    simTitle: 'Gradient Descent Convergence & Cross-Entropy Surprisal Simulator',
    simSubtitle: 'Tune learning rate, momentum, and true-class confidence to observe optimization stability and information-theoretic loss.',
    simControls: [
      { id: 'lr', label: 'Learning Rate (η)', type: 'slider', min: 0.02, max: 1.2, step: 0.02, unit: 'η', defaultValue: 0.18 },
      { id: 'steps', label: 'Optimization Steps', type: 'slider', min: 5, max: 50, step: 5, unit: 'steps', defaultValue: 25 },
      { id: 'predProb', label: 'Predicted Prob on True Class', type: 'slider', min: 0.02, max: 0.99, step: 0.01, unit: 'p', defaultValue: 0.82 }
    ],
    runSim: vals => {
      const lr = nVal(vals.lr, 0.18)
      const steps = nVal(vals.steps, 25)
      const p = nVal(vals.predProb, 0.82)
      let w = 8.0
      for (let i = 0; i < steps; i++) {
        const g = 2 * (w - 2.0)
        w = w - lr * g
        if (!Number.isFinite(w) || Math.abs(w) > 1e5) { w = 1e5; break }
      }
      const residual = Math.abs(w - 2.0)
      const diverged = lr >= 1.0 || residual > 10
      const ceLoss = Number((-Math.log(Math.max(1e-6, p))).toFixed(3))
      const binaryEnt = Number((-(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))).toFixed(3))
      const health = diverged ? 'breaking' : residual > 0.3 || ceLoss > 1.2 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: diverged
          ? `Gradient Explosion / Oscillation (η = ${lr}): Weight overshot minimum!`
          : `Converged Smoothly: |w − w*| = ${residual.toFixed(4)} | Cross-Entropy = ${ceLoss} nats`,
        explanation: `For convex f(w)=(w−2)², stability requires 0 < η < 1. Meanwhile, Cross-Entropy spikes sharply (−log p) when a confident model is wrong.`,
        kpis: [
          { label: 'Final Weight w', value: diverged ? 'DIVERGED' : w.toFixed(4), sub: 'Target w* = 2.000', status: diverged ? 'breaking' : residual < 0.05 ? 'optimal' : 'tradeoff' },
          { label: 'Cross-Entropy Loss', value: `${ceLoss}`, sub: '−ln(p_true) nats', status: ceLoss < 0.35 ? 'optimal' : ceLoss < 1.0 ? 'tradeoff' : 'breaking' },
          { label: 'Binary Entropy', value: `${binaryEnt} bits`, sub: 'Max 1.00 bit at p=0.5', status: 'optimal' },
          { label: 'Step Stability', value: diverged ? 'Unstable' : 'Convergent', sub: `η = ${lr.toFixed(2)}`, status: diverged ? 'breaking' : 'optimal' }
        ],
        bars: [
          { label: 'Convergence Accuracy', pct: diverged ? 5 : Math.max(5, Math.round(100 - Math.min(95, residual * 35))), display: diverged ? 'Diverged' : `${(100 - Math.min(99, residual * 16)).toFixed(1)}%`, tone: diverged ? 'danger' : 'positive' },
          { label: 'Cross-Entropy Penalty', pct: Math.min(100, Math.round((ceLoss / 4) * 100)), display: `${ceLoss} nats`, tone: ceLoss > 1.2 ? 'danger' : 'primary' },
          { label: 'Shannon Uncertainty', pct: Math.round(binaryEnt * 100), display: `${binaryEnt} bits`, tone: 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live Math Sandbox: Cosine Similarity, Gradient Descent & Cross-Entropy',
    playgroundTask: 'Verify linear algebra cosine similarity, gradient descent convergence on f(w)=(w-3)², and cross-entropy calculation live.',
    executableCode: `// Track 02 — Linear Algebra Cosine + Gradient Descent + Cross-Entropy
const a = [3, 4], b = [6, 8];
const dot = a.reduce((s, v, i) => s + v * b[i], 0);
const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const cosine = dot / (norm(a) * norm(b));

let w = -5.0, lr = 0.15;
for (let step = 0; step < 30; step++) w -= lr * (2 * (w - 3.0));

const probs = [0.88, 0.09, 0.03];
const ceLoss = -Math.log(probs[0]);

console.log("[Linear Algebra] Cosine(a,b) =", cosine.toFixed(4));
console.log("[Optimization] Converged w =", w.toFixed(4), "(target 3.0000)");
console.log("[Info Theory] Cross-Entropy =", ceLoss.toFixed(4), "nats");

assert(Math.abs(cosine - 1.0) < 1e-6, "Parallel vectors have exact cosine similarity 1.0");
assert(Math.abs(w - 3.0) < 0.01, "Gradient descent converged to w*=3.0");
assert(ceLoss < 0.2, "High confidence on true class produces low cross-entropy loss");
emitMetric("Cosine Sim", cosine.toFixed(3), "Angle = 0°", "optimal");
emitMetric("Converged w", w.toFixed(3), "Target 3.0", "optimal");
emitMetric("Cross-Entropy", ceLoss.toFixed(3), "nats", "optimal");`,
    pythonReference: `import numpy as np\ncosine = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))\nce_loss = float(-np.log(np.clip(probs[true_idx], 1e-12, 1.0)))`
  },

  // =========================================================================
  // TRACK 03 — DATA ANALYSIS & PREPROCESSING (10 TOPICS)
  // =========================================================================
  {
    id: 'ml26-03-data-prep',
    number: 3,
    phase: 'foundations',
    phaseLabel: 'Foundations',
    title: 'Data Analysis & Preprocessing',
    summary: 'Collect, clean, explore, impute, engineer, scale, detect outliers, transform, and split data leak-free.',
    architectAuditNote: '80% of real tabular ML performance comes from clean preprocessing and leak-free feature engineering—never fit scalers, imputers, or encoders before splitting train/val/test.',
    topics: [
      { id: 'dp-collect', title: 'Data Collection', explanation: 'Ingest structured SQL/Parquet tables, APIs, event streams, and logs with provenance metadata, consent checks, and schema contracts.', analogy: 'Sourcing fresh certified ingredients with farm-origin tags before cooking.', technicalDetail: 'Track source snapshot IDs and ingestion timestamps so datasets are auditable and replayable.', productionPitfall: 'Scraping/joining mutable live tables without snapshotting prevents reproducing training runs.', pythonSnippet: `df = pd.read_parquet("s3://lake/silver/orders_snapshot_2026_11.parquet")` },
      { id: 'dp-clean', title: 'Data Cleaning', explanation: 'Remove exact/fuzzy duplicates, standardize units/timezones (UTC), fix broken string encodings, and enforce valid domain ranges.', analogy: 'Washing and trimming vegetables before slicing.', technicalDetail: 'Deduplicate by deterministic primary key + latest `updated_at` and validate schema with Pandera/Pydantic.', productionPitfall: 'Duplicate rows split across train and test leak answers and inflate validation accuracy.', pythonSnippet: `df = df.drop_duplicates(subset=["event_id"], keep="last").query("amount_usd >= 0")` },
      { id: 'dp-eda', title: 'Exploratory Data Analysis (EDA)', explanation: 'Systematically profile distributions, target balance, missingness patterns (MCAR/MAR/MNAR), correlations, and temporal shifts before modeling.', analogy: 'Inspecting soil quality and drainage maps before designing a building foundation.', technicalDetail: 'Inspect skewness, cardinality, zero-inflation, target leakage columns (IDs/post-outcome fields), and train-vs-test covariate overlap.', productionPitfall: 'Jumping straight into `model.fit()` misses target-leaking columns like `cancellation_reason` in a churn dataset.', pythonSnippet: `print(df.isna().mean().sort_values(ascending=False).head(10))\nprint(df["target"].value_counts(normalize=True))` },
      { id: 'dp-missing', title: 'Missing Value Handling', explanation: 'Impute missing numeric values (median/KNN/iterative) and categorical values ("MISSING" bucket) while adding binary `_is_missing` indicator flags.', analogy: 'Marking a blank exam question as "skipped" instead of guessing zero—the skip itself is informative.', technicalDetail: 'Always fit `SimpleImputer` strictly on `X_train` and add `add_indicator=True` when missingness correlates with target.', productionPitfall: 'Filling missing age or income with `0` destroys linear models and shifts distributions.', pythonSnippet: `from sklearn.impute import SimpleImputer\nimp = SimpleImputer(strategy="median", add_indicator=True).fit(X_train)` },
      { id: 'dp-fe', title: 'Feature Engineering', explanation: 'Create domain-meaningful ratios, rolling windows, time-since-event lags, cyclical sin/cos encodings, and out-of-fold target encodings.', analogy: 'Giving a chef pre-chopped aromatics and stock instead of raw whole roots—good features expose signal directly.', technicalDetail: 'Compute interaction ratios (`spend / tenure`), rolling 7d/30d velocities, and smoothed out-of-fold target encoding.', productionPitfall: 'Computing rolling aggregations including the current future timestamp causes silent temporal leakage.', pythonSnippet: `df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)\ndf["spend_per_order"] = df["total_spend"] / df["order_count"].clip(lower=1)` },
      { id: 'dp-fs', title: 'Feature Selection', explanation: 'Prune noisy, redundant, or multicollinear features using permutation importance, mutual information, L1 Lasso, or Variance Inflation Factor (VIF).', analogy: 'Packing only essential climbing gear—extra useless weight slows you down and causes overfitting.', technicalDetail: 'Use recursive feature elimination or permutation importance on validation folds; drop features with near-zero variance or >0.95 correlation.', productionPitfall: 'Selecting features using the full dataset before CV leaks target information.', pythonSnippet: `from sklearn.feature_selection import mutual_info_classif\nmi = mutual_info_classif(X_train, y_train, random_state=42)` },
      { id: 'dp-scale', title: 'Data Normalization and Standardization', explanation: 'Rescale features via Z-score Standardization (`(x-μ)/σ`), Min-Max `[0,1]`, or `RobustScaler` (median/IQR) for distance- and gradient-based models.', analogy: 'Converting feet, miles, and kilometers into meters before comparing distances.', technicalDetail: 'Critical for Linear/Logistic Regression, SVM, KNN, PCA, and Neural Nets; tree models (XGBoost/RF) are monotonic-scale invariant.', productionPitfall: 'Fitting `StandardScaler` on train+test leaks test mean and variance.', pythonSnippet: `from sklearn.preprocessing import RobustScaler\nscaler = RobustScaler().fit(X_train)` },
      { id: 'dp-outlier', title: 'Outlier Detection', explanation: 'Identify extreme anomalies via IQR fences, Z-score / Modified Z-score (MAD), or Isolation Forest, then winsorize/cap or separate legitimate whales.', analogy: 'Distinguishing a sensor glitch reading 999°C from a genuine heatwave.', technicalDetail: 'Cap extreme numeric inputs at 1st/99th train percentiles (winsorization) rather than blindly deleting valid high-value customers.', productionPitfall: 'Deleting outliers from the test set artificially inflates offline metrics while failing on real production traffic.', pythonSnippet: `lo, hi = X_train["spend"].quantile([0.01, 0.99])\nX_train["spend"] = X_train["spend"].clip(lo, hi)` },
      { id: 'dp-transform', title: 'Data Transformation', explanation: 'Apply `log1p`, Box-Cox, Yeo-Johnson, quantile transforms, and one-hot/ordinal/frequency encoding to tame right-skewed revenue and categorical columns.', analogy: 'Switching a microscope lens so tiny and giant cells are both visible in one frame.', technicalDetail: 'Use `ColumnTransformer` + `Pipeline` so numeric log/scaling and categorical `OneHotEncoder(handle_unknown="ignore")` stay atomic.', productionPitfall: 'Unseen categories in production crash pipelines unless `handle_unknown="ignore"` is configured.', pythonSnippet: `from sklearn.compose import ColumnTransformer\nfrom sklearn.preprocessing import OneHotEncoder, PowerTransformer\npre = ColumnTransformer([("num", PowerTransformer(), num_cols), ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols)])` },
      { id: 'dp-split', title: 'Train, Validation, and Test Splitting', explanation: 'Partition data strictly into Train (fit weights), Validation (tune hyperparams/thresholds), and untouched Test (final unbiased estimate) using stratified, grouped, or temporal splits.', analogy: 'Practice worksheets (Train), mock exam (Validation), and sealed final exam (Test) that you never peek at early.', technicalDetail: 'Use `StratifiedKFold` for imbalanced classes, `GroupKFold` when users appear multiple times, and `TimeSeriesSplit` for time-ordered events.', productionPitfall: 'Randomly splitting multi-row user histories puts the same customer in both train and test (entity leakage).', pythonSnippet: `from sklearn.model_selection import GroupShuffleSplit\ngss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)\ntrain_idx, test_idx = next(gss.split(df, df["y"], groups=df["user_id"]))` }
    ],
    mermaidDfd: `flowchart LR
  RAW["Raw Collected Dataset"] --> CLEAN["Clean, Dedup & EDA"]
  CLEAN --> SPLIT["Strict Split FIRST (Train / Val / Test)"]
  SPLIT -->|Train Only| FIT["Fit Imputer, Winsorizer, Scaler & Encoders"]
  FIT --> PIPE["Serialized sklearn ColumnTransformer"]
  PIPE --> READY["Leak-Free Feature Matrices"]`,
    dfdNodeLabels: { RAW: 'Raw Data', CLEAN: 'Clean & EDA', SPLIT: 'Split First', FIT: 'Fit Train Only', PIPE: 'Pipeline', READY: 'Ready Features' },
    dfdSteps: [
      { step: 1, nodeId: 'CLEAN', title: 'Deduplication & Schema Guard', description: 'Drop duplicate keys and flag sentinel outliers before splitting.', payload: { raw_rows: 100000, dups_dropped: 1420, null_pct: 4.3 } },
      { step: 2, nodeId: 'SPLIT', title: 'Split Before Any Statistics', description: 'Lock 20% Test set aside by group/time boundary before computing any mean or median.', payload: { train: 64000, val: 16000, test_locked: 20000, leakage: false } },
      { step: 3, nodeId: 'FIT', title: 'Fit Preprocessors on Train Only', description: 'Learn medians, 99th-percentile caps, and category vocabularies strictly on Train.', payload: { median_age: 34, cap_p99_spend: 1850.0, unseen_cat_policy: 'ignore' } },
      { step: 4, nodeId: 'READY', title: 'Transform Val & Test Deterministically', description: 'Apply frozen Pipeline artifact identically during training and live serving.', payload: { train_shape: '[64000, 42]', test_shape: '[20000, 42]', status: 'READY' } }
    ],
    simTitle: 'Data Preprocessing, Outlier Capping & Leakage Impact Simulator',
    simSubtitle: 'Toggle split-before-fit hygiene, missingness flags, and outlier capping to measure real generalization vs. leakage illusion.',
    simControls: [
      { id: 'outlierPct', label: 'Corrupted Sensor Outliers', type: 'slider', min: 0, max: 15, step: 1, unit: '%', defaultValue: 4 },
      { id: 'missingPct', label: 'Missing Feature Rate', type: 'slider', min: 0, max: 35, step: 5, unit: '%', defaultValue: 15 },
      { id: 'splitFirst', label: 'Split Train/Test BEFORE Fitting Scaler/Imputer', type: 'toggle', defaultValue: true },
      { id: 'capOutliers', label: 'Winsorize Outliers + Add Missingness Flags', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const outPct = nVal(vals.outlierPct, 4)
      const missPct = nVal(vals.missingPct, 15)
      const splitFirst = bVal(vals.splitFirst, true)
      const cap = bVal(vals.capOutliers, true)
      const trueProdAuc = Number(Math.max(0.55, Math.min(0.94, 0.91 - (cap ? outPct * 0.002 : outPct * 0.016) - (cap ? missPct * 0.0008 : missPct * 0.003))).toFixed(3))
      const reportedValAuc = splitFirst ? trueProdAuc : Number(Math.min(0.985, trueProdAuc + 0.085).toFixed(3))
      const health = !splitFirst || (!cap && outPct >= 5) ? 'breaking' : missPct > 25 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: !splitFirst
          ? `Preprocessing Leakage: Val AUC (${reportedValAuc}) hides real Production AUC (${trueProdAuc})`
          : `Leak-Free Pipeline: Production AUC ${trueProdAuc} (${cap ? 'Outliers Capped & Missingness Flagged' : 'Raw Outliers Hurting Fit'})`,
        explanation: splitFirst
          ? 'Fitting imputers and winsorization quantiles strictly on Train guarantees honest validation metrics.'
          : 'Fitting scalers/encoders on train+test leaks test distribution stats, causing a sharp production drop.',
        kpis: [
          { label: 'Reported Val AUC', value: reportedValAuc.toFixed(3), sub: splitFirst ? 'Honest' : 'Inflated by leak', status: splitFirst ? 'optimal' : 'breaking' },
          { label: 'True Prod AUC', value: trueProdAuc.toFixed(3), sub: 'Unseen live traffic', status: trueProdAuc >= 0.85 ? 'optimal' : 'tradeoff' },
          { label: 'Leakage Gap', value: `${((reportedValAuc - trueProdAuc) * 100).toFixed(1)} pts`, sub: 'Target 0.0 pts', status: splitFirst ? 'optimal' : 'breaking' },
          { label: 'Outlier Resilience', value: cap ? 'Winsorized' : 'Exposed', sub: `${outPct}% extremes`, status: cap || outPct === 0 ? 'optimal' : 'breaking' }
        ],
        bars: [
          { label: 'Reported Offline AUC', pct: Math.round(reportedValAuc * 100), display: reportedValAuc.toFixed(3), tone: splitFirst ? 'primary' : 'warning' },
          { label: 'Real Production AUC', pct: Math.round(trueProdAuc * 100), display: trueProdAuc.toFixed(3), tone: trueProdAuc >= 0.85 ? 'positive' : 'danger' }
        ]
      }
    },
    playgroundTitle: 'Live Preprocessing Pipeline Sandbox: Median Impute + IQR Clip + Log1p',
    playgroundTask: 'Run a leak-free train/test preprocessing pipeline that clips extreme outliers using ONLY train quantiles and adds a missingness indicator.',
    executableCode: `// Track 03 — Leak-Free Imputation, Outlier Winsorization & Log1p Transform
const trainRaw = [12, 18, null, 24, 30, 999]; // 999 is a corrupted outlier
const testRaw  = [20, null, 45];

const validTrain = trainRaw.filter(x => x !== null).sort((a, b) => a - b);
const trainMedian = validTrain[Math.floor(validTrain.length / 2)];
const trainCap = validTrain[validTrain.length - 2]; // robust upper cap fitted on train only

const transform = arr => arr.map(v => {
  const wasMissing = v === null ? 1 : 0;
  const filled = v === null ? trainMedian : Math.min(v, trainCap);
  return { log1p: Number(Math.log1p(filled).toFixed(3)), wasMissing };
});

const outTrain = transform(trainRaw);
const outTest  = transform(testRaw);
console.log("[Train Fitted] median =", trainMedian, "| upperCap =", trainCap);
console.log("[Transformed Test]", JSON.stringify(outTest));

assert(trainCap === 30, "Robust cap (30) neutralized corrupted 999 outlier");
assert(outTest[1].wasMissing === 1, "Missingness indicator flag preserved for null test record");
emitMetric("Train Median", String(trainMedian), "Impute value", "optimal");
emitMetric("Outlier Cap", String(trainCap), "Clipped 999 -> 30", "optimal");
emitArtifact("Preprocessed Batches", { outTrain, outTest });`,
    pythonReference: `from sklearn.pipeline import Pipeline\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import FunctionTransformer, RobustScaler\npipe = Pipeline([("imp", SimpleImputer(strategy="median", add_indicator=True)), ("log", FunctionTransformer(np.log1p)), ("scale", RobustScaler())])`
  },

  // =========================================================================
  // TRACK 04 — MACHINE LEARNING FUNDAMENTALS (10 TOPICS)
  // =========================================================================
  {
    id: 'ml26-04-ml-fundamentals',
    number: 4,
    phase: 'foundations',
    phaseLabel: 'Foundations',
    title: 'Machine Learning Fundamentals',
    summary: 'Understand all 5 learning paradigms, overfitting/underfitting, bias-variance tradeoff, generalization, and cross-validation.',
    architectAuditNote: 'Before picking an algorithm, identify the learning paradigm (supervised vs. self-supervised vs. RL) and diagnose whether error is dominated by Bias (underfitting) or Variance (overfitting).',
    topics: [
      { id: 'mlf-sup', title: 'Supervised Learning', explanation: 'Learns a mapping $f(x) \\to y$ from labeled input-output pairs (prices, fraud labels, medical diagnoses).', analogy: 'Flashcards with questions on the front and verified answers on the back.', technicalDetail: 'Minimizes empirical risk $\\frac{1}{n}\\sum L(f(x_i), y_i) + \\lambda R(f)$ over regression or classification targets.', productionPitfall: 'Label noise or delayed ground-truth labels silently cap achievable accuracy.', pythonSnippet: `model.fit(X_train, y_train)\npreds = model.predict(X_test)` },
      { id: 'mlf-unsup', title: 'Unsupervised Learning', explanation: 'Discovers hidden clusters, latent dimensions, density anomalies, or co-occurrence rules from unlabeled data $X$ alone.', analogy: 'Sorting a box of unlabeled mixed hardware into natural groups by shape and size.', technicalDetail: 'Evaluated via intrinsic structure (silhouette, reconstruction error) or downstream business lift.', productionPitfall: 'Assuming discovered clusters automatically map to actionable business segments without human review.', pythonSnippet: `clusters = KMeans(n_clusters=5, n_init="auto").fit_predict(X_scaled)` },
      { id: 'mlf-semi', title: 'Semi-Supervised Learning', explanation: 'Combines a small labeled dataset with a huge unlabeled pool using pseudo-labeling or consistency regularization.', analogy: 'A teacher grading 10 essays, then letting the student practice on 1,000 ungraded essays using confident self-checks.', technicalDetail: 'Filter pseudo-labels strictly at high confidence ($>0.95$) to avoid confirmation bias amplification.', productionPitfall: 'Pseudo-labeling with an uncalibrated classifier locks in early model errors.', pythonSnippet: `mask = probs.max(axis=1) > 0.95\nX_aug = np.vstack([X_labeled, X_unlabeled[mask]])` },
      { id: 'mlf-self', title: 'Self-Supervised Learning', explanation: 'Generates supervision signals directly from raw data (predicting next tokens in GPT/Claude or masked patches in vision) without human labels.', analogy: 'Covering the last word of every sentence in a million books to master language structure on your own.', technicalDetail: 'Foundation of all modern LLMs and embeddings; produces transferable representations fine-tuned cheaply downstream.', productionPitfall: 'Unfiltered web duplicates cause memorization instead of generalized representations.', pythonSnippet: `# Autoregressive self-supervision: input = tokens[:-1], target = tokens[1:]\nloss = F.cross_entropy(logits[:, :-1].reshape(-1, V), tokens[:, 1:].reshape(-1))` },
      { id: 'mlf-rl', title: 'Reinforcement Learning', explanation: 'An agent learns a policy $\\pi(a|s)$ through sequential environment interaction and delayed scalar rewards.', analogy: 'Training a dog with treats over multi-step tricks rather than showing static flashcards.', technicalDetail: 'Balances exploration vs. exploitation under Markov Decision Processes; powers robotics, games, and LLM RLHF/GRPO.', productionPitfall: 'Poorly specified rewards invite reward hacking (high proxy score, bad real behavior).', pythonSnippet: `# Q-update: Q(s,a) += alpha * (r + gamma * max_a' Q(s',a') - Q(s,a))` },
      { id: 'mlf-traintest', title: 'Training and Testing', explanation: 'Training fits parameters to minimize training loss; Testing measures generalization strictly on unseen data held out from every design choice.', analogy: 'Never study from the exact final exam paper—your score must reflect real understanding.', technicalDetail: 'Keep the test set sealed until final model selection; track train-vs-val learning curves every epoch.', productionPitfall: 'Tuning hyperparameters 50 times on the test set turns the test set into a leaky validation set.', pythonSnippet: `X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.3)\nX_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.5)` },
      { id: 'mlf-overunder', title: 'Overfitting and Underfitting', explanation: 'Underfitting means the model is too simple to capture signal (high train & val error); Overfitting means it memorizes noise (low train error, high val error).', analogy: 'Underfitting = guessing everyone’s height is 5’8”; Overfitting = memorizing each person’s shoe brand to guess their height.', technicalDetail: 'Fix underfitting with richer features/higher capacity; fix overfitting with more data, regularization (L2/dropout), early stopping, or simpler models.', productionPitfall: 'Celebrated 99.8% training accuracy often hides terrible 62% validation accuracy.', pythonSnippet: `gap = train_score - val_score\nstatus = "OVERFITTING" if gap > 0.08 else "HEALTHY"` },
      { id: 'mlf-bv', title: 'Bias-Variance Tradeoff', explanation: 'Expected squared error decomposes into $\\text{Bias}^2 + \\text{Variance} + \\text{Irreducible Noise}$. Complexity lowers bias while increasing sensitivity to data sampling (variance).', analogy: 'Archery: High Bias = arrows clustered off-center; High Variance = arrows scattered all over the target.', technicalDetail: 'Bagging (Random Forests) cuts variance; Boosting (XGBoost) systematically reduces bias; regularization dials the balance.', productionPitfall: 'Ignoring irreducible noise leads to chasing endless over-complex models that only fit randomness.', pythonSnippet: `# Tune regularization alpha across log-grid to locate minimum total error\nfrom sklearn.linear_model import RidgeCV\nmodel = RidgeCV(alphas=np.logspace(-3, 3, 25)).fit(X_train, y_train)` },
      { id: 'mlf-gen', title: 'Model Generalization', explanation: 'The true goal of ML: accurate predictions on future, shifted, unseen real-world inputs—not memorization of historical training tables.', analogy: 'A driver who can navigate an unfamiliar city in the rain, not just one memorized parking lot.', technicalDetail: 'Verify generalization across slice subgroups (new regions, new users, recent months), not just aggregate averages.', productionPitfall: 'Spurious shortcuts (e.g., hospital watermark on X-rays) pass IID tests but fail completely at new hospitals.', pythonSnippet: `# Evaluate slice generalization across unseen time period\nrecent_auc = roc_auc_score(y_recent, model.predict_proba(X_recent)[:, 1])` },
      { id: 'mlf-cv', title: 'Cross-Validation', explanation: 'K-Fold CV rotates K validation folds so every sample is evaluated out-of-fold, giving a low-variance estimate of generalization with confidence bounds.', analogy: 'Testing a candidate chef across 5 different dinner services instead of judging by one lucky Tuesday.', technicalDetail: 'Use `StratifiedKFold(5)` for classification, `GroupKFold` for repeated entities, and `TimeSeriesSplit` for chronological series.', productionPitfall: 'Running preprocessing outside the CV loop leaks fold statistics across splits.', pythonSnippet: `from sklearn.model_selection import cross_val_score, StratifiedKFold\nscores = cross_val_score(pipe, X, y, cv=StratifiedKFold(5), scoring="roc_auc")` }
    ],
    mermaidDfd: `flowchart LR
  DATA["Dataset (Labeled / Unlabeled)"] --> PARA{"Paradigm Router"}
  PARA --> CV["K-Fold / Temporal Cross-Validation"]
  CV --> FIT["Train Candidate Model"]
  FIT --> DIAG{"Bias-Variance Diagnosis"}
  DIAG -->|High Bias| CAP["Add Features / Capacity"]
  DIAG -->|High Variance| REG["Regularize / More Data / Bagging"]
  DIAG -->|Balanced| GEN["Final Sealed Test Generalization"]`,
    dfdNodeLabels: { DATA: 'Dataset', PARA: 'Paradigm', CV: 'Cross-Validation', FIT: 'Model Fit', DIAG: 'Bias-Variance', CAP: 'Fix Underfit', REG: 'Fix Overfit', GEN: 'Sealed Test' },
    dfdSteps: [
      { step: 1, nodeId: 'CV', title: 'Out-of-Fold Cross-Validation', description: 'Rotate 5 stratified folds so every row is validated cleanly out-of-sample.', payload: { folds: 5, mean_val_score: 0.884, std: 0.011 } },
      { step: 2, nodeId: 'DIAG', title: 'Bias-Variance Gap Audit', description: 'Compare Train vs. Validation error to diagnose underfitting vs. overfitting.', payload: { train_err: 0.09, val_err: 0.116, gap: 0.026, state: 'BALANCED' } },
      { step: 3, nodeId: 'REG', title: 'Regularization & Capacity Sweep', description: 'Apply L2 penalty / depth constraints to minimize total Bias² + Variance.', payload: { best_lambda: 1.0, val_err_drop: '-4.2%' } },
      { step: 4, nodeId: 'GEN', title: 'Final Sealed Test Evaluation', description: 'Evaluate once on untouched future test set across slices.', payload: { test_auc: 0.879, slice_min_auc: 0.841, ship: true } }
    ],
    simTitle: 'Bias-Variance Tradeoff & K-Fold Cross-Validation Simulator',
    simSubtitle: 'Adjust model complexity, regularization strength, and sample size to watch Bias², Variance, and Generalization error move.',
    simControls: [
      { id: 'complexity', label: 'Model Complexity (Poly Degree / Tree Depth)', type: 'slider', min: 1, max: 15, step: 1, unit: 'lvl', defaultValue: 6 },
      { id: 'regLambda', label: 'Regularization Strength (λ)', type: 'slider', min: 0, max: 10, step: 0.5, unit: 'λ', defaultValue: 2.0 },
      { id: 'sampleSizeK', label: 'Training Sample Size', type: 'slider', min: 1, max: 50, step: 1, unit: 'k rows', defaultValue: 15 }
    ],
    runSim: vals => {
      const c = nVal(vals.complexity, 6)
      const lam = nVal(vals.regLambda, 2.0)
      const nK = nVal(vals.sampleSizeK, 15)
      const effC = Math.max(1, c - lam * 0.45)
      const biasSq = Number((26 * Math.exp(-effC * 0.45) + 1.5).toFixed(1))
      const variance = Number((Math.pow(effC, 1.85) * (4.5 / Math.sqrt(nK)) * (1 / (1 + lam * 0.25))).toFixed(1))
      const noise = 3.0
      const trainErr = Number(Math.max(1.5, biasSq * 0.7 + noise * 0.6).toFixed(1))
      const testErr = Number((biasSq + variance + noise).toFixed(1))
      const gap = Number((testErr - trainErr).toFixed(1))
      const state = biasSq > 14 ? 'Underfitting (High Bias)' : variance > 14 ? 'Overfitting (High Variance)' : 'Balanced Generalization'
      const health = state === 'Balanced Generalization' ? 'optimal' : testErr > 28 ? 'breaking' : 'tradeoff'
      return {
        health,
        headline: `${state}: Total Test Error = ${testErr}% (Bias² ${biasSq}% + Variance ${variance}% + Noise 3%)`,
        explanation: `Complexity=${c} with λ=${lam} and ${nK}k samples produces a train-vs-test gap of ${gap} pts.`,
        kpis: [
          { label: 'Bias² Error', value: `${biasSq}%`, sub: biasSq > 12 ? 'Too simple' : 'Captures signal', status: biasSq <= 10 ? 'optimal' : 'breaking' },
          { label: 'Variance Error', value: `${variance}%`, sub: variance > 12 ? 'Memorizing noise' : 'Stable across folds', status: variance <= 10 ? 'optimal' : 'breaking' },
          { label: 'Total Test Error', value: `${testErr}%`, sub: `Train ${trainErr}%`, status: testErr <= 16 ? 'optimal' : testErr <= 26 ? 'tradeoff' : 'breaking' },
          { label: 'Train-Test Gap', value: `${gap} pts`, sub: 'Overfit signal', status: gap <= 8 ? 'optimal' : gap <= 15 ? 'tradeoff' : 'breaking' }
        ],
        bars: [
          { label: 'Bias² Component', pct: Math.min(100, Math.round(biasSq * 3)), display: `${biasSq}%`, tone: biasSq > 12 ? 'danger' : 'primary' },
          { label: 'Variance Component', pct: Math.min(100, Math.round(variance * 3)), display: `${variance}%`, tone: variance > 12 ? 'danger' : 'warning' },
          { label: 'Generalization Score', pct: Math.max(10, Math.round(100 - testErr)), display: `${(100 - testErr).toFixed(1)}%`, tone: health === 'optimal' ? 'positive' : 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live 5-Fold Cross-Validation & Overfitting Detector',
    playgroundTask: 'Run an automated 5-fold cross-validation scorer that computes mean ± std accuracy and flags high-variance overfitting.',
    executableCode: `// Track 04 — 5-Fold CV Statistics & Automated Bias/Variance Diagnosis
const foldTrainAcc = [0.92, 0.91, 0.93, 0.92, 0.91];
const foldValAcc   = [0.88, 0.89, 0.87, 0.88, 0.89]; // Try lowering to 0.72 to trigger overfitting!

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const std  = arr => Math.sqrt(arr.reduce((s, x) => s + (x - mean(arr)) ** 2, 0) / arr.length);

const trMean = mean(foldTrainAcc);
const vaMean = mean(foldValAcc);
const vaStd  = std(foldValAcc);
const gap    = trMean - vaMean;
const diagnosis = vaMean < 0.75 && gap < 0.04 ? "UNDERFITTING" : gap > 0.08 ? "OVERFITTING" : "WELL_GENERALIZED";

console.log("[5-Fold CV] Train =", (trMean*100).toFixed(1) + "% | Val =", (vaMean*100).toFixed(1) + "% ± " + (vaStd*100).toFixed(2) + "%");
console.log("[Diagnosis]", diagnosis, "| Generalization Gap =", (gap*100).toFixed(1) + " pts");

assert(diagnosis === "WELL_GENERALIZED", "Model generalized cleanly across all 5 folds (" + diagnosis + ")");
assert(vaStd < 0.03, "Low cross-fold variance (std=" + (vaStd*100).toFixed(2) + "% < 3%)");
emitMetric("CV Val Mean", (vaMean*100).toFixed(1) + "%", "±" + (vaStd*100).toFixed(2) + "%", "optimal");
emitMetric("Train-Val Gap", (gap*100).toFixed(1) + " pts", diagnosis, gap <= 0.08 ? "optimal" : "breaking");`,
    pythonReference: `from sklearn.model_selection import cross_validate\nres = cross_validate(pipe, X, y, cv=5, return_train_score=True)\nprint("Train:", res["train_score"].mean(), "Val:", res["test_score"].mean())`
  },

  // =========================================================================
  // TRACK 05 — SUPERVISED LEARNING (9 TOPICS)
  // =========================================================================
  {
    id: 'ml26-05-supervised',
    number: 5,
    phase: 'classical-ml',
    phaseLabel: 'Classical ML',
    title: 'Supervised Learning',
    summary: 'Master Linear & Logistic Regression, Trees, Random Forests, SVM, KNN, Naive Bayes, and Gradient Boosting (XGBoost, LightGBM, CatBoost).',
    architectAuditNote: 'On structured tabular datasets, Gradient Boosted Decision Trees (XGBoost/LightGBM/CatBoost) still dominate deep learning in accuracy, speed, and cost—always benchmark Logistic/Linear baselines first.',
    topics: [
      { id: 'sup-linreg', title: 'Linear Regression', explanation: 'Predicts continuous targets via a weighted linear hyperplane $\\hat{y} = w^Tx + b$ minimizing Mean Squared Error (with L2 Ridge / L1 Lasso regularization).', analogy: 'Drawing the cleanest straight trendline through house square-footage vs. sale price.', technicalDetail: 'Closed-form Normal Equation $(X^TX + \\lambda I)^{-1}X^Ty$ or SGD; inspect residual plots for heteroscedasticity and collinearity.', productionPitfall: 'Unregularized OLS explodes when correlated features exist or outliers pull the line.', pythonSnippet: `from sklearn.linear_model import Ridge\nmodel = Ridge(alpha=1.0).fit(X_train, y_train)` },
      { id: 'sup-logreg', title: 'Logistic Regression', explanation: 'Linear log-odds model passed through a Sigmoid $\\sigma(w^Tx+b) \\in (0,1)$ trained with convex Binary Cross-Entropy (Log Loss).', analogy: 'A smooth dimmer switch converting a risk score into calibrated 0%–100% probability.', technicalDetail: 'Fast, naturally well-calibrated, globally optimal convex objective, and directly interpretable via odds ratios $e^{w_i}$.', productionPitfall: 'Cannot capture nonlinear feature interactions unless engineered manually (polynomials/splines).', pythonSnippet: `from sklearn.linear_model import LogisticRegression\nclf = LogisticRegression(C=1.0, class_weight="balanced").fit(X_train, y_train)` },
      { id: 'sup-trees', title: 'Decision Trees', explanation: 'Recursively partitions feature space via greedy splits maximizing Information Gain (Entropy/Gini impurity reduction).', analogy: 'A flowchart of simple yes/no questions ("Income > $60k?" → "Tenure > 2y?").', technicalDetail: 'Handles nonlinearities and missing/mixed scales natively, but deep unconstrained trees have massive variance (overfit).', productionPitfall: 'Unconstrained `max_depth=None` memorizes single training rows.', pythonSnippet: `from sklearn.tree import DecisionTreeClassifier\ntree = DecisionTreeClassifier(max_depth=5, min_samples_leaf=20).fit(X_train, y_train)` },
      { id: 'sup-rf', title: 'Random Forests', explanation: 'Ensemble of hundreds of decorrelated decision trees trained on bootstrapped row samples + random feature subsets, averaging predictions (Bagging).', analogy: 'Polling 200 independent domain experts with slightly different views—their averaged vote cancels individual quirks.', technicalDetail: 'Drastically cuts variance with minimal hyperparameter sensitivity; provides Out-Of-Bag (OOB) validation estimates.', productionPitfall: 'Cannot extrapolate numeric trends beyond the training range; large forests consume high RAM.', pythonSnippet: `from sklearn.ensemble import RandomForestClassifier\nrf = RandomForestClassifier(n_estimators=300, max_features="sqrt", n_jobs=-1).fit(X_train, y_train)` },
      { id: 'sup-svm', title: 'Support Vector Machines (SVM)', explanation: 'Finds the maximum-margin hyperplane separating classes; the Kernel Trick (RBF, polynomial) maps data into higher dimensions implicitly.', analogy: 'Building the widest possible highway buffer between two neighboring towns.', technicalDetail: 'Controlled by margin penalty `C` and RBF kernel width `gamma`; strictly requires scaled features.', productionPitfall: 'Kernel SVM training scales $O(N^2\\text{--}N^3)$—impractical beyond ~100k rows without linear approximations.', pythonSnippet: `from sklearn.svm import SVC\nsvm = SVC(C=1.0, kernel="rbf", probability=True).fit(X_train_scaled, y_train)` },
      { id: 'sup-knn', title: 'K-Nearest Neighbors (KNN)', explanation: 'Non-parametric lazy learner predicting by majority vote or distance-weighted average of the $K$ closest training neighbors.', analogy: 'Estimating your home’s value by averaging the 5 most similar houses sold on your block.', technicalDetail: 'Small $K$ overfits noise; large $K$ oversmooths. Use KD-Trees / HNSW ANN indexes for fast lookup at scale.', productionPitfall: 'Curse of dimensionality makes Euclidean distances meaningless in high-dimensional unscaled spaces.', pythonSnippet: `from sklearn.neighbors import KNeighborsClassifier\nknn = KNeighborsClassifier(n_neighbors=7, weights="distance").fit(X_train_scaled, y_train)` },
      { id: 'sup-nb', title: 'Naive Bayes', explanation: 'Fast probabilistic classifier applying Bayes’ theorem under conditional feature independence ($P(x_1..x_d|y) = \\prod P(x_i|y)$).', analogy: 'Spotting spam emails by multiplying independent word-clue odds ("lottery", "urgent", "wire").', technicalDetail: 'MultinomialNB with Laplace smoothing (`alpha=1.0`) is an ultra-fast baseline for text/spam classification.', productionPitfall: 'Correlated features double-count evidence, pushing predicted probabilities toward extreme 0 or 1.', pythonSnippet: `from sklearn.naive_bayes import MultinomialNB\nnb = MultinomialNB(alpha=1.0).fit(X_tfidf_train, y_train)` },
      { id: 'sup-gb', title: 'Gradient Boosting', explanation: 'Sequentially builds shallow weak trees where each new tree fits the negative gradient (pseudo-residuals) of the previous ensemble’s loss.', analogy: 'A golfer taking a drive, then each successive putt specifically corrects the remaining distance to the hole.', technicalDetail: 'Shrinkage learning rate $\\eta$ + subsampling prevents overfitting; systematically minimizes bias.', productionPitfall: 'Too many boosting rounds without early stopping memorizes training residuals.', pythonSnippet: `from sklearn.ensemble import HistGradientBoostingClassifier\ngb = HistGradientBoostingClassifier(learning_rate=0.05, max_iter=300, early_stopping=True).fit(X_tr, y_tr)` },
      { id: 'sup-xgb-lgb-cat', title: 'XGBoost, LightGBM & CatBoost', explanation: 'Production GBDT powerhouses: XGBoost (regularized 2nd-order Newton splits), LightGBM (leaf-wise histogram speed), CatBoost (symmetric trees + ordered categorical encoding).', analogy: 'Three Formula-1 race cars engineered specifically to dominate structured tabular data.', technicalDetail: 'LightGBM excels on millions of rows; CatBoost excels on heavy categorical features with zero target leakage; XGBoost is the battle-tested general standard.', productionPitfall: 'Deep leaf-wise LightGBM trees (`num_leaves` too high) overfit small datasets (<10k rows).', pythonSnippet: `from xgboost import XGBClassifier\nxgb = XGBClassifier(n_estimators=500, max_depth=6, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8)\nxgb.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)` }
    ],
    mermaidDfd: `flowchart LR
  IN["Labeled Tabular Matrix (X, y)"] --> BASE["Fast Linear / Logistic Baseline"]
  BASE --> TREE["Ensemble Switch: RF (Bagging) vs GBDT (Boosting)"]
  TREE --> RESID["Residual Gradient Trees (XGB / LGBM / CatBoost)"]
  RESID --> EARLY["Validation Early Stopping"]
  EARLY --> PRED["Calibrated Tabular Predictions"]`,
    dfdNodeLabels: { IN: 'Labeled Data', BASE: 'Linear Baseline', TREE: 'Ensemble Choice', RESID: 'GBDT Residuals', EARLY: 'Early Stopping', PRED: 'Predictions' },
    dfdSteps: [
      { step: 1, nodeId: 'BASE', title: 'Fast Linear Benchmark', description: 'Always measure Logistic/Ridge first to establish a cheap, explainable floor.', payload: { baseline_model: 'LogisticRegression', auc: 0.812, latency_ms: 0.4 } },
      { step: 2, nodeId: 'RESID', title: 'Sequential Residual Boosting', description: 'Each shallow tree (depth 6) fits second-order gradients of prior errors.', payload: { trees: 280, learning_rate: 0.05, train_logloss: 0.142 } },
      { step: 3, nodeId: 'EARLY', title: 'Early Stopping Guard', description: 'Halt boosting when validation log-loss stops improving for 30 rounds.', payload: { best_iter: 245, val_auc: 0.941, overfit_prevented: true } },
      { step: 4, nodeId: 'PRED', title: 'Low-Latency Tabular Inference', description: 'Serve sub-5ms predictions with full TreeSHAP explanations.', payload: { p99_ms: 3.1, model: 'LightGBM', auc_gain: '+12.9 pts' } }
    ],
    simTitle: 'Supervised Model Selector & Gradient Boosting Depth/LR Simulator',
    simSubtitle: 'Tune boosting rounds, tree depth, learning rate, and dataset nonlinearity to balance accuracy, overfitting, and latency.',
    simControls: [
      { id: 'nTrees', label: 'Boosting Trees (n_estimators)', type: 'slider', min: 20, max: 600, step: 20, unit: 'trees', defaultValue: 220 },
      { id: 'maxDepth', label: 'Max Tree Depth', type: 'slider', min: 2, max: 14, step: 1, unit: 'depth', defaultValue: 6 },
      { id: 'lr', label: 'Boosting Learning Rate (η)', type: 'slider', min: 0.01, max: 0.4, step: 0.01, unit: 'η', defaultValue: 0.05 },
      { id: 'earlyStop', label: 'Enable Validation Early Stopping', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const trees = nVal(vals.nTrees, 220)
      const depth = nVal(vals.maxDepth, 6)
      const lr = nVal(vals.lr, 0.05)
      const es = bVal(vals.earlyStop, true)
      const effTrees = es ? Math.min(trees, Math.round(14 / Math.max(0.01, lr))) : trees
      const overfitPenalty = Math.max(0, (depth - 7) * 1.4 + (es ? 0 : Math.max(0, effTrees * lr - 16) * 0.45))
      const valAuc = Number(Math.max(0.68, Math.min(0.958, 0.78 + Math.min(0.16, Math.log(effTrees * lr + 1) * 0.068) + Math.min(0.03, depth * 0.005) - overfitPenalty * 0.012)).toFixed(3))
      const trainAuc = Number(Math.min(0.998, valAuc + 0.015 + overfitPenalty * 0.018).toFixed(3))
      const latencyMs = Number((0.4 + effTrees * depth * 0.0022).toFixed(2))
      const health = overfitPenalty > 4 ? 'breaking' : valAuc < 0.88 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: overfitPenalty > 4
          ? `GBDT Overfitting: Train AUC ${trainAuc} vs Val AUC ${valAuc} (reduce depth or enable early stopping)`
          : `Strong GBDT Fit: Val AUC ${valAuc} across ${effTrees} active trees (${latencyMs} ms p50)`,
        explanation: `Shallow regularized trees (depth 4–7) with small shrinkage (η=0.03–0.08) and early stopping achieve top tabular generalization at millisecond latency.`,
        kpis: [
          { label: 'Validation AUC', value: valAuc.toFixed(3), sub: `Train ${trainAuc.toFixed(3)}`, status: valAuc >= 0.91 ? 'optimal' : valAuc >= 0.85 ? 'tradeoff' : 'breaking' },
          { label: 'Active Trees', value: `${effTrees}`, sub: es ? 'Early stopped' : 'All iterations', status: 'optimal' },
          { label: 'Inference Latency', value: `${latencyMs} ms`, sub: 'CPU single-row', status: latencyMs < 5 ? 'optimal' : 'tradeoff' },
          { label: 'Overfit Gap', value: `${((trainAuc - valAuc) * 100).toFixed(1)} pts`, sub: 'Train − Val', status: trainAuc - valAuc < 0.04 ? 'optimal' : 'breaking' }
        ],
        bars: [
          { label: 'Validation AUC', pct: Math.round(valAuc * 100), display: valAuc.toFixed(3), tone: 'positive' },
          { label: 'Linear Baseline AUC', pct: 81, display: '0.810', tone: 'primary' },
          { label: 'Overfit Penalty', pct: Math.min(100, Math.round(overfitPenalty * 10)), display: `${overfitPenalty.toFixed(1)} pts`, tone: overfitPenalty > 4 ? 'danger' : 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live Supervised Learning Sandbox: Logistic Regression vs. Gini Split',
    playgroundTask: 'Train a real Logistic Regression classifier via gradient descent and compute Gini Impurity gain for a Decision Tree split live.',
    executableCode: `// Track 05 — Live Logistic Regression GD + Decision Tree Gini Gain
const sigmoid = z => 1 / (1 + Math.exp(-z));
const data = [{x:-3,y:0},{x:-2,y:0},{x:-1,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1}];
let w = 0, b = 0, lr = 0.25;
for (let ep = 0; ep < 80; ep++) {
  let gw = 0, gb = 0;
  for (const r of data) {
    const err = sigmoid(w * r.x + b) - r.y;
    gw += err * r.x; gb += err;
  }
  w -= (lr * gw) / data.length; b -= (lr * gb) / data.length;
}
const acc = data.filter(r => (sigmoid(w * r.x + b) >= 0.5 ? 1 : 0) === r.y).length / data.length;

// Gini Impurity before/after split at x = 0
const gini = p => 1 - p * p - (1 - p) * (1 - p);
const parentGini = gini(0.5);
const splitGain = parentGini - (0.5 * gini(0) + 0.5 * gini(1));

console.log("[Logistic Regression] w =", w.toFixed(3), "b =", b.toFixed(3), "| Accuracy =", (acc*100) + "%");
console.log("[Decision Tree Split] Parent Gini =", parentGini, "| Info Gain =", splitGain);

assert(acc === 1.0, "Logistic regression separated linearly separable classes 100%");
assert(splitGain === 0.5, "Pure decision tree split achieved maximal Gini gain 0.50");
emitMetric("LogReg Accuracy", (acc*100).toFixed(0) + "%", "w=" + w.toFixed(2), "optimal");
emitMetric("Tree Gini Gain", splitGain.toFixed(2), "Pure split", "optimal");`,
    pythonReference: `from lightgbm import LGBMClassifier\nclf = LGBMClassifier(n_estimators=400, learning_rate=0.05, num_leaves=31)\nclf.fit(X_train, y_train, eval_set=[(X_val, y_val)])`
  },

  // =========================================================================
  // TRACK 06 — UNSUPERVISED LEARNING (8 TOPICS)
  // =========================================================================
  {
    id: 'ml26-06-unsupervised',
    number: 6,
    phase: 'classical-ml',
    phaseLabel: 'Classical ML',
    title: 'Unsupervised Learning',
    summary: 'Discover clusters, latent structure, anomalies, mixtures, and association rules without target labels.',
    architectAuditNote: 'Unsupervised models have no ground-truth label during training—always scale features first, validate cluster stability (Silhouette / Davies-Bouldin), and verify business actionability.',
    topics: [
      { id: 'unsup-kmeans', title: 'K-Means Clustering', explanation: 'Partitions points into $K$ spherical clusters by alternating nearest-centroid assignment and centroid mean updates (minimizing inertia).', analogy: 'Placing $K$ delivery depots at the geographic center of the neighborhoods they serve.', technicalDetail: 'Use `k-means++` initialization and choose $K$ via Elbow curve + Silhouette Score; strictly requires standardized features.', productionPitfall: 'Fails on non-spherical crescents, varying cluster densities, or unscaled features.', pythonSnippet: `km = KMeans(n_clusters=4, init="k-means++", n_init="auto").fit(X_scaled)` },
      { id: 'unsup-hier', title: 'Hierarchical Clustering', explanation: 'Builds a bottom-up (agglomerative) or top-down tree (dendrogram) merging closest clusters by Ward, complete, or average linkage.', analogy: 'Building a biological family tree from species up to kingdoms so you can slice at any granularity.', technicalDetail: 'No need to pre-specify $K$; Ward linkage minimizes within-cluster variance.', productionPitfall: 'Memory scales $O(N^2)$ due to pairwise distance matrices—avoid above ~30k rows.', pythonSnippet: `from sklearn.cluster import AgglomerativeClustering\nlabels = AgglomerativeClustering(n_clusters=4, linkage="ward").fit_predict(X_scaled)` },
      { id: 'unsup-dbscan', title: 'DBSCAN', explanation: 'Density-based clustering that groups dense core regions of arbitrary shape and explicitly labels sparse outliers as noise (`-1`).', analogy: 'Spotting glowing cities from an airplane window at night while ignoring isolated farmhouses.', technicalDetail: 'Controlled by radius `eps` and `min_samples`; HDBSCAN extends it to handle varying densities automatically.', productionPitfall: 'Sensitive to `eps` scaling and struggles in high dimensions without PCA/UMAP first.', pythonSnippet: `from sklearn.cluster import DBSCAN\nlabels = DBSCAN(eps=0.5, min_samples=10).fit_predict(X_scaled)` },
      { id: 'unsup-pca', title: 'Principal Component Analysis (PCA)', explanation: 'Orthogonal linear projection onto top eigenvectors of the covariance matrix capturing maximum variance in fewer dimensions.', analogy: 'Shining a flashlight on a 3D sculpture from the angle that casts the most informative 2D shadow.', technicalDetail: 'Select components retaining 90%–95% cumulative explained variance; fit strictly on `X_train` after standardization.', productionPitfall: 'PCA maximizes variance, not class separability—high-variance noise can drown subtle target signals.', pythonSnippet: `from sklearn.decomposition import PCA\npca = PCA(n_components=0.95).fit(X_train_scaled)` },
      { id: 'unsup-dimred', title: 'Dimensionality Reduction', explanation: 'Compresses high-dimensional embeddings via linear (PCA, TruncatedSVD) or nonlinear manifold methods (t-SNE, UMAP) for visualization and speed.', analogy: 'Folding an origami map into a pocket guide while preserving which landmarks sit next to each other.', technicalDetail: 'Use PCA/SVD for ML feature pipelines; use UMAP/t-SNE primarily for 2D visual inspection of embedding spaces.', productionPitfall: 'Interpreting global distances between separated t-SNE islands is mathematically invalid.', pythonSnippet: `from sklearn.decomposition import TruncatedSVD\nX_red = TruncatedSVD(n_components=64).fit_transform(X_sparse_tfidf)` },
      { id: 'unsup-anom', title: 'Anomaly Detection', explanation: 'Flags rare, novel faults (fraud, sensor failure, intrusions) via Isolation Forest, One-Class SVM, Local Outlier Factor (LOF), or Autoencoder reconstruction error.', analogy: 'A security guard who knows what normal lobby traffic looks like and immediately notices someone climbing through a vent.', technicalDetail: 'Isolation Forest isolates anomalies with fewer random tree splits (`O(N log N)`), scaling smoothly to millions of rows.', productionPitfall: 'Setting `contamination` too high floods on-call analysts with alert fatigue.', pythonSnippet: `from sklearn.ensemble import IsolationForest\niso = IsolationForest(contamination=0.01, random_state=42).fit(X_train)` },
      { id: 'unsup-gmm', title: 'Gaussian Mixture Models', explanation: 'Probabilistic soft clustering modeling data as a weighted mixture of elliptical Gaussians fitted via Expectation-Maximization (EM).', analogy: 'Recognizing overlapping bell curves of heights instead of drawing rigid hard borders.', technicalDetail: 'Outputs soft membership probabilities $P(z=k|x)$ and uses BIC/AIC to choose component count.', productionPitfall: 'Full covariance matrices can collapse to singular spikes without `reg_covar`.', pythonSnippet: `from sklearn.mixture import GaussianMixture\ngmm = GaussianMixture(n_components=4, covariance_type="full").fit(X_scaled)` },
      { id: 'unsup-assoc', title: 'Association Rule Learning', explanation: 'Mines frequent itemsets and co-purchase rules ($A \\Rightarrow B$) using Apriori or FP-Growth ranked by Support, Confidence, and Lift.', analogy: 'Discovering that shoppers who put tortilla chips and salsa in their basket are 3.4× more likely to grab guacamole.', technicalDetail: 'Filter by Lift > 1.2 (true positive association above random chance), not high Confidence alone.', productionPitfall: 'High-confidence rules pointing to ubiquitous staples (e.g., milk/bags) have Lift ≈ 1.0 and zero marketing value.', pythonSnippet: `# Lift(A -> B) = P(A and B) / (P(A) * P(B))\nlift = support_ab / (support_a * support_b)` }
    ],
    mermaidDfd: `flowchart LR
  UNL["Unlabeled Feature Matrix"] --> SC["Standardize Features"]
  SC --> PCA["PCA / UMAP Compression"]
  PCA --> CLUST["K-Means / DBSCAN / GMM / IsolationForest"]
  CLUST --> VAL["Silhouette, BIC & Anomaly Rate Audit"]
  VAL --> ACT["Customer Segments / Fraud Alerts"]`,
    dfdNodeLabels: { UNL: 'Unlabeled Data', SC: 'Scale Features', PCA: 'PCA Reduction', CLUST: 'Clustering / Anomaly', VAL: 'Intrinsic Metrics', ACT: 'Actionable Output' },
    dfdSteps: [
      { step: 1, nodeId: 'SC', title: 'Mandatory Feature Scaling', description: 'Standardize all dimensions so $100k income does not drown 0–5 click counts.', payload: { scaled: true, metric: 'euclidean' } },
      { step: 2, nodeId: 'PCA', title: 'Variance-Preserving Compression', description: 'Project 64 noisy columns down to 12 principal components retaining 94% variance.', payload: { dims_in: 64, dims_out: 12, explained_var_pct: 94.2 } },
      { step: 3, nodeId: 'CLUST', title: 'Cluster / Density Discovery', description: 'Run K-Means++ or DBSCAN to separate dense groups and flag outliers.', payload: { clusters: 4, silhouette: 0.64, outliers_flagged: 112 } },
      { step: 4, nodeId: 'ACT', title: 'Human-Validated Personas & Alerts', description: 'Profile cluster centroids and attach alert playbooks.', payload: { top_segment: 'High-LTV Loyalists', anomaly_precision_reviewed: '84%' } }
    ],
    simTitle: 'K-Means Silhouette, PCA Variance & Isolation Forest Simulator',
    simSubtitle: 'Adjust cluster count K, PCA components kept, and anomaly contamination threshold to optimize separation and alert precision.',
    simControls: [
      { id: 'kClusters', label: 'Cluster Count (K)', type: 'slider', min: 2, max: 10, step: 1, unit: 'clusters', defaultValue: 4 },
      { id: 'pcaDims', label: 'PCA Components Retained (of 32)', type: 'slider', min: 2, max: 32, step: 2, unit: 'dims', defaultValue: 10 },
      { id: 'contamination', label: 'Anomaly Alert Threshold', type: 'slider', min: 0.5, max: 10, step: 0.5, unit: '%', defaultValue: 1.5 }
    ],
    runSim: vals => {
      const k = nVal(vals.kClusters, 4)
      const dims = nVal(vals.pcaDims, 10)
      const cont = nVal(vals.contamination, 1.5)
      const trueK = 4
      const silhouette = Number(Math.max(0.18, 0.72 - Math.abs(k - trueK) * 0.095 - (dims < 4 ? 0.14 : 0)).toFixed(2))
      const varKept = Math.min(100, Math.round(100 * (1 - Math.exp(-dims * 0.24))))
      const alertPrecision = Math.max(12, Math.min(94, Math.round(96 - Math.abs(cont - 1.5) * 11)))
      const health = silhouette < 0.42 || varKept < 75 ? 'breaking' : alertPrecision < 65 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: `K=${k} Silhouette ${silhouette} · PCA retains ${varKept}% variance (${dims}/32 dims) · Anomaly Precision ${alertPrecision}%`,
        explanation: `True underlying structure has 4 segments and ~1.5% anomalies. Over-splitting K fractures coherent groups; setting contamination too high causes alert fatigue.`,
        kpis: [
          { label: 'Silhouette Score', value: silhouette.toFixed(2), sub: '>0.50 cohesive', status: silhouette >= 0.55 ? 'optimal' : silhouette >= 0.4 ? 'tradeoff' : 'breaking' },
          { label: 'PCA Variance Kept', value: `${varKept}%`, sub: `${dims}/32 dims (${Math.round((1 - dims / 32) * 100)}% cut)`, status: varKept >= 88 ? 'optimal' : 'tradeoff' },
          { label: 'Anomaly Precision', value: `${alertPrecision}%`, sub: `${cont}% flagged`, status: alertPrecision >= 75 ? 'optimal' : alertPrecision >= 50 ? 'tradeoff' : 'breaking' },
          { label: 'Dimensional Savings', value: `${Math.round((1 - dims / 32) * 100)}%`, sub: 'Smaller index', status: 'optimal' }
        ],
        bars: [
          { label: 'Cluster Cohesion (Silhouette)', pct: Math.round(silhouette * 100), display: silhouette.toFixed(2), tone: silhouette >= 0.55 ? 'positive' : 'warning' },
          { label: 'PCA Signal Retained', pct: varKept, display: `${varKept}%`, tone: 'primary' },
          { label: 'Anomaly Alert Precision', pct: alertPrecision, display: `${alertPrecision}%`, tone: alertPrecision >= 75 ? 'positive' : 'danger' }
        ]
      }
    },
    playgroundTitle: 'Live Unsupervised Sandbox: 1D K-Means + Association Lift',
    playgroundTask: 'Run K-Means centroid convergence on unlabeled customer spend and compute Association Rule Lift for market-basket bundles.',
    executableCode: `// Track 06 — Live K-Means Clustering + Market Basket Lift
const spends = [15, 22, 18, 25, 190, 210, 235, 205];
let c1 = 10, c2 = 60;
for (let it = 0; it < 10; it++) {
  const g1 = spends.filter(x => Math.abs(x - c1) <= Math.abs(x - c2));
  const g2 = spends.filter(x => Math.abs(x - c1) >  Math.abs(x - c2));
  c1 = g1.reduce((a, b) => a + b, 0) / g1.length;
  c2 = g2.reduce((a, b) => a + b, 0) / g2.length;
}
// Association Rule: P(Chips)=0.30, P(Salsa)=0.20, P(Chips & Salsa)=0.15
const lift = 0.15 / (0.30 * 0.20);
console.log("[K-Means] Converged Centroids: Low=$" + c1.toFixed(1) + ", VIP=$" + c2.toFixed(1));
console.log("[Association Rule] Chips -> Salsa Lift =", lift.toFixed(2) + "x");
assert(c1 === 20 && c2 === 210, "K-Means found exact cluster centroids ($20 and $210)");
assert(lift > 2.0, "Positive basket lift (" + lift.toFixed(2) + "x > 1.0)");
emitMetric("Low Cluster", "$" + c1.toFixed(0), "4 users", "optimal");
emitMetric("VIP Cluster", "$" + c2.toFixed(0), "4 users", "optimal");
emitMetric("Basket Lift", lift.toFixed(2) + "x", "Strong rule", "optimal");`,
    pythonReference: `from sklearn.cluster import KMeans\nfrom sklearn.metrics import silhouette_score\nlabels = KMeans(n_clusters=4, n_init="auto").fit_predict(X_scaled)\nprint("Silhouette:", silhouette_score(X_scaled, labels))`
  },

  // =========================================================================
  // TRACK 07 — MODEL EVALUATION & OPTIMIZATION (10 TOPICS)
  // =========================================================================
  {
    id: 'ml26-07-eval-opt',
    number: 7,
    phase: 'classical-ml',
    phaseLabel: 'Classical ML',
    title: 'Model Evaluation & Optimization',
    summary: 'Master Precision/Recall/F1, Confusion Matrix, ROC-AUC, MAE/MSE, Grid/Random/Bayesian tuning, and Interpretability.',
    architectAuditNote: 'Optimizing the wrong metric (like Accuracy on 1% fraud) builds useless models. Pair domain metrics with Bayesian tuning (Optuna) and SHAP/Permutation interpretability.',
    topics: [
      { id: 'ev-prf1', title: 'Accuracy, Precision, Recall & F1-Score', explanation: 'Precision = "of predicted positives, how many were true?"; Recall = "of all true positives, how many did we catch?"; F1 = harmonic mean of both.', analogy: 'Fishing net: Recall is how many tuna you caught; Precision is how little trash came up in the net.', technicalDetail: 'Use $F_\\beta$ when false negatives cost $\\beta^2$ more than false positives (e.g., $F_2$ in cancer/fraud screening).', productionPitfall: 'Reporting Accuracy on 99:1 imbalanced data hides 0% recall.', pythonSnippet: `from sklearn.metrics import precision_recall_fscore_support\np, r, f1, _ = precision_recall_fscore_support(y_val, preds, average="binary")` },
      { id: 'ev-cm', title: 'Confusion Matrix', explanation: '2×2 breakdown of True Positives (TP), False Positives (FP), True Negatives (TN), and False Negatives (FN)—the foundation of every classification cost model.', analogy: 'A scorecard separating caught burglars, false alarms, quiet nights, and missed break-ins.', technicalDetail: 'Multiply the confusion matrix directly by a business dollar cost matrix to pick the profit-maximizing threshold.', productionPitfall: 'Never comparing confusion matrices across user slices masks bias against minority groups.', pythonSnippet: `from sklearn.metrics import confusion_matrix\ntn, fp, fn, tp = confusion_matrix(y_val, preds).ravel()` },
      { id: 'ev-roc', title: 'ROC-AUC', explanation: 'Measures threshold-free ranking quality: probability that a randomly chosen positive scores higher than a randomly chosen negative.', analogy: 'How cleanly a bouncer sorts VIP guests ahead of non-VIPs regardless of where the velvet rope is placed.', technicalDetail: 'Complement ROC-AUC with PR-AUC (Average Precision) whenever positive class prevalence is under 5%.', productionPitfall: 'High ROC-AUC (0.95) does NOT imply probabilities are calibrated.', pythonSnippet: `from sklearn.metrics import roc_auc_score, average_precision_score\nprint("ROC:", roc_auc_score(y_val, probs), "PR:", average_precision_score(y_val, probs))` },
      { id: 'ev-mae', title: 'Mean Absolute Error (MAE)', explanation: 'Average absolute prediction error $\\frac{1}{n}\\sum|y_i - \\hat{y}_i|$ in original target units; robust to occasional extreme outliers.', analogy: 'Measuring average delivery arrival error in minutes without letting one snowstorm dominate the score.', technicalDetail: 'Minimizing MAE estimates the conditional median; ideal when error cost scales linearly.', productionPitfall: 'Non-differentiable sharp corner at 0—Huber loss blends smooth MSE near 0 with linear MAE tails.', pythonSnippet: `from sklearn.metrics import mean_absolute_error\nmae = mean_absolute_error(y_val, y_pred)` },
      { id: 'ev-mse', title: 'Mean Squared Error (MSE)', explanation: 'Average squared error $\\frac{1}{n}\\sum(y_i - \\hat{y}_i)^2$ (or RMSE in target units); heavily penalizes large catastrophic misses.', analogy: 'Missing a bridge-load estimate by 10 tons is far more than 10× worse than missing by 1 ton.', technicalDetail: 'Minimizing MSE estimates the conditional mean; pair with $R^2$ to gauge explained variance.', productionPitfall: 'A single corrupted 10,000× outlier dominates MSE and tilts the entire model.', pythonSnippet: `from sklearn.metrics import root_mean_squared_error\nrmse = root_mean_squared_error(y_val, y_pred)` },
      { id: 'ev-hpo', title: 'Hyperparameter Tuning', explanation: 'Systematically searches structural choices not learned by gradient descent (learning rate, depth, regularization, batch size) using validation folds.', analogy: 'Adjusting oven temperature and rack height before baking, rather than changing the batter ingredients.', technicalDetail: 'Use nested CV or hold out a final untouched test set so tuning never overfits validation.', productionPitfall: 'Tuning hyperparameters before fixing data leakage or weak features wastes GPU hours.', pythonSnippet: `# Define clean search space around learning rate, depth, and L2 regularization` },
      { id: 'ev-gridrand', title: 'Grid Search & Random Search', explanation: 'Grid Search checks every combination exhaustively; Random Search samples combinations randomly and finds strong configs far faster when only 2–3 hyperparams matter.', analogy: 'Searching a football field for a lost key along random diagonals instead of marching inch-by-inch down irrelevant rows.', technicalDetail: 'Random Search explores exponentially more unique values of sensitive params like learning rate than a coarse grid.', productionPitfall: 'Grid Search over 6 parameters × 5 values = 15,625 models (combinatorial explosion).', pythonSnippet: `from sklearn.model_selection import RandomizedSearchCV\nsearch = RandomizedSearchCV(clf, param_dist, n_iter=40, cv=5, scoring="average_precision")` },
      { id: 'ev-bayes', title: 'Bayesian Optimization', explanation: 'Builds a probabilistic surrogate model (TPE / Gaussian Process in Optuna) of past trial scores to intelligently pick the next most promising hyperparameter config.', analogy: 'A treasure hunter using a metal-detector heatmap of prior digs instead of digging blindly.', technicalDetail: 'Combine Optuna TPE with Hyperband/MedianPruner to kill bad neural/GBDT runs after epoch 3.', productionPitfall: 'Over-optimizing 500 trials on a tiny 500-row validation set overfits the validation fold.', pythonSnippet: `import optuna\ndef objective(trial):\n    lr = trial.suggest_float("lr", 1e-3, 0.2, log=True)\n    depth = trial.suggest_int("max_depth", 3, 10)\n    return evaluate_cv(lr, depth)\nstudy = optuna.create_study(direction="maximize"); study.optimize(objective, n_trials=40)` },
      { id: 'ev-fi', title: 'Feature Importance', explanation: 'Ranks which input signals drive predictions using Gain/Split counts (fast) or Permutation Importance on validation data (unbiased).', analogy: 'Checking which gauges on a cockpit dashboard actually warn you before an engine stall.', technicalDetail: 'Prefer validation Permutation Importance over default tree impurity importance, which biases toward high-cardinality continuous columns.', productionPitfall: 'Correlated twin features split importance in half, making both look unimportant when either is essential.', pythonSnippet: `from sklearn.inspection import permutation_importance\nimp = permutation_importance(model, X_val, y_val, n_repeats=10, scoring="roc_auc")` },
      { id: 'ev-interp', title: 'Model Interpretability', explanation: 'Explains both global behavior (Partial Dependence Plots) and individual row predictions (SHAP values / LIME) for debugging, trust, and compliance.', analogy: 'Providing a clear itemized receipt explaining why a loan was approved or declined instead of a black-box "No".', technicalDetail: 'TreeSHAP computes exact game-theoretic Shapley values in polynomial time satisfying local accuracy: $\\phi_0 + \\sum \\phi_i = f(x)$.', productionPitfall: 'Treating SHAP correlations as proven causal levers ("increasing X will cause Y") is a classic error.', pythonSnippet: `import shap\nshap_values = shap.TreeExplainer(xgb_model).shap_values(X_val[:100])` }
    ],
    mermaidDfd: `flowchart LR
  CAND["Candidate Model + Hyperparams"] --> OPT["Bayesian Optuna / Random Search"]
  OPT --> CM["Confusion Matrix, F1, ROC/PR-AUC & MAE"]
  CM --> THR["Business-Cost Threshold Tuning"]
  THR --> SHAP["Permutation Importance & SHAP Audit"]
  SHAP --> PASS["Verified Champion Model"]`,
    dfdNodeLabels: { CAND: 'Candidate', OPT: 'Bayesian HPO', CM: 'Metrics Matrix', THR: 'Threshold', SHAP: 'Interpretability', PASS: 'Champion' },
    dfdSteps: [
      { step: 1, nodeId: 'OPT', title: 'Bayesian TPE Search + Pruning', description: 'Optuna focuses trials in high-AUC regions and prunes weak runs early.', payload: { trials: 35, pruned: 14, best_lr: 0.042, best_depth: 6 } },
      { step: 2, nodeId: 'CM', title: 'Confusion Matrix & Ranking Audit', description: 'Compute TP/FP/TN/FN, Precision, Recall, F1, and PR-AUC on held-out folds.', payload: { tp: 84, fp: 16, fn: 11, precision: 0.84, recall: 0.884, f1: 0.861 } },
      { step: 3, nodeId: 'SHAP', title: 'Global & Local SHAP Verification', description: 'Verify top drivers make domain sense and contain zero leakage proxies.', payload: { top_driver: 'velocity_24h', shap_additivity_ok: true } },
      { step: 4, nodeId: 'PASS', title: 'Promote Champion', description: 'Beat incumbent baseline with statistical significance before promotion.', payload: { delta_pr_auc: '+0.048', status: 'PROMOTED' } }
    ],
    simTitle: 'Confusion Matrix Threshold, F1 & Bayesian HPO Efficiency Simulator',
    simSubtitle: 'Slide classification decision threshold and HPO search budget to see Precision, Recall, F1, and Tuning Speedup live.',
    simControls: [
      { id: 'thr', label: 'Classification Cutoff Threshold', type: 'slider', min: 0.1, max: 0.9, step: 0.05, unit: 'thr', defaultValue: 0.4 },
      { id: 'trials', label: 'Hyperparameter Trials Budget', type: 'slider', min: 10, max: 120, step: 10, unit: 'trials', defaultValue: 40 },
      { id: 'useBayes', label: 'Use Bayesian Optimization (vs. Exhaustive Grid)', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const thr = nVal(vals.thr, 0.4)
      const trials = nVal(vals.trials, 40)
      const bayes = bVal(vals.useBayes, true)
      const recall = Math.max(0.15, Math.min(0.97, 1 / (1 + Math.exp((thr - 0.55) * 6.5))))
      const precision = Math.max(0.22, Math.min(0.98, 1 / (1 + Math.exp(-(thr - 0.28) * 6.2))))
      const f1 = Number(((2 * precision * recall) / (precision + recall)).toFixed(3))
      const hpoGain = Number((bayes ? Math.min(5.2, Math.log(trials) * 1.15) : Math.min(3.4, Math.log(trials) * 0.72)).toFixed(2))
      const health = f1 >= 0.78 ? 'optimal' : f1 >= 0.62 ? 'tradeoff' : 'breaking'
      return {
        health,
        headline: `Threshold ${thr.toFixed(2)} → F1 ${f1} (Precision ${(precision * 100).toFixed(0)}%, Recall ${(recall * 100).toFixed(0)}%) · ${bayes ? 'Bayesian' : 'Grid'} HPO +${hpoGain} pts`,
        explanation: `Raising threshold boosts Precision while cutting Recall; Bayesian TPE finds better hyperparameters in ${trials} trials than blind Grid Search.`,
        kpis: [
          { label: 'F1-Score', value: f1.toFixed(3), sub: 'Harmonic mean', status: f1 >= 0.78 ? 'optimal' : f1 >= 0.62 ? 'tradeoff' : 'breaking' },
          { label: 'Precision', value: `${(precision * 100).toFixed(1)}%`, sub: 'TP / (TP+FP)', status: precision >= 0.7 ? 'optimal' : 'tradeoff' },
          { label: 'Recall', value: `${(recall * 100).toFixed(1)}%`, sub: 'TP / (TP+FN)', status: recall >= 0.7 ? 'optimal' : 'tradeoff' },
          { label: 'HPO Lift', value: `+${hpoGain} pts`, sub: bayes ? 'Optuna TPE' : 'Grid Search', status: bayes ? 'optimal' : 'tradeoff' }
        ],
        bars: [
          { label: 'Precision', pct: Math.round(precision * 100), display: `${(precision * 100).toFixed(1)}%`, tone: 'primary' },
          { label: 'Recall', pct: Math.round(recall * 100), display: `${(recall * 100).toFixed(1)}%`, tone: 'warning' },
          { label: 'F1-Score', pct: Math.round(f1 * 100), display: f1.toFixed(3), tone: f1 >= 0.78 ? 'positive' : 'danger' }
        ]
      }
    },
    playgroundTitle: 'Live Evaluation Sandbox: Confusion Matrix, F1, MAE & RMSE',
    playgroundTask: 'Compute exact TP/FP/TN/FN, Precision, Recall, F1-Score, MAE, and RMSE from real predictions live.',
    executableCode: `// Track 07 — Complete Classification & Regression Evaluation Suite
const yTrueCls = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
const yPredCls = [1, 1, 1, 0, 1, 0, 0, 0, 0, 0];
let tp = 0, fp = 0, tn = 0, fn = 0;
for (let i = 0; i < yTrueCls.length; i++) {
  if (yTrueCls[i] === 1 && yPredCls[i] === 1) tp++;
  else if (yTrueCls[i] === 0 && yPredCls[i] === 1) fp++;
  else if (yTrueCls[i] === 0 && yPredCls[i] === 0) tn++;
  else fn++;
}
const prec = tp / (tp + fp), rec = tp / (tp + fn), f1 = (2 * prec * rec) / (prec + rec);

const yTrueReg = [100, 200, 300, 400];
const yPredReg = [110, 190, 320, 380];
const mae = yTrueReg.reduce((s, y, i) => s + Math.abs(y - yPredReg[i]), 0) / yTrueReg.length;
const rmse = Math.sqrt(yTrueReg.reduce((s, y, i) => s + (y - yPredReg[i]) ** 2, 0) / yTrueReg.length);

console.log("[Confusion Matrix] TP=" + tp + " FP=" + fp + " FN=" + fn + " TN=" + tn + " | F1=" + f1.toFixed(3));
console.log("[Regression] MAE=" + mae.toFixed(1) + " | RMSE=" + rmse.toFixed(2));
assert(f1 === 0.75, "Exact F1-Score = 0.750 verified");
assert(rmse >= mae, "RMSE (" + rmse.toFixed(2) + ") >= MAE (" + mae + ") always holds mathematically");
emitMetric("F1-Score", f1.toFixed(3), "P=0.75 / R=0.75", "optimal");
emitMetric("MAE / RMSE", mae + " / " + rmse.toFixed(1), "Regression", "optimal");`,
    pythonReference: `from sklearn.metrics import classification_report, mean_absolute_error, root_mean_squared_error\nprint(classification_report(y_val, preds))`
  },

  // =========================================================================
  // TRACK 08 — DEEP LEARNING (9 TOPICS)
  // =========================================================================
  {
    id: 'ml26-08-deep-learning',
    number: 8,
    phase: 'deep-vision-nlp',
    phaseLabel: 'Deep Learning, Vision & NLP',
    title: 'Deep Learning',
    summary: 'Master Neural Networks, Perceptrons/MLPs, Activations, Backprop, Losses, Optimizers, Dropout, BatchNorm, and LR Scheduling.',
    architectAuditNote: 'Deep nets shine on unstructured pixels, audio, and text via hierarchical representation learning—training stability depends on normalization, residual connections, AdamW, and warmup-cosine LR schedules.',
    topics: [
      { id: 'dl-fund', title: 'Neural Network Fundamentals', explanation: 'Stacks parameterized linear layers and nonlinear activations to automatically learn hierarchical feature representations from raw inputs.', analogy: 'An assembly line where station 1 finds edges, station 2 assembles shapes, and station 3 recognizes whole objects.', technicalDetail: 'Universal Approximation Theorem guarantees expressivity; depth enables exponentially more compact representations than shallow width.', productionPitfall: 'Using deep neural nets on tiny 2,000-row tabular CSVs usually loses to XGBoost.', pythonSnippet: `nn.Sequential(nn.Linear(64, 128), nn.GELU(), nn.Linear(128, 10))` },
      { id: 'dl-mlp', title: 'Perceptrons and Multilayer Networks', explanation: 'Single perceptrons solve only linearly separable rules; adding hidden layers (MLPs) carves arbitrary curved decision boundaries.', analogy: 'One straight fence vs. connecting multiple fences to enclose any curved garden.', technicalDetail: 'Every Transformer block still spends ~66% of its parameters inside a 2-layer SwiGLU/GELU MLP feed-forward network.', productionPitfall: 'Zero-initializing all weights breaks symmetry so every hidden neuron learns the exact same thing.', pythonSnippet: `nn.init.kaiming_normal_(layer.weight, nonlinearity="relu")` },
      { id: 'dl-act', title: 'Activation Functions', explanation: 'Nonlinearities (ReLU, GELU, SiLU/SwiGLU, Sigmoid, Softmax) prevent stacked matrix multiplications from collapsing into one linear layer.', analogy: 'Valves and hinges that let a rigid straight beam bend into complex shapes.', technicalDetail: 'ReLU is fast for CNNs; GELU/SwiGLU are standard in modern Transformers for smooth non-zero gradients near zero.', productionPitfall: 'High learning rates with plain ReLU cause "dying ReLU" neurons permanently stuck outputting 0.', pythonSnippet: `act = nn.GELU()  # Smooth modern Transformer activation` },
      { id: 'dl-bp', title: 'Forward and Backpropagation', explanation: 'Forward pass computes activations & loss; Backward pass propagates exact gradients layer-by-layer from output to input using the chain rule (reverse-mode autodiff).', analogy: 'Tracing a late package backward through each warehouse to see exactly how many minutes each stop added.', technicalDetail: 'Activations saved during forward dominate GPU training VRAM—activation checkpointing trades compute for memory.', productionPitfall: 'Forgetting `optimizer.zero_grad()` accumulates stale gradients across steps silently.', pythonSnippet: `optimizer.zero_grad(); loss = criterion(model(x), y); loss.backward(); optimizer.step()` },
      { id: 'dl-loss', title: 'Loss Functions', explanation: 'Differentiable objective scoring error: Cross-Entropy (classification/LLMs), BCEWithLogits (multi-label), MSE/Huber (regression), and Contrastive/InfoNCE (embeddings).', analogy: 'The scoring rubric that tells the student precisely how far off their answer is.', technicalDetail: 'Always use fused `BCEWithLogitsLoss` / `CrossEntropyLoss` taking raw logits for numerical log-sum-exp stability.', productionPitfall: 'Applying `Softmax` manually before `nn.CrossEntropyLoss` double-normalizes and kills gradients.', pythonSnippet: `loss = nn.CrossEntropyLoss(label_smoothing=0.1)(logits, targets)` },
      { id: 'dl-opt', title: 'Optimizers: SGD, Adam, and RMSprop', explanation: 'SGD + Momentum finds flat generalizable minima; RMSprop scales step size by recent squared gradients; Adam/AdamW combines both with decoupled weight decay.', analogy: 'SGD is a steady hiker; AdamW is an adaptive mountain bike adjusting gear ratios on every hill independently.', technicalDetail: 'AdamW maintains 2 optimizer states ($m, v$) per parameter—tripling memory vs. raw FP32 weights.', productionPitfall: 'Using coupled L2 decay inside vanilla Adam instead of AdamW degrades generalization.', pythonSnippet: `opt = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.01)` },
      { id: 'dl-reg', title: 'Regularization and Dropout', explanation: 'Weight decay shrinks oversized weights; Dropout randomly zeroes $p\\%$ of activations during training so neurons cannot co-adapt.', analogy: 'Practicing soccer with random players benched so the whole team stays resilient instead of relying on one star.', technicalDetail: 'Always call `model.eval()` during inference so Dropout disables and inverted scaling stays accurate.', productionPitfall: 'Leaving `model.train()` active in production causes nondeterministic degraded predictions.', pythonSnippet: `nn.Dropout(p=0.2)  # Active in train(), identity in eval()` },
      { id: 'dl-bn', title: 'Batch Normalization', explanation: 'Normalizes mini-batch activations to zero mean / unit variance with learnable scale/shift ($\\gamma, \\beta$), stabilizing CNNs (Transformers use LayerNorm/RMSNorm instead).', analogy: 'Recalibrating a microphone gain between every amplifier stage so signals neither whisper nor clip.', technicalDetail: 'BatchNorm depends on batch statistics (breaks at batch size 1–2); LayerNorm/RMSNorm normalize per token independently.', productionPitfall: 'Forgetting running-stats freeze in `eval()` causes erratic single-sample inference.', pythonSnippet: `nn.BatchNorm2d(64)  # For CNNs | nn.RMSNorm(768) for Transformers` },
      { id: 'dl-lr', title: 'Learning Rate Scheduling', explanation: 'Starts with linear warmup (preventing early gradient spikes), then decays smoothly via Cosine Annealing or OneCycleLR to settle into sharp low-loss valleys.', analogy: 'Accelerating smoothly out of the garage, cruising fast on the highway, then braking gently into the parking spot.', technicalDetail: 'Cosine decay down to 10% of peak LR with 2%–5% linear warmup is the universal LLM and Vision recipe.', productionPitfall: 'Constant high LR bounces forever around the valley floor without converging.', pythonSnippet: `sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=100, eta_min=1e-5)` }
    ],
    mermaidDfd: `flowchart LR
  X["Mini-Batch Tensor (x)"] --> FWD["Forward Pass (Linear -> Norm -> GELU -> Dropout)"]
  FWD --> LOSS["Loss Function (Cross-Entropy)"]
  LOSS --> BWD["Backpropagation (Chain Rule Gradients)"]
  BWD --> CLIP["Gradient Clip + AdamW + Cosine LR"]
  CLIP -->|Update Weights| FWD`,
    dfdNodeLabels: { X: 'Mini-Batch', FWD: 'Forward Pass', LOSS: 'Loss', BWD: 'Backprop', CLIP: 'AdamW + LR' },
    dfdSteps: [
      { step: 1, nodeId: 'FWD', title: 'Forward Activation Pass', description: 'Compute layer projections, RMSNorm/BatchNorm, GELU nonlinearity, and Dropout mask.', payload: { batch: 64, hidden: 256, dropout: 0.2 } },
      { step: 2, nodeId: 'LOSS', title: 'Numerically Stable Loss', description: 'Compute Cross-Entropy directly from raw logits via log-sum-exp.', payload: { loss: 0.412, label_smoothing: 0.1 } },
      { step: 3, nodeId: 'BWD', title: 'Reverse-Mode Backprop', description: 'Propagate exact partial derivatives through the computational graph.', payload: { grad_norm_raw: 2.84, grad_norm_clipped: 1.0 } },
      { step: 4, nodeId: 'CLIP', title: 'AdamW + Cosine LR Step', description: 'Update weights with adaptive moments, decoupled decay, and scheduled LR.', payload: { lr_current: '2.4e-4', weight_decay: 0.01 } }
    ],
    simTitle: 'Neural Net Training Stability (Dropout, Norm & Cosine LR) Simulator',
    simSubtitle: 'Tune network depth, dropout rate, warmup-cosine scheduling, and BatchNorm/RMSNorm to test deep convergence.',
    simControls: [
      { id: 'layers', label: 'Network Depth (Hidden Layers)', type: 'slider', min: 2, max: 32, step: 2, unit: 'layers', defaultValue: 12 },
      { id: 'dropout', label: 'Dropout Rate', type: 'slider', min: 0, max: 0.6, step: 0.05, unit: 'p', defaultValue: 0.15 },
      { id: 'useNorm', label: 'Enable BatchNorm / RMSNorm + Residuals', type: 'toggle', defaultValue: true },
      { id: 'useCosine', label: 'Enable Linear Warmup + Cosine LR Schedule', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const depth = nVal(vals.layers, 12)
      const drop = nVal(vals.dropout, 0.15)
      const norm = bVal(vals.useNorm, true)
      const cos = bVal(vals.useCosine, true)
      const vanishRisk = !norm && depth > 8
      const valAcc = vanishRisk
        ? 52.4
        : Number(Math.min(96.8, Math.max(60, 84 + Math.min(8, depth * 0.45) + (cos ? 3.2 : 0) - Math.abs(drop - 0.18) * 26)).toFixed(1))
      const gradHealth = vanishRisk ? 'Vanishing / Exploding' : cos ? 'Smooth (Norm ≈ 1.0)' : 'Noisy Late Epochs'
      const health = vanishRisk || drop >= 0.5 ? 'breaking' : !cos || drop === 0 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: vanishRisk
          ? `Deep Gradient Collapse (${depth} layers without Norm/Residuals): Accuracy stalled at ${valAcc}%`
          : `Stable Deep Convergence: ${valAcc}% Validation Accuracy (${gradHealth})`,
        explanation: `Normalization + residual skip connections keep gradients near unit scale at depth ${depth}; warmup-cosine LR settles into flatter generalizable minima.`,
        kpis: [
          { label: 'Val Accuracy', value: `${valAcc}%`, sub: `${depth} hidden layers`, status: valAcc >= 90 ? 'optimal' : valAcc >= 80 ? 'tradeoff' : 'breaking' },
          { label: 'Gradient Flow', value: vanishRisk ? 'Collapsed' : 'Healthy', sub: gradHealth, status: vanishRisk ? 'breaking' : 'optimal' },
          { label: 'Dropout Balance', value: `${Math.round(drop * 100)}%`, sub: drop > 0.4 ? 'Underfitting' : drop === 0 ? 'Overfit risk' : 'Sweet spot', status: drop >= 0.1 && drop <= 0.3 ? 'optimal' : 'tradeoff' },
          { label: 'LR Schedule', value: cos ? 'Warmup+Cosine' : 'Flat LR', sub: cos ? '+3.2% gain' : 'Bouncing loss', status: cos ? 'optimal' : 'tradeoff' }
        ],
        bars: [
          { label: 'Validation Accuracy', pct: Math.round(valAcc), display: `${valAcc}%`, tone: vanishRisk ? 'danger' : 'positive' },
          { label: 'Gradient Stability', pct: vanishRisk ? 18 : norm ? 94 : 62, display: vanishRisk ? '18%' : '94%', tone: vanishRisk ? 'danger' : 'primary' }
        ]
      }
    },
    playgroundTitle: 'Live Neural Network Forward + Backprop (2-Layer XOR / ReLU) Sandbox',
    playgroundTask: 'Run a real forward pass, MSE loss, exact chain-rule backpropagation, and Adam-like update on a tiny neural neuron.',
    executableCode: `// Track 08 — Exact Forward Pass, ReLU Activation & Backpropagation
const relu = z => Math.max(0, z);
const dRelu = z => (z > 0 ? 1 : 0);
let w1 = 0.4, w2 = 0.6, b1 = 0.1;
const x = 2.0, yTrue = 3.0, lr = 0.05;
const losses = [];
for (let step = 0; step < 30; step++) {
  const z1 = w1 * x + b1;
  const h1 = relu(z1);
  const yPred = w2 * h1;
  const loss = 0.5 * (yPred - yTrue) ** 2;
  losses.push(Number(loss.toFixed(4)));
  // Chain rule backward
  const dL_dy = yPred - yTrue;
  const dL_dw2 = dL_dy * h1;
  const dL_dz1 = dL_dy * w2 * dRelu(z1);
  w2 -= lr * dL_dw2;
  w1 -= lr * (dL_dz1 * x);
  b1 -= lr * dL_dz1;
}
console.log("[Backprop] Start Loss =", losses[0], "-> End Loss =", losses[losses.length - 1]);
assert(losses[losses.length - 1] < 0.01, "Chain-rule backprop drove loss below 0.01");
emitMetric("Initial Loss", String(losses[0]), "Epoch 0", "tradeoff");
emitMetric("Final Loss", String(losses[losses.length - 1]), "Epoch 29", "optimal");`,
    pythonReference: `model = nn.Sequential(nn.Linear(128, 256), nn.RMSNorm(256), nn.GELU(), nn.Dropout(0.15), nn.Linear(256, 10))`
  }
]
