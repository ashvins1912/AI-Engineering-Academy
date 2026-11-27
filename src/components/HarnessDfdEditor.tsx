import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Link2,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  XCircle
} from 'lucide-react'

export type DfdNodeKind = 'orchestrator' | 'agent' | 'tool' | 'memory' | 'policy' | 'verifier'

export type ConnectionRule =
  | 'always'
  | 'policy_allow'
  | 'on_verify_pass'
  | 'on_verify_fail'
  | 'compact_context'
  | 'hitl_escalate'

export type DfdNode = {
  id: string
  kind: DfdNodeKind
  label: string
  x: number
  y: number
  toolAccess?: 'read_only' | 'mutating'
  maxTurns?: number
}

export type DfdEdge = {
  id: string
  from: string
  to: string
  rule: ConnectionRule
}

type ValidationFinding = {
  id: string
  passed: boolean
  severity: 'pass' | 'warning' | 'error'
  title: string
  detail: string
}

const NODE_W = 154
const NODE_H = 58
const CANVAS_W = 860
const CANVAS_H = 440

const NODE_META: Record<
  DfdNodeKind,
  { title: string; short: string; stroke: string; fill: string; badge: string; defaultLabel: string }
> = {
  orchestrator: {
    title: 'Orchestrator',
    short: 'ORCH',
    stroke: '#7b8cff',
    fill: '#162344',
    badge: '#9cb0ff',
    defaultLabel: 'Task Orchestrator'
  },
  agent: {
    title: 'Agent',
    short: 'AGENT',
    stroke: '#52d6aa',
    fill: '#0f2726',
    badge: '#7de9c5',
    defaultLabel: 'LLM Reasoning Agent'
  },
  memory: {
    title: 'Memory',
    short: 'MEM',
    stroke: '#c084fc',
    fill: '#23173a',
    badge: '#d8b4fe',
    defaultLabel: 'Context & Memory'
  },
  policy: {
    title: 'Policy Hook',
    short: 'HOOK',
    stroke: '#f0b84b',
    fill: '#2c2210',
    badge: '#f8d27d',
    defaultLabel: 'Pre-Tool Policy Hook'
  },
  tool: {
    title: 'Tool',
    short: 'TOOL',
    stroke: '#56b4ff',
    fill: '#10243b',
    badge: '#8fd0ff',
    defaultLabel: 'Sandboxed Tool'
  },
  verifier: {
    title: 'Verifier',
    short: 'VERIF',
    stroke: '#34d399',
    fill: '#0d2621',
    badge: '#6ee7b7',
    defaultLabel: 'Test & Lint Verifier'
  }
}

const RULE_META: Record<ConnectionRule, { label: string; short: string; stroke: string; dashed?: boolean }> = {
  always: { label: 'Always Forward (Data Flow)', short: 'always', stroke: '#7f93bd' },
  policy_allow: { label: 'If Policy & Budget Allow', short: 'policy_allow', stroke: '#f0b84b' },
  on_verify_pass: { label: 'On Verifier Exit 0 (Pass)', short: 'verify_pass', stroke: '#52d6aa' },
  on_verify_fail: { label: 'On Verifier Fail (Backpressure)', short: 'verify_fail', stroke: '#ff7b8e', dashed: true },
  compact_context: { label: 'Compact Context (>70% Window)', short: 'compact', stroke: '#c084fc', dashed: true },
  hitl_escalate: { label: 'Escalate to Human Approval', short: 'hitl_gate', stroke: '#f59e0b', dashed: true }
}

