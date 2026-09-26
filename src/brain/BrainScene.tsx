import { useCallback, useEffect, useRef, useState } from 'react'
import brainSvg from '../../assets/brain.svg'
import { sectionById, sections, site, type SectionId } from '../content/site'
import { fx } from '../fx/fx'
import { ambience } from '../lib/audio'
import { useMediaQuery, useReducedMotion } from '../lib/hooks'
import { supportsWebGL } from '../lib/webgl'
import { BLUE_HEX, BrainGL, VIOLET_HEX, type FrameInfo } from './brainGL'
import { brainNodes } from './nodes'

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

const colorFor = (id: SectionId) => (sectionById[id].brain.only ? VIOLET_HEX : BLUE_HEX)
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Scatters a node's label into pixels and brings it straight back, so it stays readable. */
function usePulse() {
  const active = useRef(new Set<string>())
  useEffect(() => {
    const keys = active.current
    return () => keys.forEach((k) => fx.cancel(k))
  }, [])
  return useCallback((key: string, parts: Parts, color: string, done?: () => void) => {
    if (active.current.has(key)) return done?.()
    const a = parts.anchor?.getBoundingClientRect()
    const anchor = a ? { x: a.left + a.width / 2, y: a.top + a.height / 2 } : { x: 0, y: 0 }
    const ok = fx.pulse(
      key,
      parts.texts,
      parts.lines.map((el) => ({ el, color })),
      anchor,
      () => {
        active.current.delete(key)
        parts.hide.forEach((el) => el.removeAttribute('data-fx'))
        done?.()
      },
    )
    if (!ok) return done?.()
    active.current.add(key)
    // Hide the DOM copies in the same tick the canvas takes over, so there is no flash.
    parts.hide.forEach((el) => el.setAttribute('data-fx', 'dissolved'))
    ambience.sfx('dissolve')
  }, [])
}

/** Starts the WebGL brain on a canvas, falling back to the flat artwork if WebGL is unavailable. */
function useBrainGL(canvas: React.RefObject<HTMLCanvasElement | null>, quality: 'high' | 'low', onFrame?: (f: FrameInfo) => void) {
  const reduced = useReducedMotion()
  const gl = useRef<BrainGL | null>(null)
  const frame = useRef(onFrame)
  const failed = !supportsWebGL()
  useEffect(() => {
    frame.current = onFrame
  })
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    try {
      gl.current = new BrainGL({ canvas: el, nodes: brainNodes, quality, reducedMotion: reduced, onFrame: (f) => frame.current?.(f) })
    } catch (err) {
      console.warn('WebGL brain could not start', err)
    }
    return () => {
      gl.current?.dispose()
      gl.current = null
    }
  }, [canvas, quality, reduced])
  return { gl, failed }
}

export default function BrainScene(props: Props) {
  const compact = useMediaQuery(BRAIN_COMPACT_QUERY)
  // Without WebGL there is nothing to pin labels to, so use the stacked list everywhere.
  return compact || !supportsWebGL() ? <BrainList {...props} /> : <BrainStage {...props} />
}

interface NodeEls {
  tag?: HTMLButtonElement | null
  line?: SVGLineElement | null
  dot?: SVGCircleElement | null
  ring?: SVGCircleElement | null
  group?: SVGGElement | null
  w?: number
  h?: number
}

