import { useEffect, useMemo, useState } from 'react'
import { TypeAnimation } from 'react-type-animation'
import { FastForward, RotateCcw, Sparkles } from 'lucide-react'

export type StreamVariant = 'prose' | 'code' | 'inline'

export interface TokenStreamTypewriterProps {
  /** Full output text to stream token-by-token via react-type-animation */
  text: string
  /** Optional key that restarts the stream whenever scenario/params/run change */
  streamKey?: string | number
  /** External replay counter so parent buttons can trigger replay */
  replayTrigger?: number
  /** Milliseconds per streamed token (default: 34ms ≈ 29 tok/s) */
  tokenDelayMs?: number
  /** Display style: prose card, monospace code console, or compact inline */
  variant?: StreamVariant
  /** Optional header label shown on the status bar */
  label?: string
  /** Show compact live status badge + Skip / Replay controls (default: true) */
  showControls?: boolean
  /** Stream word/subword tokens (default) or character-by-character */
  granularity?: 'token' | 'char'
  /** Callback fired once streaming completes */
  onComplete?: () => void
  /** Extra CSS class name */
  className?: string
}

/**
 * Splits prose or console output into BPE-like subword/word tokens so
 * react-type-animation produces authentic real-time LLM token streaming.
 */
export function splitIntoLlmTokens(input: string): ReadonlyArray<string> {
  if (!input) return ['']
  const tokens = input.match(/\S+\s*|\n+|\s+/g)
  if (!tokens || tokens.length === 0) return [input]
  // Break unusually long unbroken tokens (e.g. URLs/JSON/paths) into ~6-char subwords
  const refined: string[] = []
  for (const tok of tokens) {
    if (tok.length > 14 && !/\s/.test(tok)) {
      for (let i = 0; i < tok.length; i += 6) {
        refined.push(tok.slice(i, i + 6))
      }
    } else {
      refined.push(tok)
    }
  }
  return refined
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function TokenStreamTypewriter({
  text,
  streamKey,
  replayTrigger = 0,
  tokenDelayMs = 32,
  variant = 'prose',
  label,
  showControls = true,
  granularity = 'token',
  onComplete,
  className = ''
}: TokenStreamTypewriterProps) {
  const [localReplay, setLocalReplay] = useState(0)
  const [done, setDone] = useState<boolean>(() => prefersReducedMotion() || !text)

  const tokenCount = useMemo(() => {
    if (!text) return 0
    return splitIntoLlmTokens(text).filter(t => t.trim().length > 0).length
  }, [text])

  // Restart typing animation whenever text, streamKey, or external replayTrigger changes
  const effectiveKey = `${streamKey ?? 'default'}::${replayTrigger}::${localReplay}::${text}`

  useEffect(() => {
    if (!text || prefersReducedMotion()) {
      setDone(true)
      return
    }
    setDone(false)
  }, [effectiveKey, text])

  const splitter = granularity === 'token' ? splitIntoLlmTokens : undefined

  // Adaptive delay cap so very long console logs still finish briskly (~2.2s max)
  const adaptiveDelayMs = useMemo(() => {
    if (granularity === 'char') return Math.max(8, Math.min(40, tokenDelayMs))
    const totalTokens = Math.max(1, tokenCount)
    const maxTotalMs = variant === 'code' ? 1900 : 2600
    const capped = Math.floor(maxTotalMs / totalTokens)
    return Math.max(10, Math.min(tokenDelayMs, capped))
  }, [granularity, tokenCount, tokenDelayMs, variant])

  const handleFinish = () => {
    setDone(true)
    onComplete?.()
  }

  const handleReplay = () => {
    setDone(false)
    setLocalReplay(n => n + 1)
  }

  const handleSkip = () => {
    setDone(true)
    onComplete?.()
  }

  if (variant === 'inline') {
    return (
      <span className={`ts-inline-wrap ${done ? 'is-done' : 'is-streaming'} ${className}`}>
        {done ? (
          <span>{text}</span>
        ) : (
          <TypeAnimation
            key={effectiveKey}
            sequence={[text, handleFinish]}
            splitter={splitter}
            speed={{ type: 'keyStrokeDelayInMs', value: adaptiveDelayMs }}
            cursor={true}
            omitDeletionAnimation={true}
            repeat={0}
            wrapper="span"
            className="ts-type-inline"
          />
        )}
      </span>
    )
  }

  return (
    <div
      className={`ts-stream-box variant-${variant} ${done ? 'is-done' : 'is-streaming'} ${className}`}
      aria-live="polite"
    >
      {showControls && (
        <div className="ts-stream-bar">
          <div className="ts-stream-meta">
            {label && <span className="ts-stream-label">{label}</span>}
            <span className={`ts-stream-badge bc-tabular ${done ? 'is-done' : 'is-live'}`}>
              <Sparkles size={11} />
              {done
                ? `Complete · ${tokenCount} tok`
                : `Streaming · ${tokenCount} tok`}
            </span>
          </div>

          <div className="ts-stream-actions">
            {!done && (
              <button
                type="button"
                className="ts-stream-btn"
                onClick={handleSkip}
                title="Show full generated output immediately"
              >
                <FastForward size={12} />
                <span>Skip</span>
              </button>
            )}
            <button
              type="button"
              className="ts-stream-btn"
              onClick={handleReplay}
              title="Replay real-time token streaming animation"
            >
              <RotateCcw size={12} />
              <span>Replay</span>
            </button>
          </div>
        </div>
      )}

      {variant === 'code' ? (
        <pre className="ts-stream-pre">
          {done ? (
            <span className="ts-type-code">{text}</span>
          ) : (
            <TypeAnimation
              key={effectiveKey}
              sequence={[text, handleFinish]}
              splitter={splitter}
              speed={{ type: 'keyStrokeDelayInMs', value: adaptiveDelayMs }}
              cursor={true}
              omitDeletionAnimation={true}
              repeat={0}
              wrapper="span"
              className="ts-type-code"
            />
          )}
        </pre>
      ) : (
        <div className="ts-stream-body">
          {done ? (
            <p className="ts-type-prose">{text}</p>
          ) : (
            <TypeAnimation
              key={effectiveKey}
              sequence={[text, handleFinish]}
              splitter={splitter}
              speed={{ type: 'keyStrokeDelayInMs', value: adaptiveDelayMs }}
              cursor={true}
              omitDeletionAnimation={true}
              repeat={0}
              wrapper="p"
              className="ts-type-prose"
            />
          )}
        </div>
      )}
    </div>
  )
}
