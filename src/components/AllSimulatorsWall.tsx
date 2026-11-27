import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  RotateCcw,
  Search,
  Sliders,
  X,
  XCircle
} from 'lucide-react'
import {
  beginnerTopics,
  evaluateTopicSimulation,
  getDefaultSimulatorValues,
  type BeginnerCurriculumTopic
} from '../data/beginnerCurriculum'

type SimCategory = 'all' | 'foundations' | 'ml-dl' | 'llm-vllm-claude' | 'rag-agents' | 'mlops-prod'

type Props = {
  onOpenFrontier?: () => void
  onOpenProduction?: () => void
  onOpenCurriculumStage?: (stageId: string) => void
}

function TopicSimulatorTile({ topic }: { topic: BeginnerCurriculumTopic }) {
  const [values, setValues] = useState<Record<string, number | boolean>>(() =>
    getDefaultSimulatorValues(topic)
  )
  const result = useMemo(() => evaluateTopicSimulation(topic.id, values), [topic.id, values])

  return (
    <article className="vlab-sim-tile">
      <div className="vlab-sim-tile-head">
        <div>
          <div className="bc-meta-line">
            <span>Stage {String(topic.stageNumber).padStart(2, '0')}</span>
            <span aria-hidden="true">·</span>
            <span>{topic.stageTitle}</span>
          </div>
          <h4>{topic.title}</h4>
        </div>
        <button
          type="button"
          className="bc-btn-ghost"
          onClick={() => setValues(getDefaultSimulatorValues(topic))}
          aria-label={`Reset ${topic.title} simulator`}
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      <p className="vlab-sim-summary">{topic.simulatorConfig.summary}</p>

      <div className="vlab-sim-controls">
        {topic.simulatorConfig.controls.map(ctrl => {
          const val = values[ctrl.id] ?? ctrl.defaultValue
          if (ctrl.type === 'toggle') {
            const on = Boolean(val)
            return (
              <div key={ctrl.id} className="vlab-sim-ctrl-row">
                <label htmlFor={`wall-${topic.id}-${ctrl.id}`}>{ctrl.label}</label>
                <button
                  id={`wall-${topic.id}-${ctrl.id}`}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={`bc-toggle ${on ? 'on' : 'off'}`}
                  onClick={() => setValues(prev => ({ ...prev, [ctrl.id]: !on }))}
                >
                  <span className="bc-toggle-thumb" />
                  <span>{on ? 'On' : 'Off'}</span>
                </button>
              </div>
            )
          }
          const num = typeof val === 'number' ? val : Number(ctrl.defaultValue)
          return (
            <div key={ctrl.id} className="vlab-sim-slider-row">
              <div className="vlab-sim-ctrl-row">
                <label htmlFor={`wall-${topic.id}-${ctrl.id}`}>{ctrl.label}</label>
                <strong className="bc-tabular">
                  {ctrl.step && ctrl.step < 1 ? num.toFixed(2) : num} {ctrl.unit ?? ''}
                </strong>
              </div>
              <input
                id={`wall-${topic.id}-${ctrl.id}`}
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={num}
                onChange={e => setValues(prev => ({ ...prev, [ctrl.id]: Number(e.target.value) }))}
              />
            </div>
          )
        })}
      </div>

      <div className="vlab-sim-kpis">
        <div>
          <span>Accuracy</span>
          <strong className="bc-tabular">{result.accuracyScore.toFixed(1)}%</strong>
        </div>
        <div>
          <span>Latency</span>
          <strong className="bc-tabular">{result.latencyMs.toLocaleString()} ms</strong>
        </div>
        <div>
          <span>Est. Cost</span>
          <strong className="bc-tabular">${result.tokenCostUsd.toFixed(4)}</strong>
        </div>
        <div className={`vlab-sim-health bc-health-${result.healthStatus}`}>
          <span>State</span>
          <strong>
            {result.healthStatus === 'optimal' ? (
              <CheckCircle2 size={13} />
            ) : result.healthStatus === 'tradeoff' ? (
              <AlertTriangle size={13} />
            ) : (
              <XCircle size={13} />
            )}
            <span>{result.healthLabel}</span>
          </strong>
        </div>
      </div>

      <p className="vlab-sim-output">{result.simulatedOutput}</p>
    </article>
  )
}