const HARDENED_PRESET: { nodes: DfdNode[]; edges: DfdEdge[] } = {
  nodes: [
    { id: 'n-orch', kind: 'orchestrator', label: 'Harness Orchestrator', x: 36, y: 185, maxTurns: 12 },
    { id: 'n-mem', kind: 'memory', label: 'Compacting Memory', x: 245, y: 42 },
    { id: 'n-agent', kind: 'agent', label: 'Coding Agent (LLM)', x: 245, y: 185 },
    { id: 'n-policy', kind: 'policy', label: 'Pre-Tool Policy Hook', x: 458, y: 112 },
    { id: 'n-tool', kind: 'tool', label: 'Patch & Shell Tool', x: 668, y: 112, toolAccess: 'mutating' },
    { id: 'n-verif', kind: 'verifier', label: 'Pytest / Lint Verifier', x: 560, y: 292 }
  ],
  edges: [
    { id: 'e1', from: 'n-orch', to: 'n-agent', rule: 'always' },
    { id: 'e2', from: 'n-agent', to: 'n-mem', rule: 'compact_context' },
    { id: 'e3', from: 'n-mem', to: 'n-orch', rule: 'always' },
    { id: 'e4', from: 'n-agent', to: 'n-policy', rule: 'always' },
    { id: 'e5', from: 'n-policy', to: 'n-tool', rule: 'policy_allow' },
    { id: 'e6', from: 'n-tool', to: 'n-verif', rule: 'always' },
    { id: 'e7', from: 'n-verif', to: 'n-agent', rule: 'on_verify_fail' },
    { id: 'e8', from: 'n-verif', to: 'n-orch', rule: 'on_verify_pass' }
  ]
}

const BROKEN_PRESET: { nodes: DfdNode[]; edges: DfdEdge[] } = {
  nodes: [
    { id: 'b-agent', kind: 'agent', label: 'Unchecked LLM Agent', x: 130, y: 185 },
    { id: 'b-tool', kind: 'tool', label: 'Production Shell Tool', x: 470, y: 185, toolAccess: 'mutating' }
  ],
  edges: [
    { id: 'be1', from: 'b-agent', to: 'b-tool', rule: 'always' },
    { id: 'be2', from: 'b-tool', to: 'b-agent', rule: 'always' }
  ]
}

const snap = (v: number) => Math.round(v / 12) * 12