function BrainStage({ onOpen, panelOpen }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const els = useRef<Record<string, NodeEls>>({})
  const hovering = useRef<string | null>(null)
  const pulsing = useRef(0)
  const opened = useRef<SectionId | null>(null)
  const [hover, setHover] = useState<SectionId | null>(null)
  const pulse = usePulse()

  // Closing a panel hands focus back to the label that opened it. That is not a visit,
  // so it should not pulse the label or hold the brain still; forget it shortly after.
  useEffect(() => {
    if (panelOpen) return
    const t = window.setTimeout(() => (opened.current = null), 400)
    return () => window.clearTimeout(t)
  }, [panelOpen])

  const measure = useCallback(() => {
    for (const e of Object.values(els.current)) {
      if (!e.tag) continue
      e.w = e.tag.offsetWidth
      e.h = e.tag.offsetHeight
    }
  }, [])

  useEffect(() => {
    measure()
    document.fonts?.ready.then(measure).catch(() => {})
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Place every tag next to its projected anchor, fade the ones on the far side,
  // and nudge overlapping tags apart. Runs once per rendered frame.
  const onFrame = useCallback((f: FrameInfo) => {
    const items = f.nodes.map((n) => {
      const e = els.current[n.id] ?? {}
      const vis = smooth(-0.2, 0.35, n.facing)
      const dx = n.x - f.cx
      const dy = n.y - f.cy
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len
      const uy = dy / len
      const reach = 26 + 22 * vis
      const ax = n.x + ux * reach
      const ay = n.y + uy * reach
      const s = Math.max(-1, Math.min(1, ux * 2.6))
      const w = e.w ?? 120
      const h = e.h ?? 40
      const left = ax - (w * (1 - s)) / 2
      const top = ay - h / 2 + uy * (h / 2) * (1 - Math.abs(s))
      return { n, e, vis, left, top, w, h, s, uy }
    })
    const shown = items.filter((i) => i.vis > 0.3).sort((a, b) => a.top - b.top)
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < shown.length; i++) {
        for (let j = i + 1; j < shown.length; j++) {
          const a = shown[i]
          const b = shown[j]
          const ox = Math.min(a.left + a.w, b.left + b.w) - Math.max(a.left, b.left)
          const oy = Math.min(a.top + a.h, b.top + b.h) - Math.max(a.top, b.top)
          if (ox > 0 && oy > 0) {
            const push = oy / 2 + 2
            if (a.top <= b.top) {
              a.top -= push
              b.top += push
            } else {
              a.top += push
              b.top -= push
            }
          }
        }
      }
    }
    for (const it of items) {
      const { e, n, vis: v, left, top, w, h, s, uy } = it
      if (e.tag) {
        e.tag.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`
        e.tag.style.opacity = (0.06 + 0.94 * v).toFixed(3)
        e.tag.style.pointerEvents = v > 0.5 ? 'auto' : 'none'
        e.tag.style.zIndex = String(Math.round(v * 10))
      }
      const attachX = s > 0.5 ? left : s < -0.5 ? left + w : left + (w * (1 - s)) / 2
      const attachY = Math.abs(s) > 0.5 ? top + h / 2 : uy < 0 ? top + h : top
      if (e.line) {
        e.line.setAttribute('x1', n.x.toFixed(1))
        e.line.setAttribute('y1', n.y.toFixed(1))
        e.line.setAttribute('x2', attachX.toFixed(1))
        e.line.setAttribute('y2', attachY.toFixed(1))
        e.line.style.opacity = (0.08 + 0.72 * v).toFixed(3)
      }
      if (e.dot) {
        e.dot.setAttribute('cx', n.x.toFixed(1))
        e.dot.setAttribute('cy', n.y.toFixed(1))
        e.dot.setAttribute('r', (2 + 3 * v).toFixed(2))
        e.dot.style.opacity = (0.25 + 0.75 * v).toFixed(3)
      }
      if (e.ring) {
        e.ring.setAttribute('cx', n.x.toFixed(1))
        e.ring.setAttribute('cy', n.y.toFixed(1))
        e.ring.style.opacity = (v * 0.9).toFixed(3)
      }
    }
  }, [])

  const { gl, failed } = useBrainGL(canvas, 'high', onFrame)

  const partsFor = (id: SectionId): Parts => {
    const e = els.current[id] ?? {}
    return {
      texts: e.tag ? Array.from(e.tag.querySelectorAll<HTMLElement>('[data-text]')) : [],
      lines: e.line ? [e.line] : [],
      anchor: e.dot ?? null,
      hide: [e.tag, e.group].filter(Boolean) as Element[],
    }
  }

  const resume = () => {
    if (!hovering.current && !pulsing.current) gl.current?.setPaused(false)
  }
  const enter = (id: SectionId) => {
    hovering.current = id
    gl.current?.setPaused(true)
    setHover(id)
    ambience.sfx('hover')
    pulsing.current++
    // the brain holds still until the label is back together, so the pixels land where it is
    pulse(id, partsFor(id), colorFor(id), () => {
      pulsing.current--
      resume()
    })
  }
  const leave = (id: SectionId) => {
    if (hovering.current === id) hovering.current = null
    setHover((h) => (h === id ? null : h))
    resume()
  }
  const open = (id: SectionId) => {
    opened.current = id
    ambience.sfx('open')
    onOpen(id)
  }

  const hovered = hover ? sectionById[hover] : null

  return (
    <div className="brain-scene">
      {failed ? (
        <img className="brain-fallback" src={brainSvg} alt="A glowing wireframe brain" />
      ) : (
        <canvas ref={canvas} className="brain-canvas" aria-label="A rotating holographic brain. Drag to spin it." role="img" />
      )}
      <svg className="brain-overlay" aria-hidden="true">
        {brainNodes.map((n) => (
          <g key={n.id} ref={(el) => void ((els.current[n.id] ??= {}).group = el)} style={{ color: colorFor(n.id) }} className={hover === n.id ? 'is-hover' : ''}>
            <line ref={(el) => void ((els.current[n.id] ??= {}).line = el)} stroke="currentColor" strokeWidth={1.4} />
            <circle ref={(el) => void ((els.current[n.id] ??= {}).ring = el)} r={9} className="anchor-ring" />
          </g>
        ))}
        {brainNodes.map((n) => (
          <circle key={n.id} ref={(el) => void ((els.current[n.id] ??= {}).dot = el)} r={4} className="anchor-dot" fill={colorFor(n.id)} />
        ))}
      </svg>
      <div className="brain-tags">
        {brainNodes.map((n) => {
          const s = sectionById[n.id]
          return (
            <button
              key={n.id}
              type="button"
              ref={(el) => void ((els.current[n.id] ??= {}).tag = el)}
              className={`brain-tag ${s.brain.only ? 'is-only' : ''}`}
              onPointerEnter={() => enter(n.id)}
              onPointerLeave={() => leave(n.id)}
              onFocus={() => {
                if (opened.current === n.id) opened.current = null
                else enter(n.id)
              }}
              onBlur={() => leave(n.id)}
              onClick={() => open(n.id)}
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
          <i style={{ background: BLUE_HEX }} /> also in the room
        </span>
        <span className="legend-item is-only">
          <i style={{ background: VIOLET_HEX }} /> brain only
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

/** Mobile and portrait Brain: the rotating brain up top, then a stacked list of nodes. */
function BrainList({ onOpen }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { failed } = useBrainGL(canvas, 'low')
  const pulse = usePulse()
  const refs = useRef<Record<string, HTMLLIElement | null>>({})
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // The label scatters and starts flying home, then the panel slides up over it.
  const tap = (id: SectionId) => {
    if (timer.current) return
    pulse(id, listParts(refs.current[id]), colorFor(id))
    timer.current = window.setTimeout(() => {
      timer.current = 0
      ambience.sfx('open')
      onOpen(id)
    }, 700)
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
        {failed ? <img src={brainSvg} alt="" draggable={false} /> : <canvas ref={canvas} className="brain-canvas" />}
      </div>
      <p className="intro-open brain-open">
        <i aria-hidden="true" />
        {site.openTo}. {site.openToWhere}.
      </p>
      <p className="brain-intro">{site.brainTouchHint}</p>
      <h2 className="brain-group-title">Across the site</h2>
      <ul className="brain-list">{group(false)}</ul>
      <h2 className="brain-group-title is-only">Brain only</h2>
      <ul className="brain-list">{group(true)}</ul>
    </div>
  )
}
