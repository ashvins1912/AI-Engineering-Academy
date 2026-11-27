import { useState } from 'react'
import { Check, Copy, Compass, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import MermaidDiagram from './MermaidDiagram'

type ZoomLevel = 75 | 100 | 125 | 150
const ZOOM_STEPS: ZoomLevel[] = [75, 100, 125, 150]

export interface AtlasDiagramCardProps {
  figureNumber: string
  title: string
  syntax: string
  diagramType?: 'flowchart' | 'sequenceDiagram'
  highlightNode?: string
  nodeLabels: Record<string, string>
  architecturalRule: string
  stageLabel?: string
}

export default function AtlasDiagramCard({
  figureNumber,
  title,
  syntax,
  diagramType = 'flowchart',
  highlightNode,
  nodeLabels,
  architecturalRule,
  stageLabel
}: AtlasDiagramCardProps) {
  const [zoomIdx, setZoomIdx] = useState<number>(1) // 100%
  const [copied, setCopied] = useState(false)

  const zoom = ZOOM_STEPS[zoomIdx]

  const handleZoomIn = () => setZoomIdx(prev => Math.min(ZOOM_STEPS.length - 1, prev + 1))
  const handleZoomOut = () => setZoomIdx(prev => Math.max(0, prev - 1))
  const handleReset = () => setZoomIdx(1)

  const handleCopyMermaid = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(syntax)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <figure className="atlas-diagram-card">
      <header className="atlas-diagram-head">
        <div className="atlas-diagram-title-wrap">
          <span className="atlas-fig-badge">{figureNumber}</span>
          {stageLabel && <span className="atlas-fig-stage">{stageLabel}</span>}
          <figcaption className="atlas-fig-title">{title}</figcaption>
        </div>

        <div className="atlas-diagram-controls" role="toolbar" aria-label="Diagram controls">
          <div className="atlas-zoom-group">
            <button
              type="button"
              className="atlas-ctrl-btn"
              onClick={handleZoomOut}
              disabled={zoomIdx === 0}
              aria-label="Zoom out diagram"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="atlas-zoom-readout bc-tabular">{zoom}%</span>
            <button
              type="button"
              className="atlas-ctrl-btn"
              onClick={handleZoomIn}
              disabled={zoomIdx === ZOOM_STEPS.length - 1}
              aria-label="Zoom in diagram"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="atlas-ctrl-btn"
              onClick={handleReset}
              disabled={zoomIdx === 1}
              aria-label="Reset diagram zoom"
              title="Reset zoom"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <button
            type="button"
            className={`atlas-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopyMermaid}
            aria-label="Copy Mermaid diagram source"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Mermaid'}</span>
          </button>
        </div>
      </header>

      <div className="atlas-diagram-legend" aria-label="Semantic color legend">
        <span className="atlas-legend-item sky">
          <i aria-hidden="true" />
          Hot Path / Active Compute
        </span>
        <span className="atlas-legend-item indigo">
          <i aria-hidden="true" />
          Control Plane / State
        </span>
        <span className="atlas-legend-item emerald">
          <i aria-hidden="true" />
          Verified Outcome
        </span>
        <span className="atlas-legend-item amber">
          <i aria-hidden="true" />
          Bottleneck / Risk
        </span>
      </div>

      <div className="atlas-diagram-viewport" tabIndex={0} aria-label={`${figureNumber}: ${title} scrollable canvas`}>
        <div className={`atlas-diagram-canvas atlas-zoom-${zoom}`}>
          <MermaidDiagram
            syntax={syntax}
            diagramType={diagramType}
            highlightNode={highlightNode}
            nodeLabels={nodeLabels}
            allowPan
          />
        </div>
      </div>

      <footer className="atlas-rule-banner">
        <span className="atlas-rule-tag">
          <Compass size={14} />
          Architectural Rule
        </span>
        <p className="atlas-rule-text">{architecturalRule}</p>
      </footer>
    </figure>
  )
}
