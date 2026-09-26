// One full-screen canvas for the effect that needs real pixels:
// Brain mode's pixel dissolve / reassemble.

import type { Mode } from '../lib/router'

interface Particle {
  hx: number
  hy: number
  x: number
  y: number
  ox: number
  oy: number
  tx: number
  ty: number
  color: string
  size: number
  delay: number
  phase: number
}

interface Group {
  particles: Particle[]
  state: 'out' | 'in'
  t0: number
  anchorX: number
  anchorY: number
  onDone?: () => void
}

const OUT_MS = 700
const IN_MS = 520

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Rasterizes a text element into particles positioned in viewport pixels. */
function sampleText(el: HTMLElement, step: number): Particle[] {
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return []
  const cs = getComputedStyle(el)
  const pad = 4
  const w = Math.ceil(rect.width) + pad * 2
  const h = Math.ceil(rect.height) + pad * 2
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  const ls = parseFloat(cs.letterSpacing)
  if (!Number.isNaN(ls) && 'letterSpacing' in g) (g as unknown as { letterSpacing: string }).letterSpacing = `${ls}px`
  g.textBaseline = 'middle'
  g.fillStyle = cs.color
  let text = el.textContent ?? ''
  if (cs.textTransform === 'uppercase') text = text.toUpperCase()
  const align = cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : 'left'
  g.textAlign = align
  g.fillText(text, align === 'right' ? w - pad : pad, h / 2 + 1)
  const data = g.getImageData(0, 0, w, h).data
  const out: Particle[] = []
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      if (data[i + 3] > 110) {
        const px = rect.left - pad + x
        const py = rect.top - pad + y
        out.push(particle(px, py, `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`, step))
      }
    }
  }
  return out
}

/** Samples points along an SVG polyline/line in viewport pixels. */
function sampleLine(el: SVGGeometryElement, color: string, spacing: number): Particle[] {
  const ctm = el.getScreenCTM()
  if (!ctm) return []
  const len = el.getTotalLength()
  const out: Particle[] = []
  const svg = el.ownerSVGElement
  if (!svg) return []
  const pt = svg.createSVGPoint()
  // spacing is in screen px; convert to user units using the CTM scale
  const scale = Math.hypot(ctm.a, ctm.b) || 1
  const stepUser = spacing / scale
  for (let d = 0; d <= len; d += stepUser) {
    const p = el.getPointAtLength(d)
    pt.x = p.x
    pt.y = p.y
    const s = pt.matrixTransform(ctm)
    out.push(particle(s.x, s.y, color, 2))
  }
  return out
}

function particle(x: number, y: number, color: string, size: number): Particle {
  return { hx: x, hy: y, x, y, ox: x, oy: y, tx: x, ty: y, color, size, delay: 0, phase: Math.random() * Math.PI * 2 }
}

class Fx {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private dpr = 1
  private raf = 0
  private mode: Mode = 'room'
  private reduced = false
  private groups = new Map<string, Group>()

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.resize()
  }

  detach() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.canvas = null
    this.ctx = null
  }

  resize() {
    const c = this.canvas
    if (!c) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.round(window.innerWidth * this.dpr)
    c.height = Math.round(window.innerHeight * this.dpr)
    this.kick()
  }

  setMode(mode: Mode) {
    this.mode = mode
  }

  setReducedMotion(r: boolean) {
    this.reduced = r
  }

  /**
   * Hides nothing by itself: the caller hides the DOM label in the same tick.
   * Returns false if the effect is unavailable (reduced motion), so the caller can fall back.
   */
  dissolve(key: string, texts: HTMLElement[], lines: { el: SVGGeometryElement; color: string }[], anchor: { x: number; y: number }): boolean {
    if (this.reduced || !this.ctx) return false
    const existing = this.groups.get(key)
    const now = performance.now()
    if (existing) {
      // reverse an in-flight reassembly from wherever the particles are
      existing.state = 'out'
      existing.t0 = now
      existing.onDone = undefined
      for (const p of existing.particles) {
        p.ox = p.x
        p.oy = p.y
      }
      this.kick()
      return true
    }
    const particles = [...texts.flatMap((el) => sampleText(el, 2)), ...lines.flatMap((l) => sampleLine(l.el, l.color, 2.5))]
    for (const p of particles) {
      const dx = p.hx - anchor.x
      const dy = p.hy - anchor.y
      const d = Math.hypot(dx, dy) || 1
      const push = 14 + Math.random() * 46
      const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6
      p.tx = p.hx + Math.cos(ang) * push + (dx / d) * 8
      p.ty = p.hy + Math.sin(ang) * push - Math.random() * 18
      p.delay = Math.random() * 160
    }
    this.groups.set(key, { particles, state: 'out', t0: now, anchorX: anchor.x, anchorY: anchor.y })
    this.draw(now)
    this.kick()
    return true
  }

  reassemble(key: string, onDone: () => void) {
    const g = this.groups.get(key)
    if (!g) {
      onDone()
      return
    }
    g.state = 'in'
    g.t0 = performance.now()
    g.onDone = onDone
    for (const p of g.particles) {
      p.ox = p.x
      p.oy = p.y
      p.delay = Math.random() * 140
    }
    this.kick()
  }

  clear(key: string) {
    this.groups.delete(key)
    this.kick()
  }

  private kick() {
    if (!this.raf && this.ctx) this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    this.raf = 0
    const busy = this.draw(now)
    if (busy) this.kick()
  }

  /** Draws one frame. Returns true while anything is still animating. */
  private draw(now: number): boolean {
    const ctx = this.ctx
    const c = this.canvas
    if (!ctx || !c) return false
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    let busy = false

    // particle groups
    for (const [key, g] of this.groups) {
      const t = now - g.t0
      let settled = true
      ctx.globalCompositeOperation = this.mode === 'brain' ? 'lighter' : 'source-over'
      for (const p of g.particles) {
        const lt = Math.max(0, t - p.delay)
        let alpha: number
        if (g.state === 'out') {
          const k = Math.min(1, lt / OUT_MS)
          const e = easeOut(k)
          // after arriving, keep a slow shimmer so the cloud feels alive
          const drift = k >= 1 ? Math.sin(now / 600 + p.phase) * 1.6 : 0
          p.x = p.ox + (p.tx - p.ox) * e + drift
          p.y = p.oy + (p.ty - p.oy) * e + Math.cos(now / 700 + p.phase) * (k >= 1 ? 1.2 : 0)
          alpha = 1 - 0.65 * e
          if (k < 1) settled = false
        } else {
          const k = Math.min(1, lt / IN_MS)
          const e = easeInOut(k)
          p.x = p.ox + (p.hx - p.ox) * e
          p.y = p.oy + (p.hy - p.oy) * e
          alpha = 0.35 + 0.65 * e
          if (k < 1) settled = false
        }
        ctx.globalAlpha = alpha * (0.75 + 0.25 * Math.sin(now / 90 + p.phase))
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      if (g.state === 'out') busy = true // keep shimmering while dissolved
      if (g.state === 'in' && settled) {
        const done = g.onDone
        this.groups.delete(key)
        done?.()
      } else if (g.state === 'in') busy = true
    }
    return busy
  }
}

export const fx = new Fx()