function validateHarnessGraph(nodes: DfdNode[], edges: DfdEdge[]): ValidationFinding[] {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const findings: ValidationFinding[] = []

  const orchestrators = nodes.filter(n => n.kind === 'orchestrator')
  const agents = nodes.filter(n => n.kind === 'agent')
  const tools = nodes.filter(n => n.kind === 'tool')
  const memories = nodes.filter(n => n.kind === 'memory')
  const policies = nodes.filter(n => n.kind === 'policy')
  const verifiers = nodes.filter(n => n.kind === 'verifier')

  // 1. Orchestrator + Agent Core
  const orchConnectedToAgent = edges.some(
    e =>
      (byId.get(e.from)?.kind === 'orchestrator' && byId.get(e.to)?.kind === 'agent') ||
      (byId.get(e.from)?.kind === 'agent' && byId.get(e.to)?.kind === 'orchestrator')
  )
  findings.push({
    id: 'rule-orch-agent',
    passed: orchestrators.length > 0 && agents.length > 0 && orchConnectedToAgent,
    severity: orchestrators.length > 0 && agents.length > 0 && orchConnectedToAgent ? 'pass' : 'error',
    title: 'Orchestrator & Agent Control Loop',
    detail:
      orchestrators.length > 0 && agents.length > 0 && orchConnectedToAgent
        ? 'Orchestrator manages turn limits and routes work cleanly to the Agent.'
        : 'Add both an Orchestrator and an Agent node and connect them to bound execution turns.'
  })

  // 2. Policy Gate Protecting Tools
  const directUnprotectedToolEdges = edges.filter(e => {
    const src = byId.get(e.from)
    const dst = byId.get(e.to)
    if (!src || !dst) return false
    const isDirectAgentToTool = (src.kind === 'agent' || src.kind === 'orchestrator') && dst.kind === 'tool'
    return isDirectAgentToTool && e.rule !== 'policy_allow' && e.rule !== 'hitl_escalate'
  })
  const toolHasPolicyUpstream =
    tools.length === 0 ||
    tools.every(t =>
      edges.some(
        e =>
          e.to === t.id &&
          (byId.get(e.from)?.kind === 'policy' || e.rule === 'policy_allow' || e.rule === 'hitl_escalate')
      )
    )
  const policyOk = directUnprotectedToolEdges.length === 0 && toolHasPolicyUpstream && (tools.length === 0 || policies.length > 0 || toolHasPolicyUpstream)
  findings.push({
    id: 'rule-policy-gate',
    passed: policyOk,
    severity: policyOk ? 'pass' : 'error',
    title: 'Zero Unprotected Tool Access (Pre-Tool Policy)',
    detail: policyOk
      ? 'All tool invocations are guarded by a Policy Hook or policy_allow / hitl_escalate rule.'
      : 'An Agent connects directly to a Tool without a Policy Hook or policy_allow / hitl_escalate guard!'
  })

  // 3. Deterministic Verifier Backpressure
  const hasBackpressure =
    verifiers.length > 0 &&
    edges.some(
      e =>
        byId.get(e.from)?.kind === 'verifier' &&
        (byId.get(e.to)?.kind === 'agent' || byId.get(e.to)?.kind === 'orchestrator') &&
        e.rule === 'on_verify_fail'
    )
  findings.push({
    id: 'rule-verifier',
    passed: hasBackpressure,
    severity: hasBackpressure ? 'pass' : 'error',
    title: 'Deterministic Verifier Backpressure Loop',
    detail: hasBackpressure
      ? 'Verifier checks tool outputs and feeds objective error traces back on verify_fail.'
      : 'Connect a Verifier node back to the Agent/Orchestrator using the "on_verify_fail" rule so the LLM never self-certifies.'
  })

  // 4. Memory & Context Compaction
  const hasMemoryFlow =
    memories.length > 0 &&
    edges.some(e => byId.get(e.from)?.kind === 'memory' || byId.get(e.to)?.kind === 'memory')
  const hasCompactionRule = edges.some(e => e.rule === 'compact_context')
  findings.push({
    id: 'rule-memory',
    passed: hasMemoryFlow && hasCompactionRule,
    severity: hasMemoryFlow && hasCompactionRule ? 'pass' : hasMemoryFlow ? 'warning' : 'error',
    title: 'Memory & Context Compaction Strategy',
    detail:
      hasMemoryFlow && hasCompactionRule
        ? 'Memory node connected with an explicit compact_context rule to prevent long-horizon context rot.'
        : hasMemoryFlow
        ? 'Memory node exists, but add a "compact_context" edge rule so stale turns auto-summarize above 70% window.'
        : 'Drop a Memory node and wire it with "compact_context" to preserve plan state across turns.'
  })

  // 5. No Orphan Nodes
  const connectedIds = new Set(edges.flatMap(e => [e.from, e.to]))
  const orphans = nodes.filter(n => !connectedIds.has(n.id))
  findings.push({
    id: 'rule-orphans',
    passed: nodes.length > 0 && orphans.length === 0,
    severity: nodes.length > 0 && orphans.length === 0 ? 'pass' : 'warning',
    title: 'Graph Connectivity (Zero Orphan Nodes)',
    detail:
      orphans.length === 0
        ? `All ${nodes.length} nodes are wired into the active data-flow topology.`
        : `Disconnected nodes detected: ${orphans.map(o => o.label).join(', ')}.`
  })

  return findings
}

