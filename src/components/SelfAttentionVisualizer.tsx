import { useMemo, useState } from 'react'
import { Eye, Layers, Sparkles } from 'lucide-react'

type HeadMode = 'semantic' | 'syntax' | 'positional'

type SentencePreset = {
  id: string
  label: string
  tokens: string[]
  /** Base affinity vectors [semanticGroup, actionGroup, modifierGroup, entityGroup] per token */
  vectors: number[][]
  /** Explicit linguistic links boosted for each specialized head: [fromIdx, toIdx, boost] */
  headBoosts: Record<HeadMode, [number, number, number][]>
  insightFor: (queryIdx: number, topKeyIdx: number, head: HeadMode, causal: boolean) => string
}

const SENTENCE_PRESETS: SentencePreset[] = [
  {
    id: 'pronoun',
    label: 'Pronoun Coreference ("it" → "animal")',
    tokens: ['The', 'animal', 'did', 'not', 'cross', 'the', 'street', 'because', 'it', 'was', 'tired'],
    vectors: [
      [0.2, 0.1, 0.1, 0.4],
      [0.95, 0.2, 0.2, 0.95],
      [0.2, 0.8, 0.4, 0.1],
      [0.15, 0.7, 0.95, 0.1],
      [0.3, 0.95, 0.3, 0.2],
      [0.2, 0.1, 0.1, 0.35],
      [0.45, 0.25, 0.15, 0.85],
      [0.3, 0.4, 0.7, 0.2],
      [0.92, 0.25, 0.25, 0.9],
      [0.25, 0.75, 0.35, 0.15],
      [0.88, 0.35, 0.8, 0.7]
    ],
    headBoosts: {
      semantic: [
        [8, 1, 2.4], // "it" -> "animal"
        [10, 1, 1.9], // "tired" -> "animal"
        [10, 8, 1.7], // "tired" -> "it"
        [4, 6, 1.6], // "cross" -> "street"
        [6, 4, 1.4],
        [1, 10, 1.4]
      ],
      syntax: [
        [4, 3, 2.1], // "cross" -> "not"
        [3, 2, 1.8], // "not" -> "did"
        [8, 7, 1.6], // "it" -> "because"
        [9, 8, 1.9], // "was" -> "it"
        [10, 9, 1.8], // "tired" -> "was"
        [1, 0, 1.5],
        [6, 5, 1.5]
      ],
      positional: []
    },
    insightFor: (q, k, head, causal) => {
      if (q === 8 && k === 1) {
        return 'Coreference solved: Token "it" attends strongly back to "animal" (not "street") because biological fatigue ("tired") aligns with living entities.'
      }
      if (q === 10 && (k === 1 || k === 8)) {
        return 'Predicate binding: "tired" links back to "animal" and "it", carrying who experienced fatigue across 9 token positions in a single hop.'
      }
      if (q === 4 && k === 3) {
        return 'Negation capture: The verb "cross" attends to "not", inverting the action polarity inside the contextual hidden vector.'
      }
      return `${causal ? 'Causal Decoder (GPT/Claude)' : 'Bidirectional Encoder (BERT)'} · ${head} head focuses strongest weight from "${SENTENCE_PRESETS[0].tokens[q]}" onto "${SENTENCE_PRESETS[0].tokens[k]}".`
    }
  },
  {
    id: 'negation',
    label: 'API Latency Negation ("fast" → "not")',
    tokens: ['The', 'API', 'latency', 'was', 'not', 'fast', 'after', 'the', 'patch'],
    vectors: [
      [0.2, 0.1, 0.1, 0.3],
      [0.9, 0.3, 0.2, 0.9],
      [0.88, 0.4, 0.3, 0.85],
      [0.2, 0.8, 0.3, 0.2],
      [0.2, 0.65, 0.98, 0.15],
      [0.72, 0.55, 0.92, 0.4],
      [0.3, 0.4, 0.65, 0.25],
      [0.2, 0.1, 0.1, 0.3],
      [0.82, 0.5, 0.35, 0.88]
    ],
    headBoosts: {
      semantic: [
        [5, 2, 2.0], // "fast" -> "latency"
        [5, 4, 2.2], // "fast" -> "not"
        [8, 1, 1.9], // "patch" -> "API"
        [8, 2, 1.6], // "patch" -> "latency"
        [2, 1, 1.8] // "latency" -> "API"
      ],
      syntax: [
        [5, 4, 2.5], // "fast" -> "not"
        [4, 3, 1.7], // "not" -> "was"
        [6, 5, 1.5], // "after" -> "fast"
        [8, 6, 1.6] // "patch" -> "after"
      ],
      positional: []
    },
    insightFor: (q, k, head, causal) => {
      if (q === 5 && k === 4) {
        return 'Negation flip: "fast" places peak attention on "not", shifting its contextual embedding from positive speed to a latency regression.'
      }
      if (q === 8 && (k === 1 || k === 2)) {
        return 'Root-cause link: "patch" attends back to "API" and "latency", connecting the deployment event to the measured slowdown.'
      }
      return `${causal ? 'Causal Decoder' : 'Bidirectional Encoder'} (${head} head): "${SENTENCE_PRESETS[1].tokens[q]}" draws its strongest contextual signal from "${SENTENCE_PRESETS[1].tokens[k]}".`
    }
  },
  {
    id: 'coding',
    label: 'Code Context ("tests" → "Python")',
    tokens: ['Claude', 'writes', 'clean', 'Python', 'code', 'and', 'verifies', 'unit', 'tests'],
    vectors: [
      [0.92, 0.3, 0.2, 0.95],
      [0.35, 0.95, 0.2, 0.2],
      [0.4, 0.3, 0.88, 0.3],
      [0.9, 0.35, 0.4, 0.92],
      [0.88, 0.45, 0.5, 0.88],
      [0.2, 0.4, 0.2, 0.15],
      [0.35, 0.94, 0.3, 0.2],
      [0.7, 0.4, 0.7, 0.78],
      [0.86, 0.5, 0.55, 0.85]
    ],
    headBoosts: {
      semantic: [
        [8, 4, 2.1], // "tests" -> "code"
        [8, 3, 1.9], // "tests" -> "Python"
        [6, 0, 2.0], // "verifies" -> "Claude"
        [4, 3, 2.1], // "code" -> "Python"
        [4, 2, 1.6] // "code" -> "clean"
      ],
      syntax: [
        [1, 0, 2.0], // "writes" -> "Claude"
        [6, 0, 2.2], // "verifies" -> "Claude"
        [8, 7, 1.9], // "tests" -> "unit"
        [8, 6, 1.8] // "tests" -> "verifies"
      ],
      positional: []
    },
    insightFor: (q, k, head, causal) => {
      if (q === 6 && k === 0) {
        return 'Long-range subject link: "verifies" reaches across 6 tokens to bind back to subject "Claude" in O(1) path length.'
      }
      if (q === 8 && (k === 3 || k === 4)) {
        return 'Domain alignment: "tests" attends to "Python" and "code" so downstream generation picks pytest conventions instead of JavaScript.'
      }
      return `${causal ? 'Causal Decoder' : 'Bidirectional Encoder'} (${head} head): "${SENTENCE_PRESETS[2].tokens[q]}" aggregates highest context weight from "${SENTENCE_PRESETS[2].tokens[k]}".`
    }
  }
]

