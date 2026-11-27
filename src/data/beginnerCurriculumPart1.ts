import type { BeginnerCurriculumTopic } from './beginnerCurriculumTypes'

export const beginnerTopicsPart1: BeginnerCurriculumTopic[] = [
  // =========================================================================
  // STAGE 1: PYTHON & DATA FOUNDATIONS
  // =========================================================================
  {
    id: 'py-data-pipelines',
    stageId: 'foundations-python-data',
    stageNumber: 1,
    stageTitle: 'Python & Data Foundations',
    topicNumber: '1.1',
    title: 'Clean Data Pipelines & Leakage-Free Splits',
    tagline: 'Turn messy raw spreadsheets into trustworthy training tables without peeking at test answers.',
    estimatedMinutes: 12,
    simpleEnglish: {
      plainExplanation:
        'Before any AI model can learn, raw data must be cleaned, checked for missing values, stripped of duplicates, and split into a study pile (train) and an exam pile (test). Crucially, you must compute averages or scaling rules only on the study pile—otherwise exam clues accidentally leak into training and make your model look smarter than it really is.',
      analogyTitle: 'Cooking with Mise en Place (Kitchen Prep)',
      analogyStory:
        'Imagine preparing dinner for restaurant guests. You wash vegetables, toss rotten tomatoes, and separate ingredients for tonight’s test plate from the main batch. If you taste-test by secretly seasoning the food critic’s final plate with extra butter, your review looks great in rehearsal but fails when real customers order.',
      analogyMappings: [
        {
          realWorld: 'Washing & sorting vegetables',
          aiConcept: 'Missing-value handling & deduplication',
          whyItMatters: 'Broken or repeated rows distort what the model thinks is normal.'
        },
        {
          realWorld: 'Keeping the critic’s plate untouched',
          aiConcept: 'Strict Train / Test Split before scaling',
          whyItMatters: 'Prevents data leakage so evaluation scores reflect real-world performance.'
        },
        {
          realWorld: 'Measuring cups & standard recipes',
          aiConcept: 'Schema validation & feature normalization',
          whyItMatters: 'Ensures every column arrives in the exact type and range expected.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'clean_and_split.py — Leakage-safe data prep in pure Python',
      codeSnippet: `def prepare_dataset(rows: list[dict], train_ratio: float = 0.8):
    # 1. Remove duplicate user records by keeping the first seen user_id
    seen, unique_rows = set(), []
    for row in rows:
        if row["user_id"] not in seen:
            seen.add(row["user_id"])
            unique_rows.append(row)

    # 2. Split BEFORE computing any statistics (prevents data leakage!)
    cutoff = int(len(unique_rows) * train_ratio)
    train_rows = unique_rows[:cutoff]
    test_rows = unique_rows[cutoff:]

    # 3. Compute median age ONLY from training rows
    valid_ages = sorted(r["age"] for r in train_rows if r["age"] is not None)
    train_median = valid_ages[len(valid_ages) // 2]

    # 4. Fill missing ages in both splits using ONLY the training median
    for split in (train_rows, test_rows):
        for r in split:
            if r["age"] is None:
                r["age"] = train_median

    return train_rows, test_rows, train_median`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'Raw records flow through validation, deduplication, splitting, and train-only statistics before entering model training.',
      nodeLabels: {
        RAW: 'Raw CSV / JSON',
        SCHEMA: 'Schema Check',
        DEDUP: 'Deduplicate',
        SPLIT: 'Train / Test Split',
        FIT: 'Fit Train Stats',
        READY: 'Clean Feature Table'
      },
      mermaidSyntax: `flowchart TD
    RAW["Raw CSV / JSON Logs"] --> SCHEMA["Validate Types & Nulls"]
    SCHEMA --> DEDUP["Remove Duplicate IDs"]
    DEDUP --> SPLIT["Split Train & Held-Out Test"]
    SPLIT --> FIT["Compute Median / Cap on Train Only"]
    FIT --> READY["Leakage-Free Model Inputs"]`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'RAW',
        visual_state_description: 'Raw records arrive from signup logs containing a missing age, a duplicate customer row, and an impossible outlier age (999).',
        sample_data_payload: {
          rows_in: 5,
          sample: [
            { user_id: 'u1', age: 28, spend: 45 },
            { user_id: 'u1', age: 28, spend: 45 },
            { user_id: 'u2', age: null, spend: 120 },
            { user_id: 'u3', age: 999, spend: 80 }
          ]
        }
      },
      {
        step_number: 2,
        highlight_node: 'SCHEMA',
        visual_state_description: 'Schema check flags null values and caps impossible numeric outliers (age 999 clipped to realistic upper bound).',
        sample_data_payload: {
          nulls_flagged: 1,
          outliers_clipped: [{ user_id: 'u3', old_age: 999, capped_age: 85 }],
          schema_status: 'VALID_WITH_WARNINGS'
        }
      },
      {
        step_number: 3,
        highlight_node: 'DEDUP',
        visual_state_description: 'Duplicate user_id u1 is removed so the same person cannot appear in both the study pile and the exam pile.',
        sample_data_payload: {
          duplicates_dropped: 1,
          unique_users: ['u1', 'u2', 'u3', 'u4']
        }
      },
      {
        step_number: 4,
        highlight_node: 'SPLIT',
        visual_state_description: 'Unique records are separated into 80% Train and 20% Held-Out Test BEFORE calculating averages or medians.',
        sample_data_payload: {
          train_ids: ['u1', 'u2', 'u3'],
          test_ids: ['u4'],
          leakage_risk: 'ZERO'
        }
      },
      {
        step_number: 5,
        highlight_node: 'FIT',
        visual_state_description: 'Training median age (34) is computed strictly from train_ids and applied to fill missing age for u2.',
        sample_data_payload: {
          train_median_age: 34,
          imputed_record: { user_id: 'u2', age: 34, spend: 120 },
          ready_for_ml: true
        }
      }
    ],
    simulatorConfig: {
      summary: 'Adjust how aggressively you split data, clip outliers, and fill missing values to watch validation accuracy, prep latency, and compute cost shift.',
      controls: [
        {
          id: 'train_split_ratio',
          label: 'Train Split Ratio',
          type: 'slider',
          min: 50,
          max: 96,
          step: 2,
          defaultValue: 80,
          unit: '%',
          minLabel: '50% (Small train)',
          maxLabel: '96% (Tiny test)',
          helperText: 'Percentage of unique rows used for training vs held-out testing.'
        },
        {
          id: 'outlier_cap_pct',
          label: 'Outlier Cap Percentile',
          type: 'slider',
          min: 80,
          max: 100,
          step: 2,
          defaultValue: 96,
          unit: 'p',
          minLabel: '80p (Aggressive clip)',
          maxLabel: '100p (No clipping)',
          helperText: 'Caps extreme sensor/typing errors. 100p keeps raw corrupted outliers.'
        },
        {
          id: 'median_impute',
          label: 'Median Imputation (vs Drop Missing Rows)',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Keep rows with missing values by filling with train median instead of throwing data away.'
        }
      ],
      formulaRules: [
        {
          metric: 'Accuracy Score (%)',
          formula: 'base 91% − |train_split − 80|×0.35 − |outlier_cap − 95|×0.65 − (drop_rows ? 5.5 : 0)',
          plainMeaning: 'Too little training data starves learning; too little test data makes validation noisy; keeping 100p raw outliers skews model weights.'
        },
        {
          metric: 'Latency (ms)',
          formula: '18 ms + train_split × 0.45 + (median_impute ? 9 : 2) ms',
          plainMeaning: 'Computing medians and scanning larger training partitions adds minor CPU prep time.'
        },
        {
          metric: 'Compute / Token Cost ($)',
          formula: '0.0004 + (train_split / 100) × 0.0018',
          plainMeaning: 'Data cleaning is cheap CPU work—vastly cheaper than retraining broken models later.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Fill Missing Scores Without Test Leakage',
        prompt: 'Write a function `fill_missing(train, test)` that computes the average of non-None numbers in `train`, then replaces `None` in BOTH `train` and `test` using ONLY that `train` average.',
        starterCode: `def fill_missing(train, test):
    # Compute mean using ONLY non-None values in train
    valid = [x for x in train if x is not None]
    mean_val = sum(valid) / len(valid)
    # Replace None in train and test with mean_val
    clean_train = [mean_val if x is None else x for x in train]
    clean_test = [mean_val if x is None else x for x in test]
    return clean_train, clean_test`,
        expectedInput: 'train = [10, None, 20], test = [None, 40]',
        expectedOutput: '([10, 15.0, 20], [15.0, 40])',
        hint: 'Never combine train + test before taking sum(valid) / len(valid). Compute mean_val from train alone.',
        solutionCode: `def fill_missing(train, test):
    valid = [x for x in train if x is not None]
    mean_val = sum(valid) / len(valid)
    clean_train = [mean_val if x is None else x for x in train]
    clean_test = [mean_val if x is None else x for x in test]
    return clean_train, clean_test`,
        requiredTokens: ['def fill_missing', 'None', 'sum(', 'len(', 'return'],
        verificationNote: 'Verified: train-only average (15.0) is applied to both splits so test value 40 never leaks into training statistics.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set train_split_ratio too high (e.g., 98% train / 2% test)?',
          options: [
            'The model stops running out of memory.',
            'Your test set becomes too tiny and noisy to trust whether the model truly generalizes.',
            'Duplicate IDs are automatically deleted.',
            'Missing values turn into zeros automatically.'
          ],
          correctIndex: 1,
          explanation: 'With only 2% of rows in the test set, getting just one or two lucky predictions makes accuracy swing wildly, hiding real production bugs.'
        },
        {
          id: 'q2',
          question: 'What breaks if we calculate the average age across the entire dataset BEFORE splitting into train and test?',
          options: [
            'Python throws a syntax error.',
            'Training runs 10× slower.',
            'Data leakage: information from the test set sneaks into training preprocessing, inflating offline scores.',
            'All negative numbers become positive.'
          ],
          correctIndex: 2,
          explanation: 'Computing statistics across the whole table lets held-out exam answers influence your preprocessing rules—a classic leakage bug.'
        }
      ]
    }
  },
  {
    id: 'py-async-batching',
    stageId: 'foundations-python-data',
    stageNumber: 1,
    stageTitle: 'Python & Data Foundations',
    topicNumber: '1.2',
    title: 'Typed Schemas & Batched Data Loading',
    tagline: 'Validate incoming records at the door and process them in tidy batches instead of one slow item at a time.',
    estimatedMinutes: 10,
    simpleEnglish: {
      plainExplanation:
        'AI systems talk to databases, embedding APIs, and GPUs. Sending one tiny text item per network call wastes most of your time waiting on round-trip handshakes. Instead, validate each record against a strict blueprint (schema) and pack items into fixed-size batches so workers process dozens of items per trip.',
      analogyTitle: 'Shipping Pallets vs Mailing Single Socks',
      analogyStory:
        'Suppose you need to move 100 shoes to a warehouse. Mailing 100 individual envelopes costs a fortune in postage and takes hours at the post office. Checking each pair for defects and packing 16 pairs onto one labeled pallet gets everything delivered faster and cheaper.',
      analogyMappings: [
        {
          realWorld: 'Inspecting shipping labels before loading',
          aiConcept: 'Typed Schema Validation (Pydantic / Dataclasses)',
          whyItMatters: 'Catches missing text or wrong types before crashing a 3-hour pipeline.'
        },
        {
          realWorld: 'Pallet capacity (16 boxes per pallet)',
          aiConcept: 'Batch Size',
          whyItMatters: 'Amortizes network and GPU overhead across many items at once.'
        },
        {
          realWorld: 'Multiple delivery trucks in parallel',
          aiConcept: 'Bounded Worker Pool',
          whyItMatters: 'Speeds up throughput without overwhelming downstream rate limits.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'batch_loader.py — Validate and group items into batches',
      codeSnippet: `def make_batches(records: list[dict], batch_size: int = 16):
    # 1. Keep only valid records that have non-empty string text
    valid = [
        r for r in records
        if isinstance(r.get("id"), str) and isinstance(r.get("text"), str) and r["text"].strip()
    ]

    # 2. Slice into clean batches of size batch_size
    batches = []
    for i in range(0, len(valid), batch_size):
        batches.append(valid[i : i + batch_size])

    return batches`
    },
    architectureFlow: {
      diagramType: 'sequenceDiagram',
      flowCaption: 'Incoming records pass through strict schema validation, accumulate into a batch queue, and dispatch across bounded workers.',
      nodeLabels: {
        Producer: 'Event Producer',
        Validator: 'Schema Validator',
        Batcher: 'Batch Queue',
        Workers: 'Worker Pool',
        Store: 'Feature Store'
      },
      mermaidSyntax: `sequenceDiagram
    participant Producer as Event Producer
    participant Validator as Schema Validator
    participant Batcher as Batch Queue
    participant Workers as Worker Pool
    participant Store as Feature Store
    Producer->>Validator: Send raw JSON records
    Validator-->>Producer: Reject malformed items (DLQ)
    Validator->>Batcher: Forward valid typed items
    Batcher->>Workers: Dispatch batch of N items
    Workers->>Store: Bulk write processed features`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'Producer',
        visual_state_description: 'The Event Producer streams 5 raw customer support tickets, including one empty message.',
        sample_data_payload: { incoming_count: 5, sample_item: { id: 't-101', text: 'Need invoice copy' } }
      },
      {
        step_number: 2,
        highlight_node: 'Validator',
        visual_state_description: 'Schema Validator checks required fields and routes the blank ticket to a Dead-Letter Queue (DLQ) instead of crashing.',
        sample_data_payload: { valid_count: 4, rejected_to_dlq: [{ id: 't-103', reason: 'empty_text' }] }
      },
      {
        step_number: 3,
        highlight_node: 'Batcher',
        visual_state_description: 'Valid records fill a batch buffer of size 4, reducing 4 separate network calls into 1 bulk payload.',
        sample_data_payload: { batch_id: 'batch-01', batch_size: 4, overhead_saved_pct: 75 }
      },
      {
        step_number: 4,
        highlight_node: 'Workers',
        visual_state_description: 'Worker Pool picks up batch-01 concurrently within the configured concurrency cap.',
        sample_data_payload: { active_workers: 2, max_workers: 4, status: 'PROCESSING_BATCH' }
      },
      {
        step_number: 5,
        highlight_node: 'Store',
        visual_state_description: 'All 4 cleaned records commit in one atomic bulk write to the Feature Store.',
        sample_data_payload: { written_rows: 4, total_latency_ms: 42, status: 'COMMITTED' }
      }
    ],
    simulatorConfig: {
      summary: 'Tune batch size, worker concurrency, and strict schema checking to balance speed, memory safety, and data quality.',
      controls: [
        {
          id: 'batch_size',
          label: 'Batch Size',
          type: 'slider',
          min: 1,
          max: 256,
          step: 1,
          defaultValue: 32,
          unit: 'items',
          minLabel: '1 (Single item)',
          maxLabel: '256 (Giant batch)',
          helperText: 'How many records are packed into one API or database trip.'
        },
        {
          id: 'worker_count',
          label: 'Parallel Workers',
          type: 'slider',
          min: 1,
          max: 12,
          step: 1,
          defaultValue: 4,
          unit: 'workers',
          minLabel: '1 (Serial)',
          maxLabel: '12 (High burst)',
          helperText: 'Number of concurrent workers sending batches.'
        },
        {
          id: 'strict_schema',
          label: 'Strict Schema Validation',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Reject malformed records early before they corrupt downstream tables.'
        }
      ],
      formulaRules: [
        {
          metric: 'Data Quality / Accuracy (%)',
          formula: 'strict_schema ? (batch_size > 192 ? 88% : 98%) : 74%',
          plainMeaning: 'Turning off schema checks lets broken records silently poison downstream features.'
        },
        {
          metric: 'Latency (ms per 100 items)',
          formula: 'round((1800 / (Math.min(batch_size, 64) * Math.min(worker_count, 6))) + batch_size * 0.85)',
          plainMeaning: 'Tiny batches waste time on network round trips; giant batches stall waiting to fill up and risk memory spikes.'
        },
        {
          metric: 'Compute Cost ($ per 10k items)',
          formula: '0.002 + (1 / Math.max(batch_size, 1)) * 0.04 + worker_count * 0.0005',
          plainMeaning: 'Batching slashes per-request API overhead dramatically.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Write a Safe Chunk Batcher',
        prompt: 'Write `chunk_items(items, batch_size)` that returns a list of lists of size `batch_size`. Raise `ValueError` if `batch_size <= 0`.',
        starterCode: `def chunk_items(items, batch_size):
    if batch_size <= 0:
        raise ValueError("batch_size must be positive")
    return [items[i : i + batch_size] for i in range(0, len(items), batch_size)]`,
        expectedInput: 'items = ["a", "b", "c", "d", "e"], batch_size = 2',
        expectedOutput: '[["a", "b"], ["c", "d"], ["e"]]',
        hint: 'Use range(0, len(items), batch_size) and slice items[i : i + batch_size].',
        solutionCode: `def chunk_items(items, batch_size):
    if batch_size <= 0:
        raise ValueError("batch_size must be positive")
    return [items[i : i + batch_size] for i in range(0, len(items), batch_size)]`,
        requiredTokens: ['def chunk_items', 'ValueError', 'range(', 'return'],
        verificationNote: 'Verified: positive guard prevents infinite loops and slicing cleanly preserves trailing partial batches.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set batch_size too high (e.g., 5,000 large documents in one request)?',
          options: [
            'The schema automatically fixes typos.',
            'Workers hit out-of-memory (OOM) errors, request payload limits, and slow tail latency waiting for the batch to fill.',
            'Network round trips increase.',
            'Duplicate records disappear.'
          ],
          correctIndex: 1,
          explanation: 'Oversized batches exceed API payload caps and RAM budgets, and a single failed record can force the entire giant batch to retry.'
        },
        {
          id: 'q2',
          question: 'What breaks if we set worker_count too high against an external API?',
          options: [
            'Requests get throttled with HTTP 429 rate-limit errors, causing retry storms.',
            'Python stops supporting lists.',
            'Batch sizes shrink to 1.',
            'Data accuracy drops to 0%.'
          ],
          correctIndex: 0,
          explanation: 'Unbounded concurrency overwhelms downstream APIs and triggers HTTP 429 rate limits, slowing everyone down.'
        }
      ]
    }
  },

  // =========================================================================
  // STAGE 2: MATH INTUITION
  // =========================================================================
  {
    id: 'math-vectors-similarity',
    stageId: 'math-intuition',
    stageNumber: 2,
    stageTitle: 'Math Intuition',
    topicNumber: '2.1',
    title: 'Vectors, Dot Products & Cosine Similarity',
    tagline: 'Turn meaning into coordinates so computers can measure how closely two ideas point in the same direction.',
    estimatedMinutes: 12,
    simpleEnglish: {
      plainExplanation:
        'A vector is just an ordered list of numbers describing something’s traits—like rating a movie on [Action, Comedy, Sci-Fi]. Cosine similarity checks the angle between two arrows: if two vectors point in almost the same direction (score near 1.0), the two items mean nearly the same thing, even if one sentence is longer than the other.',
      analogyTitle: 'Compass Directions on a Treasure Map',
      analogyStory:
        'Imagine two explorers walking from camp. Explorer A walks 2 miles Northeast; Explorer B walks 10 miles Northeast. Even though B walked much farther (bigger length), their compasses point in the exact same direction! Cosine similarity ignores walking distance and only compares the compass heading.',
      analogyMappings: [
        {
          realWorld: 'Map coordinates [East, North]',
          aiConcept: 'Embedding Vector [0.82, 0.41, ...]',
          whyItMatters: 'Lets software represent words, images, and users as math.'
        },
        {
          realWorld: 'How far someone walked',
          aiConcept: 'Vector Magnitude (L2 Norm)',
          whyItMatters: 'Longer documents can have larger raw numbers unless normalized.'
        },
        {
          realWorld: 'Angle between two compass headings',
          aiConcept: 'Cosine Similarity (−1 to +1)',
          whyItMatters: 'Powers semantic search, recommendations, and RAG retrieval.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'cosine_similarity.py — Measure meaning overlap in 8 lines',
      codeSnippet: `import math

def cosine_similarity(a: list[float], b: list[float]) -> float:
    # 1. Multiply matching coordinates and sum them (dot product)
    dot = sum(x * y for x, y in zip(a, b))
    # 2. Measure the length (magnitude) of each arrow
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    # 3. Divide dot product by lengths so only direction matters
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return round(dot / (mag_a * mag_b), 4)`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'Text converts into coordinates, gets length-normalized, and is compared via dot product to rank nearest matches.',
      nodeLabels: {
        INPUT: 'Query & Doc Text',
        VEC: 'Coordinate Vectors',
        NORM: 'L2 Normalization',
        DOT: 'Dot Product',
        COS: 'Cosine Score',
        RANK: 'Top-K Matches'
      },
      mermaidSyntax: `flowchart TD
    INPUT["Query & Document Text"] --> VEC["Convert to Numeric Vectors"]
    VEC --> NORM["Compute Vector Lengths (L2 Norm)"]
    NORM --> DOT["Multiply & Sum Coordinates (Dot Product)"]
    DOT --> COS["Cosine Similarity = Dot / (|A| × |B|)"]
    COS --> RANK["Filter by Threshold & Rank Matches"]`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'INPUT',
        visual_state_description: 'Compare user query "fast space rocket" against a candidate doc "orbital launch vehicle".',
        sample_data_payload: { query: 'fast space rocket', candidate: 'orbital launch vehicle' }
      },
      {
        step_number: 2,
        highlight_node: 'VEC',
        visual_state_description: 'Each phrase is mapped to 3 intuitive concept axes: [Space, Speed, Cooking].',
        sample_data_payload: { query_vec: [0.9, 0.8, 0.0], doc_vec: [0.95, 0.6, 0.05] }
      },
      {
        step_number: 3,
        highlight_node: 'NORM',
        visual_state_description: 'Calculate the length (Euclidean magnitude) of both arrows to remove length bias.',
        sample_data_payload: { norm_query: 1.2042, norm_doc: 1.1247 }
      },
      {
        step_number: 4,
        highlight_node: 'DOT',
        visual_state_description: 'Compute element-wise products: (0.9×0.95) + (0.8×0.6) + (0.0×0.05) = 1.335.',
        sample_data_payload: { products: [0.855, 0.48, 0.0], dot_product: 1.335 }
      },
      {
        step_number: 5,
        highlight_node: 'COS',
        visual_state_description: 'Divide 1.335 by (1.2042 × 1.1247) to obtain cosine similarity 0.9857—an almost identical compass heading!',
        sample_data_payload: { cosine_similarity: 0.9857, verdict: 'STRONG_SEMANTIC_MATCH' }
      }
    ],
    simulatorConfig: {
      summary: 'Experiment with vector dimensions, similarity cutoff threshold, and unit normalization to see search accuracy, latency, and index cost.',
      controls: [
        {
          id: 'vector_dims',
          label: 'Vector Dimensions',
          type: 'slider',
          min: 64,
          max: 1536,
          step: 64,
          defaultValue: 384,
          unit: 'dims',
          minLabel: '64 (Compact)',
          maxLabel: '1536 (High-res)',
          helperText: 'Number of coordinates stored per item.'
        },
        {
          id: 'similarity_threshold',
          label: 'Similarity Cutoff',
          type: 'slider',
          min: 0.35,
          max: 0.96,
          step: 0.01,
          defaultValue: 0.72,
          unit: 'cos',
          minLabel: '0.35 (Loose)',
          maxLabel: '0.96 (Ultra strict)',
          helperText: 'Minimum cosine score required to accept a match.'
        },
        {
          id: 'normalize_vectors',
          label: 'Pre-Normalize Vectors (Unit Length)',
          type: 'toggle',
          defaultValue: true,
          helperText: 'When vectors have length 1, fast dot product equals cosine similarity.'
        }
      ],
      formulaRules: [
        {
          metric: 'Search Accuracy / F1 (%)',
          formula: '84 + log2(dims/64)×2.2 − |threshold − 0.74|×68 − (!normalize ? 7.5 : 0)',
          plainMeaning: 'Too-low thresholds admit irrelevant noise; too-high thresholds miss valid paraphrases.'
        },
        {
          metric: 'Latency (ms)',
          formula: '6 + (vector_dims / 128) × 3.8 + (!normalize ? 5 : 0) ms',
          plainMeaning: 'Higher dimensions require more multiplications per candidate comparison.'
        },
        {
          metric: 'Embedding & Index Cost ($ per 1k queries)',
          formula: '0.0005 + (vector_dims / 1536) × 0.0045',
          plainMeaning: 'Larger embedding vectors use proportionally more RAM and vector DB storage.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Compute Dot Product & Length Guard',
        prompt: 'Write `dot_product(a, b)` that returns the sum of element-wise products, raising `ValueError` if lengths differ.',
        starterCode: `def dot_product(a, b):
    if len(a) != len(b):
        raise ValueError("Vectors must have the same length")
    return sum(x * y for x, y in zip(a, b))`,
        expectedInput: 'a = [2, 3], b = [4, 1]',
        expectedOutput: '11',
        hint: 'Check len(a) != len(b) first, then pair numbers with zip(a, b).',
        solutionCode: `def dot_product(a, b):
    if len(a) != len(b):
        raise ValueError("Vectors must have the same length")
    return sum(x * y for x, y in zip(a, b))`,
        requiredTokens: ['def dot_product', 'len(', 'zip(', 'return'],
        verificationNote: 'Verified: shape mismatch guard prevents silent truncation by zip(), and [2,3]·[4,1] = 11.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set similarity_threshold too high (e.g., 0.96)?',
          options: [
            'Vector search returns empty results on valid paraphrased questions (low recall).',
            'Cosine similarity exceeds 2.0.',
            'Embedding dimensions double.',
            'The database deletes older rows.'
          ],
          correctIndex: 0,
          explanation: 'Real user phrasing rarely scores 0.96+ against documentation; setting the cutoff too strict drops helpful answers.'
        },
        {
          id: 'q2',
          question: 'What breaks if you use raw dot product instead of cosine similarity on unnormalized vectors?',
          options: [
            'Short texts always win.',
            'Vectors with huge magnitudes dominate top results even if their meaning points in a different direction.',
            'Dot products can never be negative.',
            'Python cannot multiply floats.'
          ],
          correctIndex: 1,
          explanation: 'Without normalization, arrow length inflates the dot product and biases ranking toward long or high-magnitude vectors.'
        }
      ]
    }
  },
  {
    id: 'math-gradient-descent',
    stageId: 'math-intuition',
    stageNumber: 2,
    stageTitle: 'Math Intuition',
    topicNumber: '2.2',
    title: 'Derivatives & Gradient Descent',
    tagline: 'How models automatically tune their knobs by stepping downhill on an error curve.',
    estimatedMinutes: 12,
    simpleEnglish: {
      plainExplanation:
        'Training an AI model means finding knob settings (weights) that make mistakes (loss) as small as possible. A derivative simply tells you the slope under your feet. Gradient descent takes a step in the opposite direction of the slope—going downhill—scaled by a step size called the learning rate.',
      analogyTitle: 'Walking Down a Foggy Hill Blindfolded',
      analogyStory:
        'You are standing on a misty mountainside trying to reach the lowest valley. You cannot see the whole mountain, so you tap the ground with your foot to feel which way slopes downhill, then take a step that way. Tiny baby steps take forever; giant leaps make you jump right over the valley and bounce higher up the opposite cliff!',
      analogyMappings: [
        {
          realWorld: 'Your elevation above the valley floor',
          aiConcept: 'Loss Function (Error)',
          whyItMatters: 'Measures how wrong the model’s current guesses are.'
        },
        {
          realWorld: 'Steepness felt under your shoes',
          aiConcept: 'Gradient (Derivative)',
          whyItMatters: 'Points uphill, so moving opposite (−gradient) goes downhill.'
        },
        {
          realWorld: 'How wide a stride you take',
          aiConcept: 'Learning Rate (lr)',
          whyItMatters: 'Controls whether training converges smoothly, crawls, or explodes.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'gradient_descent.py — Minimize loss = (w - 3)^2 step by step',
      codeSnippet: `def train_weight(start_w: float = 0.0, lr: float = 0.2, steps: int = 8):
    w = start_w
    history = []
    for step in range(steps):
        # 1. Measure current error: valley is at w = 3.0
        loss = (w - 3.0) ** 2
        # 2. Compute slope (derivative of (w - 3)^2 is 2 * (w - 3))
        grad = 2.0 * (w - 3.0)
        history.append({"step": step, "w": round(w, 3), "loss": round(loss, 4)})
        # 3. Step downhill opposite the slope
        w = w - lr * grad
    return w, history`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'Each training iteration predicts, scores error, calculates slope, and updates the weight until the valley is reached.',
      nodeLabels: {
        INIT: 'Start Weight (w)',
        PRED: 'Forward Prediction',
        LOSS: 'Compute Loss',
        GRAD: 'Measure Slope (dL/dw)',
        UPDATE: 'w = w − lr × grad',
        CHECK: 'Converged?'
      },
      mermaidSyntax: `flowchart TD
    INIT["Initialize Weight w = 0.0"] --> PRED["Predict Output"]
    PRED --> LOSS["Compute Error: L = (w - 3)²"]
    LOSS --> GRAD["Compute Slope: grad = 2(w - 3)"]
    GRAD --> UPDATE["Update: w_new = w - lr × grad"]
    UPDATE --> CHECK["Error Small Enough?"]
    CHECK -->|No, repeat| PRED`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'INIT',
        visual_state_description: 'Start at w = 0.0 with learning rate lr = 0.25. Target valley is at w = 3.0.',
        sample_data_payload: { step: 0, w: 0.0, target: 3.0, learning_rate: 0.25 }
      },
      {
        step_number: 2,
        highlight_node: 'LOSS',
        visual_state_description: 'Error is high: (0.0 − 3.0)² = 9.0. The model knows it is far from the valley.',
        sample_data_payload: { w: 0.0, loss: 9.0 }
      },
      {
        step_number: 3,
        highlight_node: 'GRAD',
        visual_state_description: 'Slope at w = 0.0 is 2 × (0 − 3) = −6.0. Negative slope means downhill is to the RIGHT (+ direction).',
        sample_data_payload: { w: 0.0, gradient: -6.0, downhill_direction: 'positive (+)' }
      },
      {
        step_number: 4,
        highlight_node: 'UPDATE',
        visual_state_description: 'Update weight: w = 0.0 − 0.25 × (−6.0) = 1.50. Error drops immediately from 9.0 to 2.25!',
        sample_data_payload: { old_w: 0.0, new_w: 1.5, new_loss: 2.25 }
      },
      {
        step_number: 5,
        highlight_node: 'CHECK',
        visual_state_description: 'After 5 steps, w reaches 2.91 and loss drops to 0.0088—smoothly converging in the valley.',
        sample_data_payload: { step: 5, w: 2.906, loss: 0.0088, status: 'CONVERGED' }
      }
    ],
    simulatorConfig: {
      summary: 'Drag learning_rate above 1.0 to see gradient descent overshoot and explode in real time!',
      controls: [
        {
          id: 'learning_rate',
          label: 'Learning Rate (lr)',
          type: 'slider',
          min: 0.01,
          max: 1.2,
          step: 0.01,
          defaultValue: 0.2,
          unit: 'lr',
          minLabel: '0.01 (Crawl)',
          maxLabel: '1.20 (Explode!)',
          helperText: 'Step size multiplied by the slope on every iteration.'
        },
        {
          id: 'steps',
          label: 'Training Steps',
          type: 'slider',
          min: 5,
          max: 80,
          step: 5,
          defaultValue: 20,
          unit: 'steps',
          minLabel: '5 steps',
          maxLabel: '80 steps',
          helperText: 'How many downhill updates to run.'
        },
        {
          id: 'momentum',
          label: 'Use Momentum',
          type: 'toggle',
          defaultValue: false,
          helperText: 'Builds rolling speed down steady slopes to converge faster at small learning rates.'
        }
      ],
      formulaRules: [
        {
          metric: 'Final Weight & Accuracy (%)',
          formula: 'w_k = 3 − 3 × (1 − 2·lr)^steps (diverges when lr >= 1.0!)',
          plainMeaning: 'When |1 − 2·lr| < 1 (i.e. lr < 1.0), error shrinks every step; at lr ≥ 1.0, each leap overshoots wider and diverges.'
        },
        {
          metric: 'Latency (ms)',
          formula: '4 + steps × 1.4 ms',
          plainMeaning: 'Each optimization step runs one forward + backward calculation.'
        },
        {
          metric: 'Compute Cost ($)',
          formula: '0.0002 + steps × 0.00008',
          plainMeaning: 'More steps mean more GPU/CPU iterations.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Implement One Gradient Descent Update',
        prompt: 'Write `gd_step(w, target, lr)` for loss `(w - target)**2` that returns the updated weight `w_new` rounded to 4 decimals.',
        starterCode: `def gd_step(w, target, lr):
    # Derivative of (w - target)**2 is 2 * (w - target)
    grad = 2 * (w - target)
    return round(w - lr * grad, 4)`,
        expectedInput: 'w = 0.0, target = 3.0, lr = 0.1',
        expectedOutput: '0.6',
        hint: 'Subtract lr * grad from w. Remember grad = 2 * (w - target).',
        solutionCode: `def gd_step(w, target, lr):
    grad = 2 * (w - target)
    return round(w - lr * grad, 4)`,
        requiredTokens: ['def gd_step', '2 *', 'lr *', 'return'],
        verificationNote: 'Verified: at w=0, target=3, lr=0.1 → grad=-6, w_new = 0 - 0.1*(-6) = 0.6.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set learning_rate too high (e.g., 1.15 on this curve)?',
          options: [
            'The model converges in 1 step with zero error.',
            'Each update jumps past the valley onto a higher slope, causing loss to oscillate and explode to NaN.',
            'The dataset shrinks by half.',
            'Gradients automatically clamp to zero.'
          ],
          correctIndex: 1,
          explanation: 'An oversized learning rate overshoots the minimum repeatedly, making loss grow instead of shrink until floating-point numbers overflow.'
        },
        {
          id: 'q2',
          question: 'What happens if learning_rate is set far too low (e.g., 0.00001) with a fixed step budget?',
          options: [
            'Training crawls and stops far from the minimum before steps run out (underfitting).',
            'Loss explodes immediately.',
            'The model memorizes every test answer.',
            'Memory usage doubles.'
          ],
          correctIndex: 0,
          explanation: 'Microscopic steps barely move the weights within your compute budget, leaving the model under-trained.'
        }
      ]
    }
  },

  // =========================================================================
  // STAGE 3: MACHINE LEARNING & DEEP LEARNING
  // =========================================================================
  {
    id: 'ml-bias-variance',
    stageId: 'ml-deep-learning',
    stageNumber: 3,
    stageTitle: 'ML & Deep Learning',
    topicNumber: '3.1',
    title: 'Supervised ML, Overfitting & Regularization',
    tagline: 'Balance model complexity so your model learns real patterns instead of memorizing noise.',
    estimatedMinutes: 14,
    simpleEnglish: {
      plainExplanation:
        'A supervised ML model learns rules from labeled examples. If the model is too simple (underfitting), it misses real patterns and scores poorly everywhere. If it is too complex (overfitting), it memorizes quirks of the training data—getting 99% in practice but failing on new customers. Regularization adds a gentle penalty against overly complicated rules.',
      analogyTitle: 'Understanding Math vs Memorizing One Practice Sheet',
      analogyStory:
        'Student A barely studies and guesses on every question (underfitting). Student B memorizes that "Question 3 is 42" without understanding multiplication (overfitting)—they ace the practice sheet but bomb the real exam when the numbers change. Student C learns the underlying rule and aces new questions (generalization).',
      analogyMappings: [
        {
          realWorld: 'Too few rules (barely studying)',
          aiConcept: 'High Bias / Underfitting',
          whyItMatters: 'Both training and validation errors stay high.'
        },
        {
          realWorld: 'Memorizing exact practice answers',
          aiConcept: 'High Variance / Overfitting',
          whyItMatters: 'Training accuracy looks amazing while real-world accuracy drops.'
        },
        {
          realWorld: 'Forcing concise cheat-sheet notes',
          aiConcept: 'Regularization & Depth Limits',
          whyItMatters: 'Stops the model from memorizing random noise.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'overfit_detector.py — Spot underfit, balanced, and overfit models',
      codeSnippet: `def diagnose_fit(train_acc: float, val_acc: float) -> str:
    gap = train_acc - val_acc
    # 1. Both scores weak -> model is too simple
    if train_acc < 0.75 and val_acc < 0.75:
        return "UNDERFIT: increase model capacity or add better features"
    # 2. Big gap between train and val -> model memorized training noise
    if gap > 0.10:
        return "OVERFIT: limit tree depth, add regularization, or collect more data"
    # 3. High scores and small gap -> generalizes well!
    return "HEALTHY_FIT: model generalizes to unseen validation data"`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'Training data fits a candidate model whose complexity is governed by regularization and verified on a held-out validation split.',
      nodeLabels: {
        DATA: 'Labeled Dataset',
        TRAIN: 'Train Model (Depth D)',
        REG: 'Regularization Penalty',
        EVAL: 'Compare Train vs Val',
        GATE: 'Generalization Check'
      },
      mermaidSyntax: `flowchart TD
    DATA["Labeled Train + Validation Data"] --> TRAIN["Fit Model with Complexity / Depth D"]
    TRAIN --> REG["Apply Regularization Penalty λ"]
    REG --> EVAL["Measure Train Error vs Validation Error"]
    EVAL --> GATE{"Train − Val Gap ≤ 8%?"}
    GATE -->|Yes| SHIP["Approve Generalizable Model"]
    GATE -->|No| TRAIN`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'DATA',
        visual_state_description: 'Load 1,000 labeled customer churn records split into 800 Train and 200 Validation.',
        sample_data_payload: { train_rows: 800, val_rows: 200, target: 'will_churn' }
      },
      {
        step_number: 2,
        highlight_node: 'TRAIN',
        visual_state_description: 'Train a shallow tree (depth=2): it can only make 4 rough buckets—too simple to capture nuance.',
        sample_data_payload: { tree_depth: 2, train_acc: 0.71, val_acc: 0.70, state: 'UNDERFIT' }
      },
      {
        step_number: 3,
        highlight_node: 'TRAIN',
        visual_state_description: 'Increase depth to 18 with no regularization: the tree memorizes individual training customers.',
        sample_data_payload: { tree_depth: 18, train_acc: 0.99, val_acc: 0.74, gap: 0.25, state: 'OVERFIT' }
      },
      {
        step_number: 4,
        highlight_node: 'REG',
        visual_state_description: 'Prune depth to 6 and apply regularization λ = 1.5 to suppress noisy leaf splits.',
        sample_data_payload: { tree_depth: 6, lambda: 1.5, pruned_leaves: 42 }
      },
      {
        step_number: 5,
        highlight_node: 'GATE',
        visual_state_description: 'Validation accuracy rises to 89% with only a 3% train-val gap—ready for release!',
        sample_data_payload: { train_acc: 0.92, val_acc: 0.89, gap: 0.03, status: 'PASS_GENERALIZATION' }
      }
    ],
    simulatorConfig: {
      summary: 'Move Tree Depth too low (underfit) or too high (overfit), and test how Regularization rescues validation accuracy.',
      controls: [
        {
          id: 'tree_depth',
          label: 'Model Complexity (Tree Depth)',
          type: 'slider',
          min: 1,
          max: 20,
          step: 1,
          defaultValue: 6,
          unit: 'levels',
          minLabel: '1 (Too simple)',
          maxLabel: '20 (Memorizes noise)',
          helperText: 'Maximum number of yes/no splits the decision tree can stack.'
        },
        {
          id: 'reg_lambda',
          label: 'Regularization Penalty (λ)',
          type: 'slider',
          min: 0,
          max: 5,
          step: 0.5,
          defaultValue: 1.5,
          unit: 'λ',
          minLabel: '0.0 (No penalty)',
          maxLabel: '5.0 (Heavy smoothing)',
          helperText: 'Penalizes overly specific rules that only fit tiny noisy groups.'
        },
        {
          id: 'cross_val',
          label: '5-Fold Cross Validation',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Tests across 5 rotating validation slices for more trustworthy accuracy estimates.'
        }
      ],
      formulaRules: [
        {
          metric: 'Validation Accuracy (%)',
          formula: 'peaks near depth 6–7; excess depth loses (depth − 7)×1.9% unless buffered by λ',
          plainMeaning: 'Complexity helps up to a sweet spot; beyond it, memorizing noise drags real-world accuracy down.'
        },
        {
          metric: 'Latency (ms)',
          formula: '(12 + tree_depth × 4.5) × (cross_val ? 3.2 : 1) ms',
          plainMeaning: 'Deeper trees and 5-fold cross-validation multiply training work.'
        },
        {
          metric: 'Compute Cost ($)',
          formula: '0.001 + tree_depth × 0.0003 × (cross_val ? 4 : 1)',
          plainMeaning: 'Training multiple folds costs slightly more upfront but prevents costly bad deployments.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Flag Overfitting Automatically',
        prompt: 'Write `is_overfitting(train_acc, val_acc, max_gap=0.08)` returning `True` if `train_acc - val_acc > max_gap`, else `False`.',
        starterCode: `def is_overfitting(train_acc, val_acc, max_gap=0.08):
    return (train_acc - val_acc) > max_gap`,
        expectedInput: 'train_acc = 0.98, val_acc = 0.82, max_gap = 0.08',
        expectedOutput: 'True',
        hint: 'Subtract val_acc from train_acc and compare strictly greater than max_gap.',
        solutionCode: `def is_overfitting(train_acc, val_acc, max_gap=0.08):
    return (train_acc - val_acc) > max_gap`,
        requiredTokens: ['def is_overfitting', 'train_acc - val_acc', 'max_gap', 'return'],
        verificationNote: 'Verified: 0.98 - 0.82 = 0.16 > 0.08 triggers an overfitting alert.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set tree_depth too high (e.g., 20) with regularization λ = 0?',
          options: [
            'Training accuracy drops to 50%.',
            'The tree memorizes individual training noise, causing training accuracy to hit ~99% while validation accuracy falls.',
            'Cross-validation turns off automatically.',
            'The dataset loses columns.'
          ],
          correctIndex: 1,
          explanation: 'A depth-20 unregularized tree creates ultra-specific leaves for single noisy examples that never repeat in production.'
        },
        {
          id: 'q2',
          question: 'What breaks if we set regularization λ way too high?',
          options: [
            'The penalty shrinks weights toward zero, causing the model to underfit and miss real patterns.',
            'The model memorizes every row.',
            'Test data leaks into training.',
            'Inference latency explodes to 10 seconds.'
          ],
          correctIndex: 0,
          explanation: 'Excessive regularization handcuffs the model so tightly that it ignores genuine predictive signals.'
        }
      ]
    }
  },
  {
    id: 'dl-neural-backprop',
    stageId: 'ml-deep-learning',
    stageNumber: 3,
    stageTitle: 'ML & Deep Learning',
    topicNumber: '3.2',
    title: 'Neural Networks & Backpropagation',
    tagline: 'Layers of simple weighted switches learn features automatically by passing error blame backward.',
    estimatedMinutes: 14,
    simpleEnglish: {
      plainExplanation:
        'A neural network stacks layers of tiny math units (neurons). Each neuron multiplies inputs by weights, adds a bias, and passes the result through an activation switch like ReLU (which keeps positive numbers and zeroes out negatives). During training, backpropagation calculates how much each earlier weight contributed to the final mistake so every layer improves together.',
      analogyTitle: 'A Relay Team Passing Coaching Feedback Backwards',
      analogyStory:
        'Imagine a 3-person factory assembly line painting toy cars. The inspector at the end sees the paint is too dark (the error). They tell Painter 3 to use less black tint; Painter 3 realizes Painter 2 sent too much base coat and passes the feedback back to Painter 1. Everyone tweaks their step slightly, and by batch 100 the paint matches perfectly.',
      analogyMappings: [
        {
          realWorld: 'Assembly line stations',
          aiConcept: 'Hidden Layers',
          whyItMatters: 'Early layers spot simple clues; deeper layers combine them into rich concepts.'
        },
        {
          realWorld: 'On/off valve (ReLU)',
          aiConcept: 'Non-linear Activation Function',
          whyItMatters: 'Allows networks to learn curved, complex shapes instead of just straight lines.'
        },
        {
          realWorld: 'Passing blame backward from inspector',
          aiConcept: 'Backpropagation (Chain Rule)',
          whyItMatters: 'Computes exact weight updates for millions of parameters efficiently.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'mini_neuron.py — Forward pass + ReLU + Backprop in plain Python',
      codeSnippet: `def neuron_step(x: float, w: float, b: float, target: float, lr: float = 0.1):
    # 1. Forward pass: weighted sum + ReLU activation
    z = w * x + b
    pred = max(0.0, z)

    # 2. Measure error (squared loss)
    error = pred - target
    loss = 0.5 * (error ** 2)

    # 3. Backprop: if ReLU was active (z > 0), pass blame to w and b
    relu_grad = 1.0 if z > 0 else 0.0
    dL_dz = error * relu_grad
    w_new = w - lr * (dL_dz * x)
    b_new = b - lr * dL_dz
    return round(pred, 3), round(loss, 4), round(w_new, 4), round(b_new, 4)`
    },
    architectureFlow: {
      diagramType: 'sequenceDiagram',
      flowCaption: 'Signals travel forward to produce a prediction, then error gradients flow backward to adjust each layer’s weights.',
      nodeLabels: {
        Input: 'Input Features',
        Hidden: 'Hidden Layer + ReLU',
        Output: 'Prediction Head',
        Loss: 'Loss Calculator',
        Optim: 'Weight Optimizer'
      },
      mermaidSyntax: `sequenceDiagram
    participant Input as Input Features
    participant Hidden as Hidden Layer + ReLU
    participant Output as Prediction Head
    participant Loss as Loss Calculator
    participant Optim as Weight Optimizer
    Input->>Hidden: Forward: z1 = W1·x + b1, h = ReLU(z1)
    Hidden->>Output: Forward: y_hat = W2·h + b2
    Output->>Loss: Compare y_hat vs true target y
    Loss-->>Hidden: Backward: send gradient dL/dh
    Hidden-->>Optim: Update W1, W2 using learning rate`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'Input',
        visual_state_description: 'Input feature x = 2.0 enters the network with initial weight w = 0.5 and bias b = 0.1.',
        sample_data_payload: { x: 2.0, w: 0.5, b: 0.1, true_target: 3.0 }
      },
      {
        step_number: 2,
        highlight_node: 'Hidden',
        visual_state_description: 'Neuron computes z = 0.5 × 2.0 + 0.1 = 1.1. Since 1.1 > 0, ReLU switch stays OPEN and outputs 1.1.',
        sample_data_payload: { z: 1.1, relu_active: true, activation: 1.1 }
      },
      {
        step_number: 3,
        highlight_node: 'Output',
        visual_state_description: 'Prediction head emits y_hat = 1.1, which is 1.9 units below the true target 3.0.',
        sample_data_payload: { prediction: 1.1, target: 3.0, residual: -1.9 }
      },
      {
        step_number: 4,
        highlight_node: 'Loss',
        visual_state_description: 'Squared error loss = 0.5 × (−1.9)² = 1.805. Loss module generates backward error signal dL/dy = −1.9.',
        sample_data_payload: { loss: 1.805, dL_dy: -1.9 }
      },
      {
        step_number: 5,
        highlight_node: 'Hidden',
        visual_state_description: 'Chain rule multiplies −1.9 by input x = 2.0 to find weight gradient dL/dw = −3.8.',
        sample_data_payload: { dL_dw: -3.8, dL_db: -1.9 }
      },
      {
        step_number: 6,
        highlight_node: 'Optim',
        visual_state_description: 'Optimizer updates w from 0.5 → 0.88 and b from 0.1 → 0.29. Next prediction jumps closer to 3.0!',
        sample_data_payload: { w_updated: 0.88, b_updated: 0.29, next_prediction: 2.05 }
      }
    ],
    simulatorConfig: {
      summary: 'Tune hidden layer width, dropout rate, and mini-batch size to balance generalization, GPU speed, and training cost.',
      controls: [
        {
          id: 'hidden_units',
          label: 'Hidden Layer Width',
          type: 'slider',
          min: 8,
          max: 256,
          step: 8,
          defaultValue: 64,
          unit: 'neurons',
          minLabel: '8 (Narrow)',
          maxLabel: '256 (Wide)',
          helperText: 'More neurons learn richer patterns but cost more compute and can overfit.'
        },
        {
          id: 'dropout_rate',
          label: 'Dropout Rate',
          type: 'slider',
          min: 0.0,
          max: 0.8,
          step: 0.05,
          defaultValue: 0.2,
          unit: 'drop',
          minLabel: '0.0 (Off)',
          maxLabel: '0.8 (80% muted!)',
          helperText: 'Randomly turns off a fraction of neurons during training so no single neuron becomes a crutch.'
        },
        {
          id: 'batch_size',
          label: 'Mini-Batch Size',
          type: 'slider',
          min: 8,
          max: 128,
          step: 8,
          defaultValue: 32,
          unit: 'samples',
          minLabel: '8 (Noisy updates)',
          maxLabel: '128 (Smooth updates)',
          helperText: 'Number of examples averaged together per backpropagation update.'
        }
      ],
      formulaRules: [
        {
          metric: 'Validation Accuracy (%)',
          formula: '86 + min(hidden_units, 128)×0.06 − (dropout > 0.45 ? (dropout−0.45)×65 : |dropout−0.2|×14)',
          plainMeaning: 'Moderate dropout (~0.15–0.30) reduces overfitting; dropping 70–80% of neurons destroys signal.'
        },
        {
          metric: 'Step Latency (ms)',
          formula: '8 + (hidden_units × 0.16) + (batch_size × 0.22) ms',
          plainMeaning: 'Wider layers and larger mini-batches perform more matrix multiplications per step.'
        },
        {
          metric: 'Training Cost ($ per epoch)',
          formula: '0.0012 + (hidden_units / 256) × 0.006 + (128 / batch_size) × 0.0008',
          plainMeaning: 'Tiny batches take more update steps per epoch; wide networks consume more GPU time.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Write ReLU Forward and Backward',
        prompt: 'Write `relu_forward_backward(values)` returning `(activated, mask)` where `activated` keeps positive numbers (0 otherwise) and `mask` has `1` where `v > 0` else `0`.',
        starterCode: `def relu_forward_backward(values):
    activated = [v if v > 0 else 0 for v in values]
    mask = [1 if v > 0 else 0 for v in values]
    return activated, mask`,
        expectedInput: 'values = [-2.5, 0.0, 3.1, -0.4]',
        expectedOutput: '([0, 0, 3.1, 0], [0, 0, 1, 0])',
        hint: 'Use two list comprehensions checking `v > 0`.',
        solutionCode: `def relu_forward_backward(values):
    activated = [v if v > 0 else 0 for v in values]
    mask = [1 if v > 0 else 0 for v in values]
    return activated, mask`,
        requiredTokens: ['def relu_forward_backward', 'v > 0', 'return'],
        verificationNote: 'Verified: negative pre-activations output 0 and block gradient flow with mask=0.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set dropout_rate too high (e.g., 0.80)?',
          options: [
            'Training finishes instantaneously.',
            '80% of neurons are turned off every step, starving the network of signal and causing severe underfitting.',
            'ReLU turns into cosine similarity.',
            'Validation accuracy hits 100%.'
          ],
          correctIndex: 1,
          explanation: 'Extreme dropout deletes too much information during each forward pass, so layers cannot learn stable features.'
        },
        {
          id: 'q2',
          question: 'Why must neural networks include non-linear activations like ReLU between layers?',
          options: [
            'To convert strings to integers.',
            'Without non-linearity, stacking 100 linear layers mathematically collapses into a single straight-line layer.',
            'To make the GPU fan spin slower.',
            'To delete missing values from CSVs.'
          ],
          correctIndex: 1,
          explanation: 'A linear function of a linear function is still just one linear equation; ReLU bends the space so deep layers add real expressive power.'
        }
      ]
    }
  }
]
