import type { BeginnerCurriculumTopic } from './beginnerCurriculumTypes'

export const beginnerTopicsPart2: BeginnerCurriculumTopic[] = [
  // =========================================================================
  // STAGE 4: GENAI, TRANSFORMERS & RAG
  // =========================================================================
  {
    id: 'genai-attention-decoding',
    stageId: 'genai-rag',
    stageNumber: 4,
    stageTitle: 'GenAI, Transformers & RAG',
    topicNumber: '4.1',
    title: 'Tokens, Self-Attention & Temperature Decoding',
    tagline: 'See how LLMs spotlight relevant words and pick the next token one piece at a time.',
    estimatedMinutes: 15,
    simpleEnglish: {
      plainExplanation:
        'Large Language Models do not read whole words or magic thoughts—they chop text into numbered pieces called tokens. Self-attention lets each token look back at earlier tokens to figure out context (like who "it" refers to). Finally, the model scores every possible next token and picks one using settings like Temperature and Top-p.',
      analogyTitle: 'Reading a Mystery Novel with a Highlighter',
      analogyStory:
        'Read the sentence: "The trophy would not fit in the suitcase because it was too big." When your eyes hit the word "it", your brain shines a bright spotlight back onto "trophy" (80% attention) and a dimmer glance at "suitcase" (15%). When you guess the next word, low temperature acts like a cautious librarian picking the safest answer; high temperature acts like an improv comedian taking wild guesses.',
      analogyMappings: [
        {
          realWorld: 'Word chunks / syllables',
          aiConcept: 'Tokens & Token IDs',
          whyItMatters: 'Context limits and API pricing are measured strictly in tokens.'
        },
        {
          realWorld: 'Spotlight connecting "it" back to "trophy"',
          aiConcept: 'Self-Attention (Q · Kᵀ → Softmax → V)',
          whyItMatters: 'Builds context-aware meaning across long prompts.'
        },
        {
          realWorld: 'Librarian (0.0) vs Improv Comedian (1.5)',
          aiConcept: 'Temperature Sampling',
          whyItMatters: 'Controls repeatability versus creative randomness.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'temperature_softmax.py — How temperature reshapes next-token odds',
      codeSnippet: `import math

def next_token_probs(logits: dict[str, float], temperature: float = 0.7) -> dict[str, float]:
    # 1. Guard against division by zero (temperature 0 = greedy argmax)
    if temperature <= 0.05:
        best = max(logits, key=logits.get)
        return {tok: (1.0 if tok == best else 0.0) for tok in logits}

    # 2. Scale raw scores by temperature (higher temp flattens peaks!)
    scaled = {tok: score / temperature for tok, score in logits.items()}
    max_s = max(scaled.values())
    exps = {tok: math.exp(s - max_s) for tok, s in scaled.items()}
    total = sum(exps.values())

    # 3. Normalize into clean probabilities summing to 1.0
    return {tok: round(val / total, 3) for tok, val in exps.items()}`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'Text is split into tokens, weighted by Q/K/V attention, converted to vocabulary probabilities, and sampled into the next token.',
      nodeLabels: {
        PROMPT: 'Prompt Text',
        TOK: 'Tokenizer',
        QKV: 'Q, K, V Attention',
        LOGITS: 'Next-Token Logits',
        SAMPLE: 'Temperature & Top-p',
        OUT: 'Streamed Token'
      },
      mermaidSyntax: `flowchart TD
    PROMPT["Prompt: The trophy didn't fit because it..."] --> TOK["Tokenizer → Token IDs"]
    TOK --> QKV["Self-Attention: Q·Kᵀ / √d → Weights × V"]
    QKV --> LOGITS["Output Scores for Every Vocab Token"]
    LOGITS --> SAMPLE["Apply Temperature & Top-p Filter"]
    SAMPLE --> OUT["Pick Next Token & Loop"]`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'PROMPT',
        visual_state_description: 'User submits a prompt asking for the capital city of France in strict JSON.',
        sample_data_payload: { prompt: 'Capital of France is:', mode: 'factual_qa' }
      },
      {
        step_number: 2,
        highlight_node: 'TOK',
        visual_state_description: 'Tokenizer converts the string into integer IDs that index the embedding table.',
        sample_data_payload: { tokens: ['Capital', ' of', ' France', ' is', ':'], token_ids: [18210, 315, 9822, 374, 25] }
      },
      {
        step_number: 3,
        highlight_node: 'QKV',
        visual_state_description: 'The final token ":" attends heavily to "France" (0.64) and "Capital" (0.29) to assemble context.',
        sample_data_payload: { attention_weights: { Capital: 0.29, of: 0.03, France: 0.64, is: 0.04 } }
      },
      {
        step_number: 4,
        highlight_node: 'LOGITS',
        visual_state_description: 'Transformer outputs raw preference scores (logits) for candidate next tokens.',
        sample_data_payload: { top_logits: { ' Paris': 9.4, ' Lyon': 5.1, ' croissant': 2.2, ' banana': -1.0 } }
      },
      {
        step_number: 5,
        highlight_node: 'SAMPLE',
        visual_state_description: 'At temperature=0.2, " Paris" receives 99.8% probability and is reliably selected.',
        sample_data_payload: { temperature: 0.2, probs: { ' Paris': 0.998, ' Lyon': 0.002 }, chosen_token: ' Paris' }
      }
    ],
    simulatorConfig: {
      summary: 'Adjust Temperature, Top-p, and Max Output Tokens to watch factual precision, latency, and token spend respond live.',
      controls: [
        {
          id: 'temperature',
          label: 'Temperature',
          type: 'slider',
          min: 0.0,
          max: 2.0,
          step: 0.1,
          defaultValue: 0.3,
          unit: 'temp',
          minLabel: '0.0 (Deterministic)',
          maxLabel: '2.0 (Chaotic)',
          helperText: 'Controls randomness when sampling the next token.'
        },
        {
          id: 'top_p',
          label: 'Top-p (Nucleus)',
          type: 'slider',
          min: 0.1,
          max: 1.0,
          step: 0.05,
          defaultValue: 0.9,
          unit: 'p',
          minLabel: '0.10 (Tight)',
          maxLabel: '1.00 (Full vocab)',
          helperText: 'Only sample from the smallest set of top tokens whose probabilities add up to p.'
        },
        {
          id: 'max_output_tokens',
          label: 'Max Output Tokens',
          type: 'slider',
          min: 50,
          max: 800,
          step: 50,
          defaultValue: 200,
          unit: 'tokens',
          minLabel: '50 (Brief)',
          maxLabel: '800 (Long)',
          helperText: 'Upper limit on generated tokens (each token takes one sequential decode step).'
        }
      ],
      formulaRules: [
        {
          metric: 'Factual Accuracy (%)',
          formula: '96 − max(0, temperature − 0.4) × 26 − (top_p > 0.95 && temperature > 1.0 ? 8 : 0)',
          plainMeaning: 'High temperatures flatten probability peaks so rare, off-topic tokens sneak into factual answers.'
        },
        {
          metric: 'Latency (ms)',
          formula: '140 ms prefill + max_output_tokens × 6.5 ms/token',
          plainMeaning: 'Output tokens are generated one by one, so response latency scales linearly with output length.'
        },
        {
          metric: 'Token Cost ($ per request)',
          formula: '(350 input × $0.0000015) + (max_output_tokens × $0.000006)',
          plainMeaning: 'Output tokens typically cost 3–4× more than input tokens.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Greedy Decoder (Temperature = 0)',
        prompt: 'Write `greedy_token(logits)` that takes a dictionary of `{token: score}` and returns the single token with the highest score.',
        starterCode: `def greedy_token(logits):
    # Return the key whose numeric score is largest
    return max(logits, key=logits.get)`,
        expectedInput: 'logits = {"Paris": 9.4, "Lyon": 5.1, "Rome": 4.8}',
        expectedOutput: '"Paris"',
        hint: 'Python’s built-in `max(dict, key=dict.get)` returns the key with the maximum value.',
        solutionCode: `def greedy_token(logits):
    return max(logits, key=logits.get)`,
        requiredTokens: ['def greedy_token', 'max(', 'return'],
        verificationNote: 'Verified: greedy decoding deterministically selects "Paris" (highest logit 9.4).'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set temperature too high (e.g., 1.8) on a JSON-extraction or medical QA prompt?',
          options: [
            'The model refuses to output more than 5 tokens.',
            'Probability curves flatten so unlikely tokens get sampled, causing hallucinations and broken JSON syntax.',
            'Input token cost drops to $0.',
            'Attention layers stop running.'
          ],
          correctIndex: 1,
          explanation: 'High temperature gives low-probability tokens a real chance of being picked, ruining strict JSON and factual accuracy.'
        },
        {
          id: 'q2',
          question: 'Why does increasing max_output_tokens from 100 to 800 noticeably raise response latency?',
          options: [
            'Because tokenization runs 8 times.',
            'Because autoregressive decoding generates one token sequentially after another, multiplying total decode time.',
            'Because cosine similarity becomes negative.',
            'Because prompt text gets duplicated.'
          ],
          correctIndex: 1,
          explanation: 'Each generated token depends on the previous one, so total generation time grows proportionally with output length.'
        }
      ]
    }
  },
  {
    id: 'genai-rag-hybrid',
    stageId: 'genai-rag',
    stageNumber: 4,
    stageTitle: 'GenAI, Transformers & RAG',
    topicNumber: '4.2',
    title: 'Chunking & Grounded Hybrid RAG',
    tagline: 'Give the model the exact right pages from your private documents—and require citations or abstention.',
    estimatedMinutes: 15,
    simpleEnglish: {
      plainExplanation:
        'An LLM only knows what was in its training data—not your company’s policy updated yesterday. RAG (Retrieval-Augmented Generation) splits your documents into manageable chunks, searches them using both exact keywords and semantic meaning (Hybrid Search), reranks the best evidence, and hands only those verified passages to the model to answer with citations.',
      analogyTitle: 'An Open-Book Exam with Sticky Tabs',
      analogyStory:
        'Instead of memorizing a 500-page employee handbook, you put clear sticky tabs on each section. When someone asks about parental leave, you check the index (keyword search) AND think about related sections (semantic search), pull out the top 3 paragraphs, and write your answer quoting exact page numbers. If the handbook does not mention it, you say "Not found in policy" instead of guessing.',
      analogyMappings: [
        {
          realWorld: 'Cutting a manual into paragraph cards with overlap',
          aiConcept: 'Chunking with Overlap',
          whyItMatters: 'Keeps ideas intact so answers split across sentences aren’t severed.'
        },
        {
          realWorld: 'Checking the back index + understanding topic meaning',
          aiConcept: 'Hybrid Retrieval (BM25 + Dense Vector + Rerank)',
          whyItMatters: 'Catches both exact part numbers/IDs and paraphrased questions.'
        },
        {
          realWorld: 'Quoting the page number or saying "not in the book"',
          aiConcept: 'Citation Grounding & Abstention',
          whyItMatters: 'Eliminates made-up policy answers.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'chunk_with_overlap.py — Split documents cleanly without cutting ideas in half',
      codeSnippet: `def chunk_words(text: str, chunk_size: int = 120, overlap: int = 20) -> list[str]:
    words = text.split()
    step = max(1, chunk_size - overlap)
    chunks = []
    # Slide a window forward so adjacent chunks share context
    for start in range(0, len(words), step):
        piece = " ".join(words[start : start + chunk_size])
        chunks.append(piece)
        if start + chunk_size >= len(words):
            break
    return chunks`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'User questions pass through tenant ACL filtering, hybrid keyword + vector search, cross-encoder reranking, and citation-checked generation.',
      nodeLabels: {
        QUERY: 'User Query + Tenant ACL',
        HYBRID: 'Hybrid Search (BM25 + Vector)',
        RERANK: 'Cross-Encoder Reranker',
        CTX: 'Bounded Context Assembly',
        GEN: 'Grounded LLM Answer',
        CITE: 'Citation Check / Abstain'
      },
      mermaidSyntax: `flowchart TD
    QUERY["User Query + Verified Tenant ACL"] --> HYBRID["Hybrid Search: Keywords + Vectors"]
    HYBRID --> RERANK["Rerank Top Candidates"]
    RERANK --> CTX["Assemble Top-K Chunks with Source IDs"]
    CTX --> GEN["Generate Answer Strictly from Context"]
    GEN --> CITE["Verify Citations or Abstain"]`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'QUERY',
        visual_state_description: 'Tenant A employee asks: "What is our refund window for annual plans?" Server attaches tenant_id="acme".',
        sample_data_payload: { query: 'refund window for annual plans', tenant_id: 'acme', acl_enforced: true }
      },
      {
        step_number: 2,
        highlight_node: 'HYBRID',
        visual_state_description: 'Hybrid search filters to tenant_id="acme" FIRST, then merges keyword matches (BM25) and vector matches via RRF.',
        sample_data_payload: { candidates_found: 12, tenant_b_excluded: true, top_raw_ids: ['doc4#p2', 'doc9#p1', 'doc4#p3'] }
      },
      {
        step_number: 3,
        highlight_node: 'RERANK',
        visual_state_description: 'Reranker reads the query + each chunk side-by-side and promotes chunk doc4#p2 ("30-day annual refund") to Rank #1.',
        sample_data_payload: { reranked_top_3: [{ id: 'doc4#p2', score: 0.94 }, { id: 'doc4#p3', score: 0.78 }, { id: 'doc9#p1', score: 0.51 }] }
      },
      {
        step_number: 4,
        highlight_node: 'CTX',
        visual_state_description: 'Top-3 chunks (1,050 tokens total) are packed into the prompt with immutable citation tags.',
        sample_data_payload: { prompt_context_tokens: 1050, source_tags: ['[doc4#p2]', '[doc4#p3]'] }
      },
      {
        step_number: 5,
        highlight_node: 'GEN',
        visual_state_description: 'LLM generates a concise answer citing [doc4#p2] directly.',
        sample_data_payload: { draft_answer: 'Annual plans are eligible for a full refund within 30 days [doc4#p2].' }
      },
      {
        step_number: 6,
        highlight_node: 'CITE',
        visual_state_description: 'Application verifier confirms [doc4#p2] exists in authorized retrieved chunks before sending to user.',
        sample_data_payload: { citation_valid: true, grounded: true, status: 'DELIVERED' }
      }
    ],
    simulatorConfig: {
      summary: 'Adjust chunk_size, top_k retrieved chunks, and Hybrid Reranking to see retrieval accuracy, latency, and prompt cost react.',
      controls: [
        {
          id: 'chunk_size',
          label: 'Chunk Size',
          type: 'slider',
          min: 100,
          max: 1200,
          step: 50,
          defaultValue: 350,
          unit: 'tokens',
          minLabel: '100 (Fragmented)',
          maxLabel: '1200 (Bloated)',
          helperText: 'Size of each indexed document slice.'
        },
        {
          id: 'top_k',
          label: 'Top-K Retrieved Chunks',
          type: 'slider',
          min: 1,
          max: 15,
          step: 1,
          defaultValue: 4,
          unit: 'chunks',
          minLabel: '1 chunk',
          maxLabel: '15 chunks',
          helperText: 'How many passages get stuffed into the LLM prompt.'
        },
        {
          id: 'hybrid_rerank',
          label: 'Hybrid Search + Reranker',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Combines keyword + semantic search and re-scores top passages before generation.'
        }
      ],
      formulaRules: [
        {
          metric: 'Grounded Accuracy (%)',
          formula: 'sweet spot chunk_size 250–500 & top_k 3–6; hybrid_rerank adds +9%; giant context suffers "lost-in-the-middle" drop',
          plainMeaning: 'Tiny chunks cut sentences in half; giant chunks + high top_k flood the prompt with distracting noise.'
        },
        {
          metric: 'Latency (ms)',
          formula: '180 + (hybrid_rerank ? 115 : 35) + (chunk_size × top_k × 0.08) ms',
          plainMeaning: 'Reranking adds ~80ms, and huge prompts slow down LLM prefill.'
        },
        {
          metric: 'Token Cost ($ per query)',
          formula: '(chunk_size × top_k + 200) × $0.000002 + $0.0009 output',
          plainMeaning: 'Prompt token spend multiplies directly by chunk_size × top_k!'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Build a Sliding-Window Word Chunker',
        prompt: 'Write `make_chunks(words, size, overlap)` that splits a list of words into chunks of length `size` stepping forward by `size - overlap`.',
        starterCode: `def make_chunks(words, size, overlap):
    step = max(1, size - overlap)
    result = []
    for i in range(0, len(words), step):
        result.append(words[i : i + size])
        if i + size >= len(words):
            break
    return result`,
        expectedInput: 'words = ["a","b","c","d","e"], size = 3, overlap = 1',
        expectedOutput: '[["a","b","c"], ["c","d","e"]]',
        hint: 'Step by `size - overlap`, and break once `i + size >= len(words)` so you do not create redundant tail fragments.',
        solutionCode: `def make_chunks(words, size, overlap):
    step = max(1, size - overlap)
    result = []
    for i in range(0, len(words), step):
        result.append(words[i : i + size])
        if i + size >= len(words):
            break
    return result`,
        requiredTokens: ['def make_chunks', 'size - overlap', 'range(', 'return'],
        verificationNote: 'Verified: overlap of 1 preserves "c" across the boundary without extra trailing fragments.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set chunk_size too high (e.g., 1,200 tokens) alongside top_k = 15?',
          options: [
            'Vector search stops working.',
            'Prompt token cost skyrockets (~18,000 tokens), latency climbs, and the LLM suffers "lost-in-the-middle" distraction.',
            'The model automatically compresses text for free.',
            'Citations become 100% accurate.'
          ],
          correctIndex: 1,
          explanation: 'Massive noisy chunks dilute embedding specificity, inflate bills, and bury the true answer inside walls of irrelevant text.'
        },
        {
          id: 'q2',
          question: 'What breaks if we set chunk_size too small (e.g., 25 tokens) with zero overlap?',
          options: [
            'Each chunk loses surrounding context (like who or what a policy applies to), hurting answer accuracy.',
            'Token cost increases 10×.',
            'Hybrid search stops matching keywords.',
            'The LLM cannot output JSON.'
          ],
          correctIndex: 0,
          explanation: 'Ultra-tiny chunks sever conditions and exceptions from the main sentence, retrieving misleading snippets.'
        }
      ]
    }
  },

  // =========================================================================
  // STAGE 5: DURABLE MULTI-AGENT ORCHESTRATION
  // =========================================================================
  {
    id: 'agents-loop-budgets',
    stageId: 'durable-multi-agent',
    stageNumber: 5,
    stageTitle: 'Durable Multi-Agent Orchestration',
    topicNumber: '5.1',
    title: 'Tool-Using Agent Loops & Safety Budgets',
    tagline: 'Let models propose actions in a bounded loop while deterministic server code enforces tools, permissions, and limits.',
    estimatedMinutes: 14,
    simpleEnglish: {
      plainExplanation:
        'An AI agent runs in a controlled loop: look at the goal, decide one next action (like calling a lookup tool), let the server check if that tool is allowed, run the tool, inspect the observation, and stop once the answer is ready or the step budget runs out. Golden rule: the LLM proposes, but your server code enforces permissions and budgets.',
      analogyTitle: 'An Intern with a Checklist, Keycard & 5-Minute Timer',
      analogyStory:
        'You ask an intern to check an order price and calculate a 10% discount. Their keycard only opens the Product Catalog and Calculator—never the Bank Vault. They have a strict 4-step checklist limit: if they still haven’t solved it after 4 tries, they stop and ask you instead of spinning in circles spending money all day.',
      analogyMappings: [
        {
          realWorld: 'Intern deciding which office to visit next',
          aiConcept: 'Model Decision Proposal',
          whyItMatters: 'Flexible reasoning without hard-coding every possible path.'
        },
        {
          realWorld: 'Security keycard checking room access',
          aiConcept: 'Server-Side Allow-List & Policy Gate',
          whyItMatters: 'A prompt injection cannot grant permissions the user doesn’t hold.'
        },
        {
          realWorld: '5-minute timer & step cap',
          aiConcept: 'max_steps & Token/Timeout Budgets',
          whyItMatters: 'Prevents infinite loops and runaway API bills.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'bounded_agent.py — Safe observe-decide-act loop with allow-list',
      codeSnippet: `ALLOWED_TOOLS = {"get_price", "apply_discount"}

def run_agent_step(proposed_tool: str, args: dict, step: int, max_steps: int):
    # 1. Enforce hard step budget before doing anything
    if step >= max_steps:
        return {"status": "STOPPED_BUDGET", "reason": "max_steps reached"}

    # 2. Enforce server-side tool allow-list (never trust model blindly)
    if proposed_tool not in ALLOWED_TOOLS:
        return {"status": "DENIED", "reason": f"Tool '{proposed_tool}' not allowed"}

    # 3. Execute safely and return structured observation
    return {"status": "EXECUTED", "tool": proposed_tool, "args": args, "next_step": step + 1}`
    },
    architectureFlow: {
      diagramType: 'sequenceDiagram',
      flowCaption: 'The agent runtime loops between model proposals, strict server policy checks, bounded tool execution, and budget enforcement.',
      nodeLabels: {
        User: 'User Task',
        Runtime: 'Agent Runtime + Budget',
        LLM: 'LLM Planner',
        Policy: 'Policy & Allow-List Gate',
        Tool: 'Scoped Tool'
      },
      mermaidSyntax: `sequenceDiagram
    participant User as User Task
    participant Runtime as Agent Runtime
    participant LLM as LLM Planner
    participant Policy as Policy Gate
    participant Tool as Scoped Tool
    User->>Runtime: Submit task + step budget (max=5)
    Runtime->>LLM: Send state & prior observations
    LLM-->>Runtime: Propose tool call + arguments
    Runtime->>Policy: Check user scope, schema & budget
    Policy->>Tool: Execute with timeout
    Tool-->>Runtime: Return observation → check stop condition`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'User',
        visual_state_description: 'User asks: "Price of SKU-42 with 10% loyalty discount." Runtime initializes step=0, max_steps=4.',
        sample_data_payload: { goal: 'Price SKU-42 with 10% off', step: 0, max_steps: 4 }
      },
      {
        step_number: 2,
        highlight_node: 'LLM',
        visual_state_description: 'LLM Planner proposes calling `get_price(sku="SKU-42")`. Proposal is treated as untrusted input.',
        sample_data_payload: { proposed_action: 'get_price', args: { sku: 'SKU-42' } }
      },
      {
        step_number: 3,
        highlight_node: 'Policy',
        visual_state_description: 'Policy Gate verifies `get_price` is in ALLOWED_TOOLS, schema matches, and step 1 ≤ 4.',
        sample_data_payload: { policy_decision: 'ALLOW', verified_scope: 'catalog:read' }
      },
      {
        step_number: 4,
        highlight_node: 'Tool',
        visual_state_description: 'Catalog tool completes in 85ms and returns structured observation `{price: 80}`.',
        sample_data_payload: { observation: { sku: 'SKU-42', price_usd: 80 }, tool_latency_ms: 85 }
      },
      {
        step_number: 5,
        highlight_node: 'Runtime',
        visual_state_description: 'After applying 10% discount ($72), Planner emits final answer; Runtime cleanly exits at step 2/4.',
        sample_data_payload: { final_answer: '$72.00', steps_used: 2, status: 'COMPLETED' }
      }
    ],
    simulatorConfig: {
      summary: 'Adjust max_steps, tool timeout, and strict policy gating to see how agent completion, latency, and multi-turn cost behave.',
      controls: [
        {
          id: 'max_steps',
          label: 'Max Loop Steps',
          type: 'slider',
          min: 1,
          max: 15,
          step: 1,
          defaultValue: 5,
          unit: 'steps',
          minLabel: '1 (Too tight)',
          maxLabel: '15 (Loop risk)',
          helperText: 'Hard cap on how many reasoning/tool turns the agent may take.'
        },
        {
          id: 'tool_timeout_ms',
          label: 'Tool Timeout Limit',
          type: 'slider',
          min: 100,
          max: 5000,
          step: 100,
          defaultValue: 1200,
          unit: 'ms',
          minLabel: '100 ms',
          maxLabel: '5000 ms',
          helperText: 'Max time to wait for an external API before failing safely.'
        },
        {
          id: 'strict_policy_gate',
          label: 'Server-Side Policy & Schema Gate',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Validates every tool call against user scopes and strict schemas before execution.'
        }
      ],
      formulaRules: [
        {
          metric: 'Task Safety & Accuracy (%)',
          formula: 'max_steps < 2 ? 54% : (strict_policy_gate ? 93% − max(0, max_steps − 8)×2.2 : 61%)',
          plainMeaning: 'A 1-step budget cuts off multi-tool tasks; disabling policy gates opens severe security failures.'
        },
        {
          metric: 'Worst-Case Latency (ms)',
          formula: 'max_steps × (320 ms LLM + min(tool_timeout_ms, 1800) × 0.35)',
          plainMeaning: 'Every additional loop turn pays another full LLM call plus tool round-trip.'
        },
        {
          metric: 'Multi-Turn Token Cost ($)',
          formula: 'sum_{t=1..steps} (600 + t × 350) × $0.000003',
          plainMeaning: 'Conversation history grows every turn, making runaway loops quadratically expensive!'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Guard an Agent Tool Dispatch',
        prompt: 'Write `authorize_tool(tool_name, allow_list, steps_used, max_steps)` returning `"ALLOW"` only if `tool_name in allow_list` AND `steps_used < max_steps`, otherwise `"DENY"`.',
        starterCode: `def authorize_tool(tool_name, allow_list, steps_used, max_steps):
    if steps_used < max_steps and tool_name in allow_list:
        return "ALLOW"
    return "DENY"`,
        expectedInput: 'tool_name="delete_db", allow_list={"search","calc"}, steps_used=1, max_steps=5',
        expectedOutput: '"DENY"',
        hint: 'Require BOTH conditions with `and`; fail closed by returning "DENY" otherwise.',
        solutionCode: `def authorize_tool(tool_name, allow_list, steps_used, max_steps):
    if steps_used < max_steps and tool_name in allow_list:
        return "ALLOW"
    return "DENY"`,
        requiredTokens: ['def authorize_tool', 'in allow_list', 'max_steps', 'DENY'],
        verificationNote: 'Verified: fail-closed policy blocks unauthorized "delete_db" even when budget remains.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set max_steps too high (e.g., 50) without duplicate-action detection?',
          options: [
            'The agent solves every problem faster.',
            'A confused agent can loop on a failing tool 50 times, causing quadratic token bills and minute-long hangs.',
            'Tool schemas become stricter.',
            'Latency drops to 10ms.'
          ],
          correctIndex: 1,
          explanation: 'Each loop appends observations to the prompt history, so a stuck 50-step loop burns huge token costs and stalls users.'
        },
        {
          id: 'q2',
          question: 'What breaks if you rely only on the system prompt ("Please do not call admin tools") instead of a server-side policy gate?',
          options: [
            'Prompt injection inside user text or retrieved documents can trick the model into proposing restricted tools anyway.',
            'Python fails to import json.',
            'The agent cannot read observations.',
            'Token cost drops.'
          ],
          correctIndex: 0,
          explanation: 'Prompt instructions are advisory guidance, never security boundaries. Authorization must live in deterministic server code.'
        }
      ]
    }
  },
  {
    id: 'agents-durable-checkpoints',
    stageId: 'durable-multi-agent',
    stageNumber: 5,
    stageTitle: 'Durable Multi-Agent Orchestration',
    topicNumber: '5.2',
    title: 'Durable Checkpoints, Idempotency & Human Approval',
    tagline: 'Resume crashed multi-agent workflows cleanly without ever charging a customer or sending an email twice.',
    estimatedMinutes: 15,
    simpleEnglish: {
      plainExplanation:
        'Real multi-agent workflows can run for minutes or pause waiting for a manager to approve a refund. If a server crashes halfway through, a durable Checkpoint saves where the workflow left off so it resumes instead of starting over. And an Idempotency Key acts like a unique receipt number so retrying a payment or email tool never performs the side effect twice.',
      analogyTitle: 'Video Game Save Points + Bank Transfer Receipt Numbers',
      analogyStory:
        'Before fighting a boss, you hit a save point (Checkpoint) so a power outage doesn’t send you back to Level 1. Meanwhile, when you wire $500 at a bank, the transfer gets a unique transaction ID (Idempotency Key). If the Wi-Fi drops and you click "Send" again with that same ID, the bank sees the receipt already succeeded and refuses to charge you $1,000.',
      analogyMappings: [
        {
          realWorld: 'Video game save crystal',
          aiConcept: 'Durable State Checkpoint',
          whyItMatters: 'Lets multi-agent graphs survive crashes and long human pauses.'
        },
        {
          realWorld: 'Unique bank wire receipt ID',
          aiConcept: 'Idempotency Key',
          whyItMatters: 'Guarantees retries never trigger duplicate refunds, emails, or orders.'
        },
        {
          realWorld: 'Manager signing off on a large wire transfer',
          aiConcept: 'Human-in-the-Loop Approval Gate',
          whyItMatters: 'Pauses high-risk mutations until a verified human approves exact arguments.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'idempotent_executor.py — Never execute a side effect twice on retry',
      codeSnippet: `def execute_with_idempotency(receipt_store: dict, idem_key: str, action_fn):
    # 1. Check if this exact action receipt already succeeded before crash/retry
    if idem_key in receipt_store:
        return {"replayed": True, "result": receipt_store[idem_key]}

    # 2. Run the external action once and save the receipt durably
    result = action_fn()
    receipt_store[idem_key] = result
    return {"replayed": False, "result": result}`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'Multi-agent tasks persist checkpoints, pause for human approval on high-risk actions, and guard external side effects with idempotency keys.',
      nodeLabels: {
        SUP: 'Supervisor Agent',
        WORK: 'Specialist Worker',
        CKPT: 'Checkpoint Store',
        HITL: 'Human Approval Gate',
        IDEM: 'Idempotent Tool Executor',
        AUDIT: 'Immutable Audit Log'
      },
      mermaidSyntax: `flowchart TD
    SUP["Supervisor Splits Goal"] --> WORK["Specialist Worker Runs Step"]
    WORK --> CKPT["Save Durable Checkpoint"]
    CKPT --> HITL{"High-Impact Action?"}
    HITL -->|Approved| IDEM["Execute with Idempotency Key"]
    IDEM --> AUDIT["Record Receipt & Audit Event"]`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'SUP',
        visual_state_description: 'Supervisor receives refund request #R-902 ($450) and assigns verification to Billing Worker.',
        sample_data_payload: { workflow_id: 'wf-902', amount_usd: 450, risk_tier: 'HIGH' }
      },
      {
        step_number: 2,
        highlight_node: 'WORK',
        visual_state_description: 'Billing Worker verifies invoice eligibility and drafts action `refund(order="O-77", amount=450)`.',
        sample_data_payload: { worker: 'billing_agent', proposed_action: 'refund', action_hash: 'sha256:9f2a...' }
      },
      {
        step_number: 3,
        highlight_node: 'CKPT',
        visual_state_description: 'State is saved to durable storage. Workflow safely hibernates—consuming zero RAM while waiting.',
        sample_data_payload: { checkpoint_id: 'ckpt-03', state: 'WAITING_APPROVAL', persisted: true }
      },
      {
        step_number: 4,
        highlight_node: 'HITL',
        visual_state_description: 'Finance manager reviews the exact payload hash (`sha256:9f2a...`) and clicks Approve.',
        sample_data_payload: { approver: 'mgr-elena', bound_hash: 'sha256:9f2a...', decision: 'APPROVED' }
      },
      {
        step_number: 5,
        highlight_node: 'IDEM',
        visual_state_description: 'Network blinks after refund succeeds; worker retries with `idem_key="wf-902:refund"`. Receipt cache returns prior result—zero double charge!',
        sample_data_payload: { idem_key: 'wf-902:refund', attempt: 2, duplicate_blocked: true, total_charges: 1 }
      },
      {
        step_number: 6,
        highlight_node: 'AUDIT',
        visual_state_description: 'Workflow marks COMPLETED and writes redacted approval + receipt lineage to the audit log.',
        sample_data_payload: { status: 'COMPLETED', audit_id: 'aud-4418', side_effects: 1 }
      }
    ],
    simulatorConfig: {
      summary: 'Configure checkpoint frequency, retry caps, and human approval to see reliability, recovery latency, and retry cost.',
      controls: [
        {
          id: 'checkpoint_interval',
          label: 'Checkpoint Every N Steps',
          type: 'slider',
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 1,
          unit: 'steps',
          minLabel: '1 (Every step)',
          maxLabel: '5 (Rare saves)',
          helperText: 'How often durable state is saved. Higher gaps mean more lost work after a crash.'
        },
        {
          id: 'retry_limit',
          label: 'Max Automatic Retries',
          type: 'slider',
          min: 0,
          max: 8,
          step: 1,
          defaultValue: 2,
          unit: 'retries',
          minLabel: '0 (No retry)',
          maxLabel: '8 (Aggressive)',
          helperText: 'Bounded retries on transient failures (paired with idempotency keys).'
        },
        {
          id: 'require_human_approval',
          label: 'Human Approval Gate on Mutations',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Pauses high-risk writes until a human approves the exact action payload.'
        }
      ],
      formulaRules: [
        {
          metric: 'Workflow Reliability & Safety (%)',
          formula: '95 − (checkpoint_interval − 1)×4.5 − (!human_approval ? 16 : 0) − (retry_limit === 0 ? 11 : retry_limit > 5 ? 6 : 0)',
          plainMeaning: 'Frequent checkpoints prevent rework; human approval blocks costly agent mistakes; bounded retries survive blips.'
        },
        {
          metric: 'Recovery / End-to-End Latency (ms)',
          formula: '240 + (checkpoint_interval × 140 crash-replay) + (retry_limit × 190 backoff) + (human_approval ? 600 : 0)',
          plainMeaning: 'Sparse checkpoints force re-running expensive LLM steps after crashes; too many retries drag out failures.'
        },
        {
          metric: 'Token Cost on Failure ($)',
          formula: '0.004 + (checkpoint_interval × 0.0022) + (retry_limit × 0.0018)',
          plainMeaning: 'Checkpointing every step saves you from paying twice for already-finished LLM turns.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Write an Idempotent Payment Guard',
        prompt: 'Write `charge_once(ledger, key, amount)` that records `ledger[key] = amount` and returns `"CHARGED"` the first time, or returns `"ALREADY_CHARGED"` without modifying `ledger` if `key` exists.',
        starterCode: `def charge_once(ledger, key, amount):
    if key in ledger:
        return "ALREADY_CHARGED"
    ledger[key] = amount
    return "CHARGED"`,
        expectedInput: 'ledger = {"ord-1": 50}, key = "ord-1", amount = 50',
        expectedOutput: '"ALREADY_CHARGED"',
        hint: 'Check `if key in ledger:` first before writing.',
        solutionCode: `def charge_once(ledger, key, amount):
    if key in ledger:
        return "ALREADY_CHARGED"
    ledger[key] = amount
    return "CHARGED"`,
        requiredTokens: ['def charge_once', 'in ledger', 'ALREADY_CHARGED', 'CHARGED'],
        verificationNote: 'Verified: repeated calls with key="ord-1" short-circuit safely without charging twice.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set retry_limit too high on a payment API that lacks idempotency keys?',
          options: [
            'The checkpoint store compresses automatically.',
            'Network timeouts trigger repeated retries that charge the customer multiple times.',
            'Human approval happens faster.',
            'Token cost drops to zero.'
          ],
          correctIndex: 1,
          explanation: 'A caller timeout does NOT mean the server failed—retrying without an idempotency key causes duplicate real-world side effects.'
        },
        {
          id: 'q2',
          question: 'What breaks if a human approval token is NOT bound to the exact action arguments?',
          options: [
            'An approval granted for a $10 refund could be replayed or altered to execute a $10,000 refund.',
            'The database refuses to save JSON.',
            'Checkpoints disappear.',
            'Agents stop using tools.'
          ],
          correctIndex: 0,
          explanation: 'Binding approvals to a cryptographic hash of the exact target and arguments prevents tampering or replay.'
        }
      ]
    }
  },

  // =========================================================================
  // STAGE 6: INFERENCE PERFORMANCE & LLMOPS
  // =========================================================================
  {
    id: 'llmops-kv-batching',
    stageId: 'inference-llmops',
    stageNumber: 6,
    stageTitle: 'Inference Performance & LLMOps',
    topicNumber: '6.1',
    title: 'KV Cache, Continuous Batching & Quantization',
    tagline: 'Serve 10× more users on the same GPU by caching math, packing active requests, and shrinking weight precision.',
    estimatedMinutes: 15,
    simpleEnglish: {
      plainExplanation:
        'Serving LLMs fast and affordably hinges on three tricks. First, KV Cache remembers earlier token math so the GPU does not re-read the whole conversation on every single new word. Second, Continuous Batching slips a new user into an open GPU slot the instant another user finishes. Third, Quantization stores model weights in smaller numbers (8-bit or 4-bit instead of 16-bit) to fit more active users in GPU memory.',
      analogyTitle: 'A Smart Commercial Kitchen (Prep Counter + Shared Oven)',
      analogyStory:
        'Without a KV Cache, a chef would re-chop all the onions from scratch for every single spoonful of soup! With KV Cache, prepped ingredients sit ready on the counter. With Continuous Batching, as soon as one pizza leaves the oven, the next ticket slides straight in instead of waiting for all 8 pizzas to finish at once. Quantization is like using compact stackable containers so 2× more ingredients fit in the fridge.',
      analogyMappings: [
        {
          realWorld: 'Pre-chopped ingredients ready on counter',
          aiConcept: 'KV Cache (Key/Value Memory)',
          whyItMatters: 'Avoids recomputing attention over all past tokens on every decode step.'
        },
        {
          realWorld: 'Sliding new pizzas into freed oven spots immediately',
          aiConcept: 'Continuous (Iteration-Level) Batching',
          whyItMatters: 'Keeps expensive GPUs busy instead of idling behind one long essay.'
        },
        {
          realWorld: 'Compact stackable containers',
          aiConcept: 'Quantization (FP16 → INT8 / INT4)',
          whyItMatters: 'Cuts GPU memory footprint by 2×–4× with minimal quality loss.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'kv_cache_estimator.py — Calculate GPU VRAM needed for KV Cache',
      codeSnippet: `def estimate_kv_cache_mb(
    layers: int, kv_heads: int, head_dim: int, seq_len: int, bytes_per_val: int = 2
) -> float:
    # Factor of 2 stores both Keys (K) and Values (V) for every token
    bytes_per_token = 2 * layers * kv_heads * head_dim * bytes_per_val
    total_bytes = bytes_per_token * seq_len
    return round(total_bytes / (1024 * 1024), 2)

# Example: 32 layers, 8 KV heads, 128 dim, 4096 tokens in FP16 (2 bytes)
# -> 512.0 MB per active user sequence!`
    },
    architectureFlow: {
      diagramType: 'flowchart',
      flowCaption: 'Incoming requests enter admission control, run prefill once, allocate paged KV-cache blocks, and stream tokens via continuous batching.',
      nodeLabels: {
        REQ: 'Incoming User Requests',
        ADMIT: 'Admission & VRAM Budget',
        PREFILL: 'Prefill Prompt (TTFT)',
        KV: 'Paged KV Cache Pool',
        BATCH: 'Continuous Batch Decode',
        STREAM: 'Stream Token Deltas'
      },
      mermaidSyntax: `flowchart TD
    REQ["Concurrent User Requests"] --> ADMIT["Admission Control: Check Free VRAM"]
    ADMIT --> PREFILL["Prefill Prompt Tokens (TTFT)"]
    PREFILL --> KV["Allocate KV Cache Blocks"]
    KV --> BATCH["Continuous Batch Decode Loop"]
    BATCH --> STREAM["Stream Tokens & Free Finished Slots"]`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'REQ',
        visual_state_description: '12 concurrent users send prompts of varying lengths (100 to 2,000 tokens) to one GPU server.',
        sample_data_payload: { incoming_requests: 12, gpu_vram_gb: 24, free_kv_gb: 9.5 }
      },
      {
        step_number: 2,
        highlight_node: 'ADMIT',
        visual_state_description: 'Admission controller estimates KV-cache reservation per request and admits 8 active sequences while queueing 4 safely.',
        sample_data_payload: { admitted: 8, queued: 4, oom_prevented: true }
      },
      {
        step_number: 3,
        highlight_node: 'PREFILL',
        visual_state_description: 'GPU processes prompt tokens in parallel, measuring Time-To-First-Token (TTFT = 145 ms).',
        sample_data_payload: { phase: 'PREFILL', ttft_ms: 145, prompt_tokens_processed: 4800 }
      },
      {
        step_number: 4,
        highlight_node: 'KV',
        visual_state_description: 'Computed Key/Value tensors are stored in paged KV blocks so decode steps read cached math instead of recomputing.',
        sample_data_payload: { kv_cache_used_gb: 4.1, recompute_saved_pct: 94 }
      },
      {
        step_number: 5,
        highlight_node: 'BATCH',
        visual_state_description: 'User #3 finishes early at token 40; continuous batcher immediately slots queued User #9 into the freed space!',
        sample_data_payload: { finished_req: 'u3', newly_slotted: 'u9', gpu_utilization_pct: 91, tokens_per_sec: 410 }
      }
    ],
    simulatorConfig: {
      summary: 'Adjust batch_size, weight quantization precision, and KV Cache to explore GPU throughput, latency, quality, and serving cost.',
      controls: [
        {
          id: 'batch_size',
          label: 'Active Batch Size',
          type: 'slider',
          min: 1,
          max: 64,
          step: 1,
          defaultValue: 16,
          unit: 'seqs',
          minLabel: '1 (Idle GPU)',
          maxLabel: '64 (VRAM pressure)',
          helperText: 'Concurrent sequences decoded together on the GPU.'
        },
        {
          id: 'quant_bits',
          label: 'Quantization Precision',
          type: 'slider',
          min: 4,
          max: 16,
          step: 4,
          defaultValue: 8,
          unit: '-bit',
          minLabel: '4-bit (Compact)',
          maxLabel: '16-bit (Full FP16)',
          helperText: 'Bit width of model weights (4-bit, 8-bit, or 16-bit).'
        },
        {
          id: 'kv_cache_enabled',
          label: 'KV Cache Enabled',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Caches past attention keys/values instead of recomputing the entire prompt per token.'
        }
      ],
      formulaRules: [
        {
          metric: 'Output Quality / Accuracy (%)',
          formula: 'quant_bits === 16 ? 97% : quant_bits === 8 ? 95.5% : 91% (minus OOM penalty if batch_size overflows VRAM)',
          plainMeaning: '8-bit quantization retains near-FP16 accuracy; 4-bit saves huge memory with a modest nuance trade-off.'
        },
        {
          metric: 'Per-User Latency (ms)',
          formula: '(kv_cache ? 110 : 780) + batch_size × (quant_bits === 16 ? 9.5 : quant_bits === 8 ? 6.2 : 4.4) ms',
          plainMeaning: 'Turning off KV Cache spikes latency ~7×; giant batches increase queuing and inter-token delay.'
        },
        {
          metric: 'Serving Cost ($ per 1M tokens)',
          formula: '(1.45 / Math.sqrt(batch_size)) × (quant_bits / 8) × (kv_cache ? 1 : 3.2)',
          plainMeaning: 'Batching and quantization dramatically lower GPU dollars spent per million tokens served.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Calculate KV-Cache Megabytes',
        prompt: 'Write `kv_mb(layers, kv_heads, head_dim, tokens)` for FP16 (`2` bytes/value) returning MB rounded to 2 decimals. Formula: `(2 * layers * kv_heads * head_dim * 2 * tokens) / (1024 * 1024)`.',
        starterCode: `def kv_mb(layers, kv_heads, head_dim, tokens):
    total_bytes = 2 * layers * kv_heads * head_dim * 2 * tokens
    return round(total_bytes / (1024 * 1024), 2)`,
        expectedInput: 'layers=32, kv_heads=8, head_dim=128, tokens=1024',
        expectedOutput: '128.0',
        hint: 'Multiply by 2 for K & V, and by 2 bytes for FP16, then divide by 1024*1024.',
        solutionCode: `def kv_mb(layers, kv_heads, head_dim, tokens):
    total_bytes = 2 * layers * kv_heads * head_dim * 2 * tokens
    return round(total_bytes / (1024 * 1024), 2)`,
        requiredTokens: ['def kv_mb', '1024', 'round(', 'return'],
        verificationNote: 'Verified: 1,024 FP16 tokens consume 128.0 MB of KV-cache VRAM per active request.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set batch_size too high on a fixed-VRAM GPU without admission control?',
          options: [
            'Model accuracy reaches 100%.',
            'KV-cache memory exhausts GPU VRAM, triggering CUDA Out-Of-Memory (OOM) crashes or extreme queueing delays.',
            'Quantization automatically switches to 16-bit.',
            'Prompt tokens shrink.'
          ],
          correctIndex: 1,
          explanation: 'Every active request reserves KV cache proportional to sequence length; unbounded batching crashes the serving engine with OOM.'
        },
        {
          id: 'q2',
          question: 'What breaks if KV Cache is disabled during long multi-turn chat generation?',
          options: [
            'The model forgets the user’s name.',
            'Every single generated token forces the GPU to recompute attention over all previous tokens, making decode latency explode quadratically.',
            'Output becomes purely random.',
            'GPU memory usage doubles.'
          ],
          correctIndex: 1,
          explanation: 'Without KV caching, generating N tokens does O(N²) redundant math instead of reusing stored key/value vectors.'
        }
      ]
    }
  },
  {
    id: 'llmops-eval-canary',
    stageId: 'inference-llmops',
    stageNumber: 6,
    stageTitle: 'Inference Performance & LLMOps',
    topicNumber: '6.2',
    title: 'CI Evaluation Gates, Canary Rollouts & FinOps',
    tagline: 'Test every prompt or model change on a golden benchmark, roll out to 5% first, and auto-rollback regressions.',
    estimatedMinutes: 13,
    simpleEnglish: {
      plainExplanation:
        'In AI engineering, changing one sentence in a prompt can silently break 15% of customer answers. LLMOps treats prompts, models, and indexes as one versioned release bundle. Before shipping, CI runs a Golden Evaluation Set. If it passes, a Canary Rollout sends just 5% of live traffic to the new bundle—automatically rolling back if quality, safety, error rate, or cost regresses.',
      analogyTitle: 'Taste-Testing a New Recipe on 5% of Diners First',
      analogyStory:
        'Before changing a restaurant’s signature pasta for all 500 nightly guests, the head chef tests it against a tasting checklist (CI Eval Gate), then serves it to just 5% of tables (Canary Rollout). If diners send plates back or the kitchen slows down, the chef immediately switches back to last week’s proven recipe (Rollback) before ruining dinner for everyone.',
      analogyMappings: [
        {
          realWorld: 'Head chef’s tasting rubric',
          aiConcept: 'Golden Dataset CI Evaluation Gate',
          whyItMatters: 'Catches silent quality and safety regressions before users ever see them.'
        },
        {
          realWorld: 'Serving 5% of tables first',
          aiConcept: 'Canary Traffic Routing',
          whyItMatters: 'Limits blast radius while measuring real production latency and errors.'
        },
        {
          realWorld: 'Keeping pre-made stock for repeat orders',
          aiConcept: 'Tenant-Safe Caching & FinOps Budgets',
          whyItMatters: 'Cuts LLM bills without leaking one customer’s answer to another.'
        }
      ],
      codeLanguage: 'python',
      codeTitle: 'canary_gate.py — Fail-closed release promotion check',
      codeSnippet: `def decide_canary(quality: float, error_rate: float, p95_ms: float) -> str:
    # Fail closed: EVERY critical guardrail must pass to promote!
    if quality < 0.90:
        return "ROLLBACK: quality dropped below 90% floor"
    if error_rate > 0.005:
        return "ROLLBACK: error rate exceeded 0.5% budget"
    if p95_ms > 2000:
        return "ROLLBACK: p95 latency breached 2000ms SLO"
    return "PROMOTE: all quality, reliability and latency gates passed"`
    },
    architectureFlow: {
      diagramType: 'sequenceDiagram',
      flowCaption: 'Candidate bundles pass through CI golden evaluation before receiving small canary traffic monitored for automatic promote or rollback.',
      nodeLabels: {
        Bundle: 'Candidate Release Bundle',
        CI: 'CI Golden Eval Gate',
        Router: 'Canary Traffic Router',
        Monitor: 'SLO & Cost Monitor',
        Action: 'Promote / Rollback'
      },
      mermaidSyntax: `sequenceDiagram
    participant Bundle as Candidate Bundle
    participant CI as CI Eval Gate
    participant Router as Canary Router
    participant Monitor as SLO & Cost Monitor
    participant Action as Promote / Rollback
    Bundle->>CI: Run golden set (quality, safety, cost)
    CI->>Router: Pass → route 5% canary traffic
    Router->>Monitor: Stream real p95 latency, errors & spend
    Monitor->>Action: Breach detected → auto-rollback bundle`
    },
    animationTimeline: [
      {
        step_number: 1,
        highlight_node: 'Bundle',
        visual_state_description: 'Engineer packages immutable bundle v2.4 (model digest + prompt v12 + index v8).',
        sample_data_payload: { bundle_id: 'rel-2.4', prompt: 'v12', index: 'idx-v8', signed: true }
      },
      {
        step_number: 2,
        highlight_node: 'CI',
        visual_state_description: 'CI Eval Gate runs 250 golden queries: quality 93.2% (≥90%), safety 100%, cost within budget.',
        sample_data_payload: { golden_cases: 250, quality_score: 0.932, safety_failures: 0, ci_gate: 'PASS' }
      },
      {
        step_number: 3,
        highlight_node: 'Router',
        visual_state_description: 'Canary Router shifts 5% of live traffic to v2.4 while 95% stays safely on proven v2.3.',
        sample_data_payload: { canary_pct: 5, stable_pct: 95, active_bundle: 'rel-2.4' }
      },
      {
        step_number: 4,
        highlight_node: 'Monitor',
        visual_state_description: 'Monitor watches real user traffic: p95 latency is 1,420ms (<2,000ms) and 5xx error rate is 0.1%.',
        sample_data_payload: { p95_ms: 1420, error_rate: 0.001, cost_per_task_usd: 0.0062 }
      },
      {
        step_number: 5,
        highlight_node: 'Action',
        visual_state_description: 'All SLOs hold across the observation window—release controller promotes v2.4 to 25% → 100%.',
        sample_data_payload: { decision: 'PROMOTE_NEXT_STEP', rollback_target_kept: 'rel-2.3' }
      }
    ],
    simulatorConfig: {
      summary: 'Adjust canary traffic percentage, CI quality floor, and tenant-safe caching to balance release safety, latency, and monthly FinOps spend.',
      controls: [
        {
          id: 'canary_pct',
          label: 'Initial Canary Traffic',
          type: 'slider',
          min: 1,
          max: 100,
          step: 1,
          defaultValue: 5,
          unit: '%',
          minLabel: '1% (Tiny probe)',
          maxLabel: '100% (Big Bang!)',
          helperText: 'Percentage of live users exposed to an unproven candidate release.'
        },
        {
          id: 'quality_floor',
          label: 'CI Quality Gate Floor',
          type: 'slider',
          min: 70,
          max: 99,
          step: 1,
          defaultValue: 90,
          unit: '%',
          minLabel: '70% (Loose)',
          maxLabel: '99% (Ultra strict)',
          helperText: 'Minimum golden-set accuracy required before deployment is allowed.'
        },
        {
          id: 'semantic_cache',
          label: 'Tenant-Scoped Response Cache',
          type: 'toggle',
          defaultValue: true,
          helperText: 'Caches identical verified queries keyed by (tenant_id, prompt_ver, index_ver).'
        }
      ],
      formulaRules: [
        {
          metric: 'Production Release Safety (%)',
          formula: 'min(99, quality_floor × 0.92 + (canary_pct <= 10 ? 11 : -(canary_pct − 10) × 0.25))',
          plainMeaning: 'Small canary steps + high CI quality floors protect 95%+ of users from unexpected regressions.'
        },
        {
          metric: 'Blended p95 Latency (ms)',
          formula: 'semantic_cache ? 410 + canary_pct × 1.8 : 980 + canary_pct × 2.5 ms',
          plainMeaning: 'Safe tenant-scoped cache hits return in ~35ms, pulling average and p95 latency sharply down.'
        },
        {
          metric: 'Cost per 1k Successful Tasks ($)',
          formula: '(semantic_cache ? 3.8 : 6.9) + (quality_floor < 85 ? 2.4 retry waste : 0)',
          plainMeaning: 'Low-quality releases cause user retries that silently inflate cost per successful task.'
        }
      ]
    },
    handsOnPractice: {
      codingChallenge: {
        title: 'Write a Fail-Closed Canary Gate',
        prompt: 'Write `should_promote(quality, error_rate)` returning `True` ONLY when `quality >= 0.90` AND `error_rate <= 0.01`, else `False`.',
        starterCode: `def should_promote(quality, error_rate):
    return quality >= 0.90 and error_rate <= 0.01`,
        expectedInput: 'quality = 0.94, error_rate = 0.03',
        expectedOutput: 'False',
        hint: 'Both conditions must pass simultaneously; high quality cannot excuse a 3% error rate.',
        solutionCode: `def should_promote(quality, error_rate):
    return quality >= 0.90 and error_rate <= 0.01`,
        requiredTokens: ['def should_promote', '0.90', '0.01', 'and'],
        verificationNote: 'Verified: 3% error rate blocks promotion even though quality is 94%.'
      },
      troubleshootingQuiz: [
        {
          id: 'q1',
          question: 'What breaks if we set initial canary_traffic_pct to 100% ("Big Bang" deploy)?',
          options: [
            'CI runs twice as fast.',
            'Every single live user immediately hits any hidden regression, latency spike, or cost bug before monitoring can catch it.',
            'Caching stops using memory.',
            'Error rates become impossible to measure.'
          ],
          correctIndex: 1,
          explanation: 'A 100% instant cutover removes your blast-radius safety net; progressive 5% → 25% → 100% steps contain harm.'
        },
        {
          id: 'q2',
          question: 'What breaks if a response cache key omits tenant_id and prompt_version?',
          options: [
            'Cache hit rate drops to 0%.',
            'Tenant A can receive Tenant B’s private cached answer (cross-tenant leak) or stale answers after a prompt update.',
            'GPU batch size shrinks.',
            'Latency increases to 10 seconds.'
          ],
          correctIndex: 1,
          explanation: 'Cache keys must always include canonical tenant identity plus model, prompt, and index versions.'
        }
      ]
    }
  }
]
