import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import brainSrc from '../../assets/brain.svg'
import { sectionById, sections, site, type SectionId } from '../content/site'
import { fx } from '../fx/fx'
import { ambience } from '../lib/audio'
import { useMediaQuery, useReducedMotion } from '../lib/hooks'
import { BRAIN_STAGE, placeNodes, type PlacedNode } from './nodes'

const BLUE = '#3DDCFF'
const MINT = '#3DFFB0'
const nodes = placeNodes()
export const BRAIN_COMPACT_QUERY = '(max-width: 639px), (max-height: 479px), (max-aspect-ratio: 5/6)'

interface Props {
  onOpen: (id: SectionId) => void
  panelOpen: boolean
}

interface Parts {
  texts: HTMLElement[]
  lines: SVGGeometryElement[]
  anchor: Element | null
  hide: Element[]
}

/** Shared dissolve / reassemble wiring for one node. */
function useDissolve() {
  const active = useRef(new Set<string>())
  const dissolve = useCallback((key: string, parts: Parts, color: string) => {
    if (active.current.has(key)) return
    active.current.add(key)
    const a = parts.anchor?.getBoundingClientRect()
    const anchor = a ? { x: a.left + a.width / 2, y: a.top + a.height / 2 } : { x: 0, y: 0 }
    const ok = fx.dissolve(
      key,
      parts.texts,
      parts.lines.map((el) => ({ el, color })),
      anchor,
    )
    // Hide the DOM copies in the same tick the canvas takes over, so there is no flash.
    parts.hide.forEach((el) => el.setAttribute('data-fx', ok ? 'dissolved' : 'faded'))
    ambience.sfx('dissolve')
  }, [])
  const reassemble = useCallback((key: string, parts: Parts) => {
    if (!active.current.has(key)) return
    active.current.delete(key)
    fx.reassemble(key, () => parts.hide.forEach((el) => el.removeAttribute('data-fx')))
  }, [])
  return { dissolve, reassemble }
}

export function BrainScene(props: Props) {
  const compact = useMediaQuery(BRAIN_COMPACT_QUERY)
  return compact ? <BrainList {...props} /> : <BrainStage {...props} />
}

function BrainStage({ onOpen }: Props) {
  const reduced = useReducedMotion()
  const [hover, setHover] = useState<SectionId | null>(null)
  const refs = useRef<Record<string, { label?: HTMLElement | null; line?: SVGPolylineElement | null; anchor?: SVGCircleElement | null; group?: SVGGElement | null }>>({})
  const { dissolve, reassemble } = useDissolve()

  const partsFor = (id: SectionId): Parts => {
    const r = refs.current[id] ?? {}
    const texts = r.label ? Array.from(r.label.querySelectorAll<HTMLElement>('[data-text]')) : []
    return {
      texts,
      lines: r.line ? [r.line] : [],
      anchor: r.anchor ?? null,
      hide: [r.label, r.group].filter(Boolean) as Element[],
    }
  }

  const enter = (n: PlacedNode) => {
    setHover(n.id)
    ambience.sfx('hover')
    dissolve(n.id, partsFor(n.id), sectionById[n.id].brain.only ? MINT : BLUE)
  }
  const leave = (n: PlacedNode) => {
    setHover((h) => (h === n.id ? null : h))
    reassemble(n.id, partsFor(n.id))
  }
  const open = (n: PlacedNode) => {
    ambience.sfx('open')
    onOpen(n.id)
  }

  const { width, height, brain } = BRAIN_STAGE
  const hovered = hover ? sectionById[hover] : null
  const pct = (v: number, of: number) => `${(v / of) * 100}%`

  return (
    <div className="brain-scene">
      <div className="brain-grid" aria-hidden="true" />
      <div className="stage brain-stage" style={{ '--sw': width, '--sh': height } as CSSProperties}>
        <div
          className="brain-glow"
          aria-hidden="true"
          style={{ left: pct(brain.x, width), top: pct(brain.y, height), width: pct(brain.size, width), height: pct(brain.size, height) }}
        />
        <img
          className="brain-art"
          src={brainSrc}
          alt="A glowing wireframe brain"
          draggable={false}
          style={{ left: pct(brain.x, width), top: pct(brain.y, height), width: pct(brain.size, width) }}
        />
        <svg className="brain-lines" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          {nodes.map((n, i) => {
            const only = sectionById[n.id].brain.only
            const color = only ? MINT : BLUE
            const d = `M ${n.ax} ${n.ay} L ${n.lx} ${n.ly}`
            return (
              <g key={n.id} className={`brain-node ${hover === n.id ? 'is-hover' : ''}`} style={{ color }}>
                <g ref={(el) => void ((refs.current[n.id] ??= {}).group = el)} className="node-trace">
                  <polyline
                    ref={(el) => void ((refs.current[n.id] ??= {}).line = el)}
                    points={`${n.ax},${n.ay} ${n.lx},${n.ly}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                  />
                  <circle cx={n.lx} cy={n.ly} r={4} fill="#05070A" stroke="currentColor" strokeWidth={1.6} />
                  {!reduced && (
                    <circle r={2.6} fill="currentColor" className="trace-pulse">
                      <animateMotion dur={`${1.4 + (i % 4) * 0.25}s`} begin={`${(i * 1.7) % 7}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
                    </circle>
                  )}
                </g>
                {!reduced && <circle cx={n.ax} cy={n.ay} r={6} className="anchor-ring" style={{ animationDelay: `${(i % 5) * 0.6}s`, transformOrigin: `${n.ax}px ${n.ay}px` }} />}
                <circle ref={(el) => void ((refs.current[n.id] ??= {}).anchor = el)} cx={n.ax} cy={n.ay} r={5.5} className="anchor-dot" fill="currentColor" />
                <circle
                  cx={n.ax}
                  cy={n.ay}
                  r={20}
                  className="anchor-hit"
                  onPointerEnter={() => enter(n)}
                  onPointerLeave={() => leave(n)}
                  onClick={() => open(n)}
                />
              </g>
            )
          })}
        </svg>
        {nodes.map((n) => {
          const s = sectionById[n.id]
          return (
            <button
              key={n.id}
              type="button"
              ref={(el) => void ((refs.current[n.id] ??= {}).label = el)}
              className={`brain-label side-${n.side} ${s.brain.only ? 'is-only' : ''}`}
              style={{ left: pct(n.lx, width), top: pct(n.ly, height) }}
              onPointerEnter={() => enter(n)}
              onPointerLeave={() => leave(n)}
              onFocus={() => enter(n)}
              onBlur={() => leave(n)}
              onClick={() => open(n)}
              aria-label={`${s.brain.label}: ${s.brain.teaser}. Opens ${s.title}.`}
            >
              <span className="region" data-text>
                {s.brain.region}
              </span>
              <span className="name" data-text>
                {s.brain.label}
              </span>
            </button>
          )
        })}
      </div>
      <div className="brain-hud" aria-live="polite">
        <span className="hud-prompt">&gt;</span>{' '}
        {hovered ? (
          <>
            <span className="hud-key">{hovered.brain.label.toLowerCase()}</span> <span className="hud-sep">::</span> {hovered.brain.teaser}{' '}
            <span className="hud-cta">[click to open]</span>
          </>
        ) : (
          <span className="hud-idle">{site.brainHint}</span>
        )}
        <span className="hud-caret" aria-hidden="true" />
      </div>
      <div className="brain-legend" aria-hidden="true">
        <span className="legend-item">
          <i style={{ background: BLUE }} /> also in the room
        </span>
        <span className="legend-item is-only">
          <i style={{ background: MINT }} /> brain only
        </span>
      </div>
    </div>
  )
}