export default function AllSimulatorsWall({
  onOpenFrontier,
  onOpenProduction,
  onOpenCurriculumStage
}: Props) {
  const [category, setCategory] = useState<SimCategory>('all')
  const [search, setSearch] = useState('')

  // Live Inline Frontier Simulators (Always Visible & Playable on the Wall)
  const [vllmOn, setVllmOn] = useState(true)
  const [vllmUsers, setVllmUsers] = useState(32)
  const [gqaOn, setGqaOn] = useState(true)
  const [gqaSeq, setGqaSeq] = useState(8192)
  const [claudeCache, setClaudeCache] = useState(true)
  const [claudeRoute, setClaudeRoute] = useState(true)
  const [claudeVol, setClaudeVol] = useState(500)
  const [rlhfAlign, setRlhfAlign] = useState(true)
  const [thinkTok, setThinkTok] = useState(2048)

  const vllmMetrics = useMemo(() => {
    const waste = vllmOn ? 3.5 : 68.0
    const tput = Math.round(Math.min(vllmUsers, vllmOn ? 48 : 14) * (vllmOn ? 44 : 11))
    const ttft = Math.round((vllmOn ? 110 : 680) + Math.max(0, vllmUsers - (vllmOn ? 48 : 14)) * (vllmOn ? 35 : 320))
    return { waste, tput, ttft }
  }, [vllmOn, vllmUsers])

  const gqaMetrics = useMemo(() => {
    const kvMb = Number(((2 * 32 * 4096 * (gqaOn ? 0.25 : 1) * 2 * gqaSeq) / (1024 * 1024)).toFixed(0))
    const decodeMs = Math.round(14 + (gqaSeq / 1024) * (gqaOn ? 1.8 : 6.1))
    return { kvMb, decodeMs }
  }, [gqaOn, gqaSeq])

  const claudeMetrics = useMemo(() => {
    const base = claudeVol * 18
    const spend = Math.round(base * (claudeCache ? 0.48 : 1) * (claudeRoute ? 0.56 : 1))
    const save = Math.round((1 - spend / base) * 100)
    return { spend, save }
  }, [claudeCache, claudeRoute, claudeVol])

  const alignMetrics = useMemo(() => {
    const acc = Math.min(98, 76 + (rlhfAlign ? 8 : -6) + Math.round(thinkTok / 700))
    const safety = rlhfAlign ? 97 : 54
    return { acc, safety }
  }, [rlhfAlign, thinkTok])

  const categoryMatchesTopic = (t: BeginnerCurriculumTopic): boolean => {
    if (category === 'all') return true
    if (category === 'foundations') return t.stageNumber === 1 || t.stageNumber === 2
    if (category === 'ml-dl') return t.stageNumber === 3
    if (category === 'llm-vllm-claude') return t.id === 'genai-attention-decoding' || t.id === 'llmops-kv-batching'
    if (category === 'rag-agents') return t.id === 'genai-rag-hybrid' || t.stageNumber === 5
    if (category === 'mlops-prod') return t.stageNumber === 6
    return true
  }

  const visibleTopics = useMemo(() => {
    const q = search.trim().toLowerCase()
    return beginnerTopics.filter(t => {
      if (!categoryMatchesTopic(t)) return false
      if (!q) return true
      return `${t.title} ${t.stageTitle} ${t.simulatorConfig.summary}`.toLowerCase().includes(q)
    })
  }, [category, search])

  const showFrontierTiles =
    (category === 'all' || category === 'llm-vllm-claude') &&
    (!search.trim() || 'vllm transformer gqa claude chatgpt rlhf prompt cache'.includes(search.trim().toLowerCase()) || search.trim().toLowerCase().includes('llm'))

  return (
    <div className="vlab-wall">
      <div className="vlab-wall-toolbar">
        <div className="vlab-wall-filters" role="tablist" aria-label="Filter simulators by domain">
          {(
            [
              { id: 'all', label: 'All Simulators (16 Live + 4 Failure Labs)' },
              { id: 'foundations', label: 'Python & Math' },
              { id: 'ml-dl', label: 'ML & Deep Learning' },
              { id: 'llm-vllm-claude', label: 'Transformers, vLLM & Claude' },
              { id: 'rag-agents', label: 'RAG & Durable Agents' },
              { id: 'mlops-prod', label: 'LLMOps & Inference' }
            ] as { id: SimCategory; label: string }[]
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              className={category === tab.id ? 'active' : ''}
              onClick={() => setCategory(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="vlab-wall-search">
          <Search size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter simulators (vLLM, RAG, GQA, gradient...)"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear simulator filter">
              <X size={13} />
            </button>
          )}
        </label>
      </div>

      {/* Frontier LLM, vLLM & Claude Live Simulators */}
      {showFrontierTiles && (
        <section className="vlab-wall-group">
          <div className="vlab-wall-group-head">
            <div>
              <h3>
                <Cpu size={17} /> Frontier Architecture Simulators (Transformer, ChatGPT/Claude, vLLM &amp; FinOps)
              </h3>
              <p>Interact directly with all four frontier architecture engines right here, or jump to their full DFDs.</p>
            </div>
            {onOpenFrontier && (
              <button type="button" className="bc-btn-secondary" onClick={onOpenFrontier}>
                <span>Open Full Frontier DFDs</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className="vlab-sim-grid">
            {/* Tile 1: vLLM PagedAttention */}
            <article className="vlab-sim-tile">
              <div className="vlab-sim-tile-head">
                <div>
                  <div className="bc-meta-line"><span>Google 2017 → LLM → vLLM</span></div>
                  <h4>vLLM PagedAttention &amp; Batching Simulator</h4>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vllmOn}
                  className={`bc-toggle ${vllmOn ? 'on' : 'off'}`}
                  onClick={() => setVllmOn(v => !v)}
                >
                  <span className="bc-toggle-thumb" />
                  <span>{vllmOn ? 'vLLM ON' : 'Naive Static'}</span>
                </button>
              </div>
              <div className="vlab-sim-controls">
                <div className="vlab-sim-slider-row">
                  <div className="vlab-sim-ctrl-row">
                    <label htmlFor="wall-vllm-users">Concurrent Users</label>
                    <strong className="bc-tabular">{vllmUsers} users</strong>
                  </div>
                  <input id="wall-vllm-users" type="range" min={4} max={80} step={4} value={vllmUsers} onChange={e => setVllmUsers(Number(e.target.value))} />
                </div>
              </div>
              <div className="vlab-sim-kpis">
                <div><span>KV Waste</span><strong className="bc-tabular">{vllmMetrics.waste}%</strong></div>
                <div><span>Throughput</span><strong className="bc-tabular">{vllmMetrics.tput} tok/s</strong></div>
                <div><span>TTFT</span><strong className="bc-tabular">{vllmMetrics.ttft} ms</strong></div>
                <div className={`vlab-sim-health ${vllmOn ? 'bc-health-optimal' : 'bc-health-breaking'}`}>
                  <span>Engine</span>
                  <strong>{vllmOn ? <CheckCircle2 size={13} /> : <XCircle size={13} />}<span>{vllmOn ? 'Paged' : 'Fragmented'}</span></strong>
                </div>
              </div>
            </article>

            {/* Tile 2: Transformer GQA KV-Cache */}
            <article className="vlab-sim-tile">
              <div className="vlab-sim-tile-head">
                <div>
                  <div className="bc-meta-line"><span>Deep Learning &amp; Transformers</span></div>
                  <h4>Transformer GQA vs. Classic MHA KV-Cache</h4>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={gqaOn}
                  className={`bc-toggle ${gqaOn ? 'on' : 'off'}`}
                  onClick={() => setGqaOn(v => !v)}
                >
                  <span className="bc-toggle-thumb" />
                  <span>{gqaOn ? 'GQA (4×)' : 'Classic MHA'}</span>
                </button>
              </div>
              <div className="vlab-sim-controls">
                <div className="vlab-sim-slider-row">
                  <div className="vlab-sim-ctrl-row">
                    <label htmlFor="wall-gqa-seq">Context Window</label>
                    <strong className="bc-tabular">{gqaSeq.toLocaleString()} tok</strong>
                  </div>
                  <input id="wall-gqa-seq" type="range" min={1024} max={32768} step={1024} value={gqaSeq} onChange={e => setGqaSeq(Number(e.target.value))} />
                </div>
              </div>
              <div className="vlab-sim-kpis">
                <div><span>KV / Req</span><strong className="bc-tabular">{gqaMetrics.kvMb} MB</strong></div>
                <div><span>Decode</span><strong className="bc-tabular">{gqaMetrics.decodeMs} ms/tok</strong></div>
                <div><span>Ratio</span><strong className="bc-tabular">{gqaOn ? '1:4 KV:Q' : '1:1 MHA'}</strong></div>
                <div className={`vlab-sim-health ${gqaOn ? 'bc-health-optimal' : 'bc-health-tradeoff'}`}>
                  <span>VRAM</span>
                  <strong>{gqaOn ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}<span>{gqaOn ? 'Compact' : '4× Heavier'}</span></strong>
                </div>
              </div>
            </article>

            {/* Tile 3: ChatGPT & Claude Alignment */}
            <article className="vlab-sim-tile">
              <div className="vlab-sim-tile-head">
                <div>
                  <div className="bc-meta-line"><span>ChatGPT &amp; Claude Internals</span></div>
                  <h4>RLHF / Constitutional AI + Extended Thinking</h4>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rlhfAlign}
                  className={`bc-toggle ${rlhfAlign ? 'on' : 'off'}`}
                  onClick={() => setRlhfAlign(v => !v)}
                >
                  <span className="bc-toggle-thumb" />
                  <span>{rlhfAlign ? 'Aligned' : 'Unaligned'}</span>
                </button>
              </div>
              <div className="vlab-sim-controls">
                <div className="vlab-sim-slider-row">
                  <div className="vlab-sim-ctrl-row">
                    <label htmlFor="wall-think-tok">Thinking Token Budget</label>
                    <strong className="bc-tabular">{thinkTok} tok</strong>
                  </div>
                  <input id="wall-think-tok" type="range" min={0} max={8192} step={512} value={thinkTok} onChange={e => setThinkTok(Number(e.target.value))} />
                </div>
              </div>
              <div className="vlab-sim-kpis">
                <div><span>Reasoning</span><strong className="bc-tabular">{alignMetrics.acc}%</strong></div>
                <div><span>Safety</span><strong className="bc-tabular">{alignMetrics.safety}%</strong></div>
                <div><span>Budget</span><strong className="bc-tabular">{thinkTok} tok</strong></div>
                <div className={`vlab-sim-health ${rlhfAlign ? 'bc-health-optimal' : 'bc-health-breaking'}`}>
                  <span>Policy</span>
                  <strong>{rlhfAlign ? <CheckCircle2 size={13} /> : <XCircle size={13} />}<span>{rlhfAlign ? 'Calibrated' : 'Unsafe'}</span></strong>
                </div>
              </div>
            </article>

            {/* Tile 4: Master Claude Architect FinOps */}
            <article className="vlab-sim-tile">
              <div className="vlab-sim-tile-head">
                <div>
                  <div className="bc-meta-line"><span>Master Claude Architect</span></div>
                  <h4>XML Prompt Caching + Tiered Router FinOps</h4>
                </div>
              </div>
              <div className="vlab-sim-controls">
                <div className="vlab-sim-ctrl-row">
                  <label>XML Prompt Caching</label>
                  <button type="button" role="switch" aria-checked={claudeCache} className={`bc-toggle ${claudeCache ? 'on' : 'off'}`} onClick={() => setClaudeCache(v => !v)}>
                    <span className="bc-toggle-thumb" /><span>{claudeCache ? 'On' : 'Off'}</span>
                  </button>
                </div>
                <div className="vlab-sim-ctrl-row">
                  <label>Haiku/Sonnet/Opus Routing</label>
                  <button type="button" role="switch" aria-checked={claudeRoute} className={`bc-toggle ${claudeRoute ? 'on' : 'off'}`} onClick={() => setClaudeRoute(v => !v)}>
                    <span className="bc-toggle-thumb" /><span>{claudeRoute ? 'On' : 'Off'}</span>
                  </button>
                </div>
                <div className="vlab-sim-slider-row">
                  <div className="vlab-sim-ctrl-row">
                    <label htmlFor="wall-claude-vol">Monthly Requests</label>
                    <strong className="bc-tabular">{claudeVol}k reqs</strong>
                  </div>
                  <input id="wall-claude-vol" type="range" min={100} max={2000} step={100} value={claudeVol} onChange={e => setClaudeVol(Number(e.target.value))} />
                </div>
              </div>
              <div className="vlab-sim-kpis">
                <div><span>Monthly Spend</span><strong className="bc-tabular">${claudeMetrics.spend.toLocaleString()}</strong></div>
                <div><span>Savings</span><strong className="bc-tabular">−{claudeMetrics.save}%</strong></div>
                <div><span>Volume</span><strong className="bc-tabular">{claudeVol}k</strong></div>
                <div className={`vlab-sim-health ${claudeMetrics.save >= 60 ? 'bc-health-optimal' : 'bc-health-tradeoff'}`}>
                  <span>FinOps</span>
                  <strong>{claudeMetrics.save >= 60 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}<span>{claudeMetrics.save >= 60 ? 'Optimized' : 'High Cost'}</span></strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {/* All 12 Guided Curriculum Virtual Simulators */}
      <section className="vlab-wall-group">
        <div className="vlab-wall-group-head">
          <div>
            <h3>
              <Sliders size={17} /> Complete Curriculum Virtual Simulators ({visibleTopics.length} Live Engines)
            </h3>
            <p>Every core foundation-to-production topic simulator side-by-side—drag any slider to test real trade-off formulas immediately.</p>
          </div>
        </div>

        <div className="vlab-sim-grid">
          {visibleTopics.map(topic => (
            <TopicSimulatorTile key={topic.id} topic={topic} />
          ))}
        </div>

        {visibleTopics.length === 0 && (
          <div className="empty-state">
            <Search size={22} />
            <strong>No simulators match your filter</strong>
            <p>Clear your search or choose All Simulators to restore the full wall.</p>
          </div>
        )}
      </section>

      {/* Direct Launchers for Production Failure Simulators & Stage 1-12 Specialist Workbenches */}
      <section className="vlab-wall-launchers">
        <div className="vlab-launcher-card">
          <div>
            <strong>4 Production Failure Injection Simulators</strong>
            <p>Break and diagnose Production RAG, Multi-Agent LangGraph, LoRA/QLoRA Fine-Tuning, and AWS ECS Canary Deployments.</p>
          </div>
          {onOpenProduction && (
            <button type="button" className="bc-btn-primary" onClick={onOpenProduction}>
              <span>Open Production Failure Labs</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {onOpenCurriculumStage && (
          <div className="vlab-stage-workbench-bar">
            <span>Specialist Stage Numerical Workbenches:</span>
            {[
              { id: 'stage-1', label: 'Stage 1: Math & Vectors' },
              { id: 'stage-2', label: 'Stage 2: Classical ML' },
              { id: 'stage-3', label: 'Stage 3: Neural Backprop' },
              { id: 'stage-4', label: 'Stage 4: Transformers' },
              { id: 'stage-5', label: 'Stage 5: RAG & GraphRAG' },
              { id: 'stage-6', label: 'Stage 6: Agents' },
              { id: 'stage-7', label: 'Stage 7: MCP / A2A' },
              { id: 'stage-9', label: 'Stage 9: MLOps & Terraform' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                className="vlab-stage-jump-btn"
                onClick={() => onOpenCurriculumStage(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
