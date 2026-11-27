import { useEffect, useId, useMemo, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  syntax: string
  diagramType: 'flowchart' | 'sequenceDiagram'
  highlightNode?: string
  nodeLabels: Record<string, string>
  allowPan?: boolean
}

let mermaidInitialized = false

function ensureMermaidInit() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    themeVariables: {
      darkMode: true,
      background: '#090D16',
      primaryColor: '#0F172A',
      primaryTextColor: '#F1F5F9',
      primaryBorderColor: '#334155',
      lineColor: '#64748B',
      secondaryColor: '#111C31',
      tertiaryColor: '#17253D',
      clusterBkg: '#0B1220',
      clusterBorder: '#1E293B',
      titleColor: '#94A3B8',
      edgeLabelBackground: '#090D16',
      actorBkg: '#0F172A',
      actorBorder: '#38BDF8',
      actorTextColor: '#F1F5F9',
      actorLineColor: '#475569',
      signalColor: '#94A3B8',
      signalTextColor: '#E2E8F0',
      labelBoxBkgColor: '#0F172A',
      labelBoxBorderColor: '#334155',
      labelTextColor: '#E2E8F0',
      noteBkgColor: '#131F36',
      noteBorderColor: '#818CF8',
      noteTextColor: '#EEF2FF'
    },
    flowchart: {
      curve: 'basis',
      padding: 16,
      nodeSpacing: 36,
      rankSpacing: 46,
      htmlLabels: false,
      useMaxWidth: true
    },
    sequence: {
      useMaxWidth: true,
      actorMargin: 36,
      messageMargin: 28,
      mirrorActors: false
    }
  })
  mermaidInitialized = true
}

function buildHighlightedSyntax(
  syntax: string,
  diagramType: 'flowchart' | 'sequenceDiagram',
  highlightNode?: string
): string {
  if (!highlightNode) return syntax
  if (diagramType === 'flowchart') {
    const escaped = highlightNode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nodeRegex = new RegExp(`\\b${escaped}\\b`)
    if (!nodeRegex.test(syntax)) return syntax
    return `${syntax}\n    classDef activeStep fill:#0C2D48,stroke:#38BDF8,stroke-width:2.5px,color:#F8FAFC\n    class ${highlightNode} activeStep`
  }
  return syntax
}

export default function MermaidDiagram({
  syntax,
  diagramType,
  highlightNode,
  nodeLabels,
  allowPan = false
}: MermaidDiagramProps) {
  const reactId = useId().replace(/:/g, '')
  const [svgMarkup, setSvgMarkup] = useState<string>('')
  const [renderFailed, setRenderFailed] = useState(false)

  const decoratedSyntax = useMemo(
    () => buildHighlightedSyntax(syntax, diagramType, highlightNode),
    [syntax, diagramType, highlightNode]
  )

  useEffect(() => {
    let cancelled = false
    ensureMermaidInit()

    async function renderDiagram() {
      try {
        const uniqueId = `mmd-${reactId}-${Math.random().toString(36).slice(2, 7)}`
        const { svg } = await mermaid.render(uniqueId, decoratedSyntax)
        if (!cancelled) {
          let finalSvg = svg
          if (diagramType === 'sequenceDiagram' && highlightNode) {
            const labelText = nodeLabels[highlightNode] ?? highlightNode
            finalSvg = svg.replace(
              new RegExp(`(<rect[^>]*class="actor[^"]*"[^>]*name="${highlightNode}"[^>]*>)`, 'g'),
              match => match.replace('class="actor', 'class="actor mmd-seq-active')
            )
            if (finalSvg === svg && labelText) {
              const escapedLabel = labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              finalSvg = svg.replace(
                new RegExp(`(<text[^>]*>\\s*<tspan[^>]*>${escapedLabel}<\\/tspan>\\s*<\\/text>)`, 'g'),
                '<g class="mmd-seq-active-label">$1</g>'
              )
            }
          }
          setSvgMarkup(finalSvg)
          setRenderFailed(false)
        }
      } catch {
        if (!cancelled) {
          setRenderFailed(true)
        }
      }
    }

    renderDiagram()
    return () => {
      cancelled = true
    }
  }, [decoratedSyntax, diagramType, highlightNode, nodeLabels, reactId])

  const nodeKeys = Object.keys(nodeLabels)

  if (renderFailed) {
    return (
      <div className="bc-fallback-flow" role="list" aria-label="Architecture data flow">
        {nodeKeys.map((key, idx) => (
          <div
            key={key}
            role="listitem"
            className={`bc-fallback-node ${highlightNode === key ? 'active' : ''}`}
          >
            <span className="bc-fallback-idx">{String(idx + 1).padStart(2, '0')}</span>
            <strong>{nodeLabels[key]}</strong>
            <code>{key}</code>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`bc-mermaid-stage ${allowPan ? 'atlas-mermaid-stage' : ''}`}>
      {highlightNode && (
        <div className="bc-active-node-bar" aria-live="polite">
          <span>Active highlighted node</span>
          <span aria-hidden="true">·</span>
          <strong>{nodeLabels[highlightNode] ?? highlightNode}</strong>
          <code>{highlightNode}</code>
        </div>
      )}
      <div
        className={`bc-mermaid-svg ${allowPan ? 'atlas-mermaid-pan' : ''}`}
        aria-label="Interactive architecture flow diagram"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  )
}