function weightLevelClass(w: number, masked: boolean): string {
  if (masked) return 'attn-cell-masked'
  if (w >= 0.42) return 'attn-lvl-5'
  if (w >= 0.28) return 'attn-lvl-4'
  if (w >= 0.16) return 'attn-lvl-3'
  if (w >= 0.08) return 'attn-lvl-2'
  if (w >= 0.03) return 'attn-lvl-1'
  return 'attn-lvl-0'
}

export default function SelfAttentionVisualizer() {
  const [presetId, setPresetId] = useState<string>(SENTENCE_PRESETS[0].id)
  const [selectedQueryIdx, setSelectedQueryIdx] = useState<number>(8) // "it"
  const [headMode, setHeadMode] = useState<HeadMode>('semantic')
  const [causalMask, setCausalMask] = useState<boolean>(true)
  const [temperature, setTemperature] = useState<number>(1.0)

  const preset = useMemo(
    () => SENTENCE_PRESETS.find(p => p.id === presetId) ?? SENTENCE_PRESETS[0],
    [presetId]
  )

  const safeQueryIdx = Math.min(selectedQueryIdx, preset.tokens.length - 1)

  const { matrix, rawDotRow, activeWeights, topKeyIdx } = useMemo(() => {
    const n = preset.tokens.length
    const scale = Math.sqrt(4) * temperature
    const boostMap = new Map<string, number>()
    for (const [f, t, val] of preset.headBoosts[headMode]) {
      boostMap.set(`${f}:${t}`, val)
    }

    const rawMatrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (causalMask && j > i) return Number.NEGATIVE_INFINITY
        const vq = preset.vectors[i]
        const vk = preset.vectors[j]
        const baseDot = vq.reduce((sum, x, d) => sum + x * vk[d], 0)
        const dist = Math.abs(i - j)
        const positionalBias =
          headMode === 'positional'
            ? Math.max(0, 2.4 - dist * 0.85)
            : dist === 0
              ? 0.35
              : Math.max(0, 0.35 - dist * 0.04)
        const boost = boostMap.get(`${i}:${j}`) ?? 0
        return (baseDot + positionalBias + boost) / scale
      })
    )

    const probMatrix = rawMatrix.map(row => {
      const finiteVals = row.filter(Number.isFinite)
      const maxVal = finiteVals.length ? Math.max(...finiteVals) : 0
      const exps = row.map(v => (Number.isFinite(v) ? Math.exp(v - maxVal) : 0))
      const sum = exps.reduce((a, b) => a + b, 0) || 1
      return exps.map(e => e / sum)
    })

    const weights = probMatrix[safeQueryIdx] ?? []
    let bestIdx = 0
    for (let j = 1; j < weights.length; j++) {
      if (weights[j] > weights[bestIdx]) bestIdx = j
    }

    return {
      matrix: probMatrix,
      rawDotRow: rawMatrix[safeQueryIdx] ?? [],
      activeWeights: weights,
      topKeyIdx: bestIdx
    }
  }, [preset, headMode, causalMask, temperature, safeQueryIdx])

  const rankedKeys = useMemo(() => {
    return preset.tokens
      .map((tok, idx) => ({
        idx,
        tok,
        weight: activeWeights[idx] ?? 0,
        rawScore: rawDotRow[idx] ?? 0,
        masked: causalMask && idx > safeQueryIdx
      }))
      .sort((a, b) => b.weight - a.weight)
  }, [preset.tokens, activeWeights, rawDotRow, causalMask, safeQueryIdx])

  const svgWidth = 760
  const tokenSpacing = svgWidth / (preset.tokens.length + 1)

  return (
    <section className="attn-viz-shell" aria-label="Interactive Self-Attention Weight Matrix Visualizer">
      <div className="attn-viz-head">
        <div>
          <div className="bc-meta-line">
            <span>Interactive Self-Attention Lab</span>
            <span aria-hidden="true">·</span>
            <span>Softmax(Q · Kᵀ / √d_k)</span>
            <span aria-hidden="true">·</span>
            <span>Click Any Token to Inspect Live Weights</span>
          </div>
          <h4>
            <Eye size={17} /> Interactive Self-Attention Mechanism &amp; Live Weight Matrix
          </h4>
          <p>
            Click any input token below as the active <strong>Query (Q)</strong>, switch attention
            heads, or toggle <strong>Causal Masking</strong> to watch how attention weights shift
            across the entire matrix in real time.
          </p>
        </div>

        <div className="attn-preset-tabs" role="tablist" aria-label="Sample sentences">
          {SENTENCE_PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={preset.id === p.id}
              className={`attn-preset-btn ${preset.id === p.id ? 'active' : ''}`}
              onClick={() => {
                setPresetId(p.id)
                setSelectedQueryIdx(p.id === 'pronoun' ? 8 : p.id === 'negation' ? 5 : 8)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Bar: Attention Head + Causal Mask + Scaling Temperature */}
      <div className="attn-controls-bar">
        <div className="attn-ctrl-group">
          <span className="dsde-kicker">ATTENTION HEAD SPECIALIZATION</span>
          <div className="bc-segmented" role="tablist" aria-label="Attention head mode">
            {(
              [
                { id: 'semantic', label: 'Head 1 · Semantic' },
                { id: 'syntax', label: 'Head 2 · Syntax/Negation' },
                { id: 'positional', label: 'Head 3 · Local Window' }
              ] as { id: HeadMode; label: string }[]
            ).map(h => (
              <button
                key={h.id}
                type="button"
                role="tab"
                aria-selected={headMode === h.id}
                className={headMode === h.id ? 'active' : ''}
                onClick={() => setHeadMode(h.id)}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="attn-ctrl-group">
          <span className="dsde-kicker">MASKING ARCHITECTURE</span>
          <button
            type="button"
            role="switch"
            aria-checked={causalMask}
            className={`dsde-switch ${causalMask ? 'on' : ''}`}
            onClick={() => setCausalMask(v => !v)}
          >
            {causalMask ? 'Causal Mask ON (GPT / Claude)' : 'Bidirectional (BERT Encoder)'}
          </button>
        </div>

        <label className="attn-temp-slider">
          <div className="dsde-slider-top">
            <span>Softmax Scale (√d_k × τ)</span>
            <strong className="bc-tabular">{temperature.toFixed(2)}×</strong>
          </div>
          <input
            type="range"
            min={0.4}
            max={2.2}
            step={0.1}
            value={temperature}
            onChange={e => setTemperature(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Interactive Query Token Selector Strip + Live SVG Attention Arcs */}
      <div className="attn-arc-card">
        <div className="attn-arc-top">
          <span className="dsde-kicker">
            SELECT QUERY TOKEN (Q) — CURRENTLY INSPECTING: “{preset.tokens[safeQueryIdx]}” (POS #{safeQueryIdx})
          </span>
          <span className="bc-tabular attn-arc-peak">
            Peak Focus → “{preset.tokens[topKeyIdx]}” ({Math.round((activeWeights[topKeyIdx] ?? 0) * 100)}%)
          </span>
        </div>

        <div className="attn-token-picker" role="listbox" aria-label="Select input query token">
          {preset.tokens.map((tok, idx) => {
            const w = activeWeights[idx] ?? 0
            const isQuery = idx === safeQueryIdx
            const isMasked = causalMask && idx > safeQueryIdx
            return (
              <button
                key={`${tok}-${idx}`}
                type="button"
                role="option"
                aria-selected={isQuery}
                className={`attn-token-btn ${isQuery ? 'is-query' : ''} ${
                  isMasked ? 'is-masked' : w >= 0.22 ? 'is-strong-key' : ''
                }`}
                onClick={() => setSelectedQueryIdx(idx)}
              >
                <span className="attn-tok-pos bc-tabular">#{idx}</span>
                <strong>{tok}</strong>
                <small className="bc-tabular">
                  {isMasked ? 'Masked' : `${Math.round(w * 100)}%`}
                </small>
              </button>
            )
          })}
        </div>

        {/* Live SVG Attention Arcs from Selected Query Token to All Key Tokens */}
        <div className="attn-svg-wrap">
          <svg
            className="attn-arc-svg"
            viewBox={`0 0 ${svgWidth} 145`}
            role="img"
            aria-label={`Attention arcs from query token ${preset.tokens[safeQueryIdx]}`}
          >
            {preset.tokens.map((tok, j) => {
              const xFrom = tokenSpacing * (safeQueryIdx + 1)
              const xTo = tokenSpacing * (j + 1)
              const w = activeWeights[j] ?? 0
              const isMasked = causalMask && j > safeQueryIdx
              const dist = Math.abs(safeQueryIdx - j)
              const midX = (xFrom + xTo) / 2
              const arcY = Math.max(14, 108 - dist * 13)
              return (
                <g key={`arc-${tok}-${j}`}>
                  {!isMasked && w >= 0.03 && (
                    <path
                      d={
                        j === safeQueryIdx
                          ? `M ${xFrom - 6} 112 C ${xFrom - 24} 58, ${xFrom + 24} 58, ${xFrom + 6} 112`
                          : `M ${xFrom} 112 Q ${midX} ${arcY}, ${xTo} 112`
                      }
                      fill="none"
                      stroke={j === topKeyIdx ? '#6ee2ba' : '#8598ff'}
                      strokeOpacity={Math.min(1, 0.22 + w * 1.4)}
                      strokeWidth={Math.max(1.2, w * 9)}
                    />
                  )}
                  <circle
                    cx={xTo}
                    cy={115}
                    r={j === safeQueryIdx ? 6 : 4}
                    fill={
                      j === safeQueryIdx
                        ? '#ffffff'
                        : isMasked
                          ? '#2b3650'
                          : j === topKeyIdx
                            ? '#6ee2ba'
                            : '#7d8fff'
                    }
                  />
                  <text
                    x={xTo}
                    y={135}
                    textAnchor="middle"
                    fill={j === safeQueryIdx ? '#ffffff' : isMasked ? '#556585' : '#b7c6e4'}
                    fontSize="11"
                    fontFamily="DM Mono, monospace"
                  >
                    {tok}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="attn-insight-banner">
          <Sparkles size={15} />
          <p>{preset.insightFor(safeQueryIdx, topKeyIdx, headMode, causalMask)}</p>
        </div>
      </div>

      {/* Bottom Split: Full N x N Interactive Attention Heatmap Matrix + Selected Query Bar Breakdown */}
      <div className="attn-matrix-split">
        <div className="attn-matrix-card">
          <div className="attn-matrix-head">
            <span className="dsde-kicker">
              <Layers size={13} /> FULL {preset.tokens.length}×{preset.tokens.length} ATTENTION WEIGHT MATRIX (ROWS = QUERY Q, COLS = KEY K)
            </span>
            <small>Click any row or cell to shift Query Q</small>
          </div>
          <div className="attn-table-scroll">
            <table className="attn-matrix-table">
              <thead>
                <tr>
                  <th scope="col">Q \ K</th>
                  {preset.tokens.map((tok, j) => (
                    <th
                      key={`col-${tok}-${j}`}
                      scope="col"
                      className={j === topKeyIdx ? 'is-peak-col' : ''}
                    >
                      {tok}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preset.tokens.map((rowTok, i) => (
                  <tr key={`row-${rowTok}-${i}`} className={i === safeQueryIdx ? 'is-active-row' : ''}>
                    <th scope="row">
                      <button
                        type="button"
                        className="attn-row-btn"
                        onClick={() => setSelectedQueryIdx(i)}
                      >
                        {rowTok}
                      </button>
                    </th>
                    {preset.tokens.map((_, j) => {
                      const w = matrix[i][j] ?? 0
                      const masked = causalMask && j > i
                      return (
                        <td key={`cell-${i}-${j}`}>
                          <button
                            type="button"
                            className={`attn-cell bc-tabular ${weightLevelClass(w, masked)} ${
                              i === safeQueryIdx && j === topKeyIdx ? 'is-peak-cell' : ''
                            }`}
                            onClick={() => setSelectedQueryIdx(i)}
                            title={
                              masked
                                ? `${rowTok} cannot attend to future token ${preset.tokens[j]} (Causal Mask -∞)`
                                : `Attention(${rowTok} → ${preset.tokens[j]}) = ${(w * 100).toFixed(1)}%`
                            }
                          >
                            {masked ? '—' : w.toFixed(2)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="attn-breakdown-card">
          <span className="dsde-kicker">
            TOP ATTENDED KEYS FOR QUERY “{preset.tokens[safeQueryIdx]}”
          </span>
          <div className="attn-key-list">
            {rankedKeys.slice(0, 6).map(item => (
              <div key={`brk-${item.idx}`} className="attn-key-row">
                <div className="attn-key-top">
                  <strong>
                    #{item.idx} {item.tok}
                  </strong>
                  <span className="bc-tabular">
                    {item.masked
                      ? 'Masked (-∞)'
                      : `${(item.weight * 100).toFixed(1)}% (z=${item.rawScore.toFixed(2)})`}
                  </span>
                </div>
                <progress
                  className={`ml26-bar-meter ${
                    item.idx === topKeyIdx ? 'tone-positive' : 'tone-primary'
                  }`}
                  value={Math.round(item.weight * 100)}
                  max={100}
                />
              </div>
            ))}
          </div>
          <p className="attn-formula-note">
            Formula: <code>Attention(Q, K, V) = softmax((Q·Kᵀ) / √d_k + Mask) · V</code>. Every
            unmasked row sums to exactly <strong>100.0%</strong>.
          </p>
        </div>
      </div>
    </section>
  )
}