function listParts(li: HTMLLIElement | null | undefined): Parts {
  return {
    texts: li ? Array.from(li.querySelectorAll<HTMLElement>('[data-text]')) : [],
    lines: li ? Array.from(li.querySelectorAll<SVGGeometryElement>('line')) : [],
    anchor: li?.querySelector('circle') ?? null,
    hide: li ? Array.from(li.querySelectorAll('[data-hide]')) : [],
  }
}

/** Mobile and portrait Brain: a stacked list of labeled nodes, dissolve on tap. */
function BrainList({ onOpen, panelOpen }: Props) {
  const { dissolve, reassemble } = useDissolve()
  const refs = useRef<Record<string, HTMLLIElement | null>>({})
  const pending = useRef<string | null>(null)
  const timer = useRef(0)

  // Reassemble the tapped node once its panel closes.
  useEffect(() => {
    if (!panelOpen && pending.current) {
      const id = pending.current
      pending.current = null
      reassemble(id, listParts(refs.current[id]))
    }
  }, [panelOpen, reassemble])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const tap = (id: SectionId) => {
    if (pending.current) return
    pending.current = id
    dissolve(id, listParts(refs.current[id]), sectionById[id].brain.only ? MINT : BLUE)
    timer.current = window.setTimeout(() => {
      ambience.sfx('open')
      onOpen(id)
    }, 480)
  }

  const group = (only: boolean) =>
    sections
      .filter((s) => !!s.brain.only === only)
      .map((s) => (
        <li key={s.id} ref={(el) => void (refs.current[s.id] = el)} className={only ? 'is-only' : ''}>
          <button type="button" className="brain-item" onClick={() => tap(s.id)}>
            <svg className="item-trace" viewBox="0 0 40 20" aria-hidden="true" data-hide>
              <circle cx="5" cy="10" r="4" fill="currentColor" />
              <line x1="9" y1="10" x2="40" y2="10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="item-text" data-hide>
              <span className="region" data-text>
                {s.brain.region}
              </span>
              <span className="name" data-text>
                {s.brain.label}
              </span>
              <span className="teaser" data-text>
                {s.brain.teaser}
              </span>
            </span>
          </button>
        </li>
      ))

  return (
    <div className="brain-list-wrap">
      <div className="brain-hero" aria-hidden="true">
        <img src={brainSrc} alt="" draggable={false} />
      </div>
      <p className="brain-intro">{site.brainTouchHint}</p>
      <h2 className="brain-group-title">Across the site</h2>
      <ul className="brain-list">{group(false)}</ul>
      <h2 className="brain-group-title is-only">Brain only</h2>
      <ul className="brain-list">{group(true)}</ul>
    </div>
  )
}
