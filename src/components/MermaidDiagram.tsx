import { useEffect, useId, useMemo, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  syntax: string
  diagramType: 'flowchart' | 'sequenceDiagram'
  highlightNode?: string
  nodeLabels: Record<string, string>
}

let mermaidInitialized = false

function ensureMermaidInit() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: '"DM Sans", sans-serif',
    themeVariables: {
      darkMode: true,
      background: '#0b1324',
      primaryColor: '#16233d',
      primaryTextColor: '#e6edf8',
      primaryBorderColor: '#3b4e74',
      lineColor: '#7689b2',
      secondaryColor: '#121d33',
      tertiaryColor: '#1b2b4a',
      actorBkg: '#16233d',
      actorBorder: '#475c87',
      actorTextColor: '#e6edf8',
      actorLineColor: '#4c5f86',
      signalColor: '#9fb0d6',
      signalTextColor: '#dce6fa',
      labelBoxBkgColor: '#142038',
      labelBoxBorderColor: '#3a4d73',
      labelTextColor: '#dce6fa',
      noteBkgColor: '#192a4a',
      noteBorderColor: '#6b7fff',
      noteTextColor: '#eef2ff'
    },
    flowchart: {
      curve: 'basis',
      padding: 14,
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
    // Only apply class styling if the node ID appears in the flowchart definition
    const escaped = highlightNode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nodeRegex = new RegExp(`\\b${escaped}\\b`)
    if (!nodeRegex.test(syntax)) return syntax
    return `${syntax}\n    classDef activeStep fill:#2b3e7a,stroke:#8b9dff,stroke-width:3px,color:#ffffff\n    class ${highlightNode} activeStep`
  }
  return syntax
}

export default function MermaidDiagram({
  syntax,
  diagramType,
  highlightNode,
  nodeLabels
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
          // For sequence diagrams, highlight the active actor box cleanly via SVG string class/attribute match
          let finalSvg = svg
          if (diagramType === 'sequenceDiagram' && highlightNode) {
            const labelText = nodeLabels[highlightNode] ?? highlightNode
            finalSvg = svg.replace(
              new RegExp(`(<rect[^>]*class="actor[^"]*"[^>]*name="${highlightNode}"[^>]*>)`, 'g'),
              match => match.replace('class="actor', 'class="actor mmd-seq-active')
            )
            // Also inject a subtle top highlight class if actor matched by title text
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
    <div className="bc-mermaid-stage">
      {highlightNode && (
        <div className="bc-active-node-bar" aria-live="polite">
          <span>Active highlighted node</span>
          <span aria-hidden="true">·</span>
          <strong>{nodeLabels[highlightNode] ?? highlightNode}</strong>
          <code>{highlightNode}</code>
        </div>
      )}
      <div
        className="bc-mermaid-svg"
        aria-label="Interactive architecture flow diagram"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  )
}