export default function HarnessDfdEditor() {
  const [nodes, setNodes] = useState<DfdNode[]>(HARDENED_PRESET.nodes)
  const [edges, setEdges] = useState<DfdEdge[]>(HARDENED_PRESET.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('n-policy')
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  // Connection builder state
  const [connectFromId, setConnectFromId] = useState<string | null>(null)
  const [newRule, setNewRule] = useState<ConnectionRule>('policy_allow')

  // Drag state
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)

  // Live trace dry-run simulation
  const [traceActiveNodeId, setTraceActiveNodeId] = useState<string | null>(null)
  const [traceLog, setTraceLog] = useState<string[]>([])
  const [copiedMermaid, setCopiedMermaid] = useState(false)

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )
  const selectedEdge = useMemo(
    () => edges.find(e => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId]
  )
  const findings = useMemo(() => validateHarnessGraph(nodes, edges), [nodes, edges])

  const passCount = findings.filter(f => f.passed).length
  const hasErrors = findings.some(f => f.severity === 'error')
  const overallStatus = hasErrors ? 'breaking' : passCount === findings.length ? 'optimal' : 'tradeoff'

  const getSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 200, y: 180 }
    const rect = svg.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const addNodeAt = (kind: DfdNodeKind, rawX?: number, rawY?: number) => {
    const id = `node-${kind}-${Date.now().toString(36).slice(-4)}`
    const idx = nodes.length
    const x = Math.max(16, Math.min(CANVAS_W - NODE_W - 16, snap(rawX ?? 72 + ((idx * 130) % 620))))
    const y = Math.max(16, Math.min(CANVAS_H - NODE_H - 16, snap(rawY ?? 52 + ((idx * 76) % 300))))
    const next: DfdNode = {
      id,
      kind,
      label: NODE_META[kind].defaultLabel,
      x,
      y,
      toolAccess: kind === 'tool' ? 'mutating' : undefined,
      maxTurns: kind === 'orchestrator' ? 12 : undefined
    }
    setNodes(prev => [...prev, next])
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
  }

  const addEdge = (from: string, to: string, rule: ConnectionRule) => {
    if (from === to) return
    const exists = edges.some(e => e.from === from && e.to === to && e.rule === rule)
    if (exists) return
    const id = `edge-${Date.now().toString(36).slice(-5)}`
    setEdges(prev => [...prev, { id, from, to, rule }])
    setSelectedEdgeId(id)
    setSelectedNodeId(null)
  }

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
    if (connectFromId === id) setConnectFromId(null)
  }

  const deleteEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id))
    if (selectedEdgeId === id) setSelectedEdgeId(null)
  }

  const loadPreset = (preset: { nodes: DfdNode[]; edges: DfdEdge[] }) => {
    setNodes(preset.nodes.map(n => ({ ...n })))
    setEdges(preset.edges.map(e => ({ ...e })))
    setSelectedNodeId(preset.nodes[0]?.id ?? null)
    setSelectedEdgeId(null)
    setConnectFromId(null)
    setTraceActiveNodeId(null)
    setTraceLog([])
  }

  // Interactive Dry-Run Packet Simulation walking the user's custom edges
  const runDryTrace = () => {
    const start = nodes.find(n => n.kind === 'orchestrator') ?? nodes[0]
    if (!start) {
      setTraceLog(['Canvas is empty. Drag at least an Orchestrator and Agent onto the canvas.'])
      return
    }
    const byId = new Map(nodes.map(n => [n.id, n]))
    const visitedPath: DfdNode[] = [start]
    const logs: string[] = [`[Step 1] Entered ${start.label} (${NODE_META[start.kind].title})`]
    let current = start

    for (let hop = 2; hop <= 7; hop++) {
      const outgoing = edges.filter(e => e.from === current.id)
      if (outgoing.length === 0) {
        logs.push(`[Step ${hop}] Stopped at ${current.label}: no outgoing connection rule.`)
        break
      }
      // Prefer unvisited next node so trace explores full pipeline cleanly
      const chosen =
        outgoing.find(e => !visitedPath.some(v => v.id === e.to)) ??
        outgoing.find(e => e.rule === 'on_verify_pass') ??
        outgoing[0]
      const target = byId.get(chosen.to)
      if (!target) break
      const isUnsafeDirect =
        (current.kind === 'agent' || current.kind === 'orchestrator') &&
        target.kind === 'tool' &&
        chosen.rule !== 'policy_allow' &&
        chosen.rule !== 'hitl_escalate'

      logs.push(
        `[Step ${hop}] ${current.label} --(${RULE_META[chosen.rule].short})--> ${target.label}${
          isUnsafeDirect ? '  [WARNING: UNGUARDED TOOL CALL!]' : ''
        }`
      )
      visitedPath.push(target)
      current = target
    }

    setTraceLog(logs)
    visitedPath.forEach((node, idx) => {
      window.setTimeout(() => {
        setTraceActiveNodeId(node.id)
      }, idx * 420)
    })
    window.setTimeout(() => {
      setTraceActiveNodeId(null)
    }, visitedPath.length * 420 + 600)
  }

  // Export valid Mermaid code matching the user's custom diagram
  const exportedMermaid = useMemo(() => {
    const lines = ['flowchart LR']
    const idMap = new Map<string, string>()
    nodes.forEach((n, idx) => {
      const mid = `N${idx + 1}`
      idMap.set(n.id, mid)
      const safeLabel = n.label.replace(/"/g, "'")
      lines.push(`  ${mid}["${NODE_META[n.kind].short}: ${safeLabel}"]`)
    })
    edges.forEach(e => {
      const a = idMap.get(e.from)
      const b = idMap.get(e.to)
      if (a && b) lines.push(`  ${a} -->|${RULE_META[e.rule].short}| ${b}`)
    })
    return lines.join('\n')
  }, [nodes, edges])

  const handleCopyMermaid = async () => {
    try {
      await navigator.clipboard.writeText(exportedMermaid)
      setCopiedMermaid(true)
      window.setTimeout(() => setCopiedMermaid(false), 1800)
    } catch {
      setCopiedMermaid(false)
    }
  }

  return (
    <div className="dfd-ed-shell">
      {/* Top Action Bar: Presets + Palette + Dry-Run */}
      <div className="dfd-ed-toolbar">
        <div className="dfd-ed-palette" aria-label="Drag or click to add harness nodes">
          <span className="dfd-ed-tool-label">Drag or click to add node:</span>
          {(Object.keys(NODE_META) as DfdNodeKind[]).map(kind => (
            <button
              key={kind}
              type="button"
              draggable
              className={`dfd-ed-pal-btn kind-${kind}`}
              onDragStart={e => {
                e.dataTransfer.setData('application/x-harness-node', kind)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => addNodeAt(kind)}
            >
              <Plus size={13} />
              <span>{NODE_META[kind].title}</span>
            </button>
          ))}
        </div>

        <div className="dfd-ed-presets">
          <button
            type="button"
            className="bc-btn-secondary"
            onClick={() => loadPreset(HARDENED_PRESET)}
          >
            <ShieldCheck size={13} />
            <span>Hardened Harness</span>
          </button>
          <button
            type="button"
            className="bc-btn-secondary"
            onClick={() => loadPreset(BROKEN_PRESET)}
          >
            <AlertTriangle size={13} />
            <span>Broken Naive Loop</span>
          </button>
          <button
            type="button"
            className="bc-btn-secondary"
            onClick={() => loadPreset({ nodes: [], edges: [] })}
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>
          <button type="button" className="bc-btn-primary" onClick={runDryTrace}>
            <Play size={13} />
            <span>Simulate Trace</span>
          </button>
        </div>
      </div>

      {/* Main Split: Interactive SVG Drag-and-Drop Canvas (Left) + Rule Inspector & Validator (Right) */}
      <div className="dfd-ed-workspace">
        <div className="dfd-ed-canvas-wrap">
          <div className="dfd-ed-canvas-bar">
            <span className="dsde-kicker">
              {connectFromId
                ? `Connecting from "${nodes.find(n => n.id === connectFromId)?.label ?? ''}" — click any target node to attach "${RULE_META[newRule].short}" rule`
                : 'Drag nodes freely to arrange · Click Connect to wire logical rules · Drop palette items onto grid'}
            </span>
            <div className="dfd-ed-conn-pick">
              <label htmlFor="dfd-rule-select">Edge rule:</label>
              <select
                id="dfd-rule-select"
                className="llm-mc-select"
                value={newRule}
                onChange={e => setNewRule(e.target.value as ConnectionRule)}
              >
                {(Object.keys(RULE_META) as ConnectionRule[]).map(r => (
                  <option key={r} value={r}>
                    {RULE_META[r].label}
                  </option>
                ))}
              </select>
              {connectFromId && (
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => setConnectFromId(null)}
                >
                  Cancel Link
                </button>
              )}
            </div>
          </div>

          <svg
            ref={svgRef}
            className="dfd-ed-svg"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            role="application"
            aria-label="Interactive Agent Harness DFD Canvas"
            onDragOver={e => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={e => {
              e.preventDefault()
              const kind = e.dataTransfer.getData('application/x-harness-node') as DfdNodeKind
              if (kind && NODE_META[kind]) {
                const pt = getSvgCoords(e.clientX, e.clientY)
                addNodeAt(kind, pt.x - NODE_W / 2, pt.y - NODE_H / 2)
              }
            }}
            onPointerMove={e => {
              if (!dragging) return
              const pt = getSvgCoords(e.clientX, e.clientY)
              const nx = Math.max(12, Math.min(CANVAS_W - NODE_W - 12, snap(pt.x - dragging.offsetX)))
              const ny = Math.max(12, Math.min(CANVAS_H - NODE_H - 12, snap(pt.y - dragging.offsetY)))
              setNodes(prev => prev.map(n => (n.id === dragging.id ? { ...n, x: nx, y: ny } : n)))
            }}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
            onClick={e => {
              if (e.target === svgRef.current) {
                setSelectedNodeId(null)
                setSelectedEdgeId(null)
                setConnectFromId(null)
              }
            }}
          >
            <defs>
              <pattern id="dfd-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#1e2d4a" />
              </pattern>
              {(Object.keys(RULE_META) as ConnectionRule[]).map(rule => (
                <marker
                  key={rule}
                  id={`arrow-${rule}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={RULE_META[rule].stroke} />
                </marker>
              ))}
            </defs>

            <rect width={CANVAS_W} height={CANVAS_H} fill="#070d19" />
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#dfd-grid)" />

            {/* Edges with Bezier curves & clickable logical rule labels */}
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.from)
              const dst = nodes.find(n => n.id === edge.to)
              if (!src || !dst) return null

              const sx = src.x + NODE_W / 2
              const sy = src.y + NODE_H / 2
              const dx = dst.x + NODE_W / 2
              const dy = dst.y + NODE_H / 2

              // Offset start/end to box edges for clean arrows
              const angle = Math.atan2(dy - sy, dx - sx)
              const startX = sx + Math.cos(angle) * (NODE_W / 2 + 2)
              const startY = sy + Math.sin(angle) * (NODE_H / 2 + 2)
              const endX = dx - Math.cos(angle) * (NODE_W / 2 + 6)
              const endY = dy - Math.sin(angle) * (NODE_H / 2 + 6)

              // Slight curve offset so bidirectional edges never collide
              const hasReverse = edges.some(other => other.from === edge.to && other.to === edge.from)
              const curveLift = hasReverse ? 28 : 12
              const midX = (startX + endX) / 2 - Math.sin(angle) * curveLift
              const midY = (startY + endY) / 2 + Math.cos(angle) * curveLift

              const pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`
              const ruleInfo = RULE_META[edge.rule]
              const isSelected = selectedEdgeId === edge.id

              return (
                <g
                  key={edge.id}
                  className="dfd-ed-edge-group"
                  onClick={e => {
                    e.stopPropagation()
                    setSelectedEdgeId(edge.id)
                    setSelectedNodeId(null)
                  }}
                >
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="14"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? '#ffffff' : ruleInfo.stroke}
                    strokeWidth={isSelected ? 3 : 2.1}
                    strokeDasharray={ruleInfo.dashed ? '6 4' : undefined}
                    markerEnd={`url(#arrow-${edge.rule})`}
                  />
                  <rect
                    x={midX - 42}
                    y={midY - 10}
                    width="84"
                    height="19"
                    rx="5"
                    fill="#0b1324"
                    stroke={isSelected ? '#ffffff' : ruleInfo.stroke}
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="DM Mono, monospace"
                    fill={ruleInfo.stroke}
                  >
                    {ruleInfo.short}
                  </text>
                </g>
              )
            })}

            {/* Draggable Nodes */}
            {nodes.map(node => {
              const meta = NODE_META[node.kind]
              const isSelected = selectedNodeId === node.id
              const isSource = connectFromId === node.id
              const isTracing = traceActiveNodeId === node.id

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="dfd-ed-node-group"
                  onPointerDown={e => {
                    e.stopPropagation()
                    if (connectFromId) {
                      if (connectFromId !== node.id) {
                        addEdge(connectFromId, node.id, newRule)
                      }
                      setConnectFromId(null)
                      return
                    }
                    const pt = getSvgCoords(e.clientX, e.clientY)
                    setSelectedNodeId(node.id)
                    setSelectedEdgeId(null)
                    setDragging({ id: node.id, offsetX: pt.x - node.x, offsetY: pt.y - node.y })
                  }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx="10"
                    fill={isTracing ? '#1f3666' : meta.fill}
                    stroke={isTracing ? '#6ee2ba' : isSource ? '#f8d27d' : isSelected ? '#ffffff' : meta.stroke}
                    strokeWidth={isTracing || isSelected || isSource ? 2.6 : 1.5}
                  />
                  <text
                    x="12"
                    y="20"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="DM Mono, monospace"
                    fill={meta.badge}
                  >
                    {meta.short}
                    {node.toolAccess ? ` · ${node.toolAccess === 'mutating' ? 'MUTATE' : 'READ'}` : ''}
                  </text>
                  <text
                    x="12"
                    y="41"
                    fontSize="12.5"
                    fontWeight="600"
                    fontFamily="Space Grotesk, sans-serif"
                    fill="#f3f6ff"
                  >
                    {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
                  </text>
                </g>
              )
            })}

            {nodes.length === 0 && (
              <text
                x={CANVAS_W / 2}
                y={CANVAS_H / 2}
                textAnchor="middle"
                fontSize="14"
                fontFamily="DM Sans, sans-serif"
                fill="#7d90b3"
              >
                Drag nodes from the palette above or load a preset to design your Agent Harness.
              </text>
            )}
          </svg>

          {/* Live Dry-Run Trace Log */}
          {traceLog.length > 0 && (
            <div className="dfd-ed-trace-box">
              <span className="dsde-kicker">Simulated Execution Packet Trace</span>
              <div className="dsde-logs">
                {traceLog.map((line, i) => (
                  <div
                    className={`dsde-log-line ${line.includes('WARNING') ? 'error' : ''}`}
                    key={i}
                  >
                    <code>{line}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Rail: Node/Edge Inspector + Live Architect Validator */}
        <aside className="dfd-ed-inspector">
          {/* Selected Node or Edge Properties */}
          <div className="dsde-card">
            <span className="dsde-kicker">
              {selectedNode
                ? `Selected ${NODE_META[selectedNode.kind].title} Node`
                : selectedEdge
                ? 'Selected Logical Connection Rule'
                : 'Selection Inspector'}
            </span>

            {selectedNode && (
              <div className="dfd-ed-prop-form">
                <label className="dfd-ed-field">
                  <span>Node Label</span>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={e =>
                      setNodes(prev =>
                        prev.map(n => (n.id === selectedNode.id ? { ...n, label: e.target.value } : n))
                      )
                    }
                  />
                </label>

                {selectedNode.kind === 'tool' && (
                  <label className="dfd-ed-field">
                    <span>Tool Permission Tier</span>
                    <select
                      className="llm-mc-select"
                      value={selectedNode.toolAccess ?? 'mutating'}
                      onChange={e =>
                        setNodes(prev =>
                          prev.map(n =>
                            n.id === selectedNode.id
                              ? { ...n, toolAccess: e.target.value as 'read_only' | 'mutating' }
                              : n
                          )
                        )
                      }
                    >
                      <option value="read_only">Read-Only (Low Blast Radius)</option>
                      <option value="mutating">Mutating / Shell (Requires Policy Gate)</option>
                    </select>
                  </label>
                )}

                <div className="dfd-ed-node-actions">
                  <button
                    type="button"
                    className="bc-btn-primary"
                    onClick={() => setConnectFromId(selectedNode.id)}
                  >
                    <Link2 size={13} />
                    <span>Connect Output</span>
                  </button>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => deleteNode(selectedNode.id)}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="dfd-ed-prop-form">
                <p className="dfd-ed-edge-summary">
                  <strong>{nodes.find(n => n.id === selectedEdge.from)?.label}</strong> →{' '}
                  <strong>{nodes.find(n => n.id === selectedEdge.to)?.label}</strong>
                </p>
                <label className="dfd-ed-field">
                  <span>Logical Connection Rule</span>
                  <select
                    className="llm-mc-select"
                    value={selectedEdge.rule}
                    onChange={e =>
                      setEdges(prev =>
                        prev.map(ed =>
                          ed.id === selectedEdge.id
                            ? { ...ed, rule: e.target.value as ConnectionRule }
                            : ed
                        )
                      )
                    }
                  >
                    {(Object.keys(RULE_META) as ConnectionRule[]).map(r => (
                      <option key={r} value={r}>
                        {RULE_META[r].label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => deleteEdge(selectedEdge.id)}
                >
                  <Trash2 size={13} />
                  <span>Remove Connection</span>
                </button>
              </div>
            )}

            {!selectedNode && !selectedEdge && (
              <p className="dfd-ed-muted">
                Click any node on the canvas to rename it or wire a new logical connection, or click
                any arrow label to change its condition rule.
              </p>
            )}
          </div>

          {/* Live Architect Harness Validation Panel */}
          <div className="dsde-card">
            <div className="dfd-ed-val-head">
              <div>
                <span className="dsde-kicker">Live Harness Topology Validator</span>
                <h4>
                  {passCount} / {findings.length} Architect Checks Passed
                </h4>
              </div>
              <span className={`dfd-ed-verdict ${overallStatus}`}>
                {overallStatus === 'optimal'
                  ? 'Hardened'
                  : overallStatus === 'tradeoff'
                  ? 'Needs Tuning'
                  : 'Unsafe'}
              </span>
            </div>

            <div className="dfd-ed-findings">
              {findings.map(f => (
                <div className={`dfd-ed-finding ${f.severity}`} key={f.id}>
                  {f.severity === 'pass' ? (
                    <CheckCircle2 size={15} />
                  ) : f.severity === 'warning' ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <XCircle size={15} />
                  )}
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="dfd-ed-export-row">
              <span className="bc-tabular">
                {nodes.length} nodes · {edges.length} rules
              </span>
              <button
                type="button"
                className="bc-btn-secondary"
                onClick={() => void handleCopyMermaid()}
              >
                {copiedMermaid ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedMermaid ? 'Copied Mermaid' : 'Copy Mermaid DFD'}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
