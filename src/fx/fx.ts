// One full-screen canvas for the two effects that need real pixels:
// the cursor trail and Brain mode's pixel dissolve / reassemble.

import type { Mode } from '../lib/router'
import { DEFAULT_TRAIL, type TrailStyle } from '../lib/trail'

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

interface TrailPoint {
  x: number
  y: number
  t: number
  /** Distance travelled by the cursor so far, for dashes that stay put. */
  d: number
}

interface Mark {
  x: number
  y: number
  t: number
}

/** How long each trail style keeps a point. */
const TRAIL_MS: Record<TrailStyle, number> = { ribbon: 420, ink: 900, route: 1500, ripple: 0, glow: 650, none: 0 }
const RING_MS = 900
const WAYPOINT_MS = 1500
const DASH = [7, 6]
const OUT_MS = 700
const IN_MS = 520

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function sprite(color: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, color)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

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
  private trail: TrailPoint[] = []
  private trailStyle: TrailStyle = DEFAULT_TRAIL
  private travelled = 0
  private rings: Mark[] = []
  private lastRing: { x: number; y: number } | null = null
  private waypoints: Mark[] = []
  private nextWaypoint = 140
  private groups = new Map<string, Group>()
  private sprites: Record<string, HTMLCanvasElement> = {}

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.sprites = {
      blue: sprite('rgba(61,220,255,0.55)', 96),
      violet: sprite('rgba(214,92,255,0.42)', 96),
      warm: sprite('rgba(217,164,65,0.22)', 96),
    }
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
    if (r) this.clearTrail()
  }

  setTrail(style: TrailStyle) {
    this.trailStyle = style
    this.clearTrail()
  }

  private clearTrail() {
    this.trail = []
    this.rings = []
    this.waypoints = []
    this.lastRing = null
    this.kick()
  }

  pointer(x: number, y: number) {
    if (this.reduced || this.trailStyle === 'none') return
    const now = performance.now()
    const last = this.trail[this.trail.length - 1]
    const step = last ? Math.hypot(x - last.x, y - last.y) : 0
    if (last && step < 1.5) return
    this.travelled += step
    this.trail.push({ x, y, t: now, d: this.travelled })
    if (this.trail.length > 90) this.trail.shift()
    if (this.trailStyle === 'ripple') {
      const lr = this.lastRing
      if (!lr || Math.hypot(x - lr.x, y - lr.y) > 38) {
        this.rings.push({ x, y, t: now })
        this.lastRing = { x, y }
        if (this.rings.length > 30) this.rings.shift()
      }
    }
    if (this.trailStyle === 'route' && this.travelled >= this.nextWaypoint) {
      this.waypoints.push({ x, y, t: now })
      this.nextWaypoint = this.travelled + 150
    }
    this.kick()
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

    if (this.drawTrail(ctx, now)) busy = true

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

  /* ---------------- cursor trails ---------------- */

  /** Draws the cursor trail in the current style. Returns true while it is still fading. */
  private drawTrail(ctx: CanvasRenderingContext2D, now: number): boolean {
    const style = this.trailStyle
    const life = TRAIL_MS[style]
    this.trail = this.trail.filter((p) => now - p.t < Math.max(life, 1))
    this.rings = this.rings.filter((r) => now - r.t < RING_MS)
    this.waypoints = this.waypoints.filter((w) => now - w.t < WAYPOINT_MS)
    if (!this.trail.length && !this.rings.length && !this.waypoints.length) return false
    const brain = this.mode === 'brain'
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = brain ? 'lighter' : 'source-over'
    if (style === 'glow') this.drawGlow(ctx, now, brain)
    else if (style === 'ribbon') this.drawRibbon(ctx, now, brain)
    else if (style === 'ink') this.drawInk(ctx, now, brain)
    else if (style === 'route') this.drawRoute(ctx, now, brain)
    else if (style === 'ripple') this.drawRipples(ctx, now, brain)
    ctx.restore()
    if (style === 'ripple') this.trail = []
    return true
  }

  /** Fade for point i: older points and the tail end both fade out. */
  private fade(i: number, now: number) {
    const n = this.trail.length
    const age = 1 - (now - this.trail[i].t) / TRAIL_MS[this.trailStyle]
    const pos = n > 1 ? i / (n - 1) : 1
    return Math.max(0, Math.min(age, 0.15 + pos))
  }

  /** Smooth curve segment ending at point i (midpoint to midpoint). */
  private segment(ctx: CanvasRenderingContext2D, i: number) {
    const p = this.trail
    const a = p[i - 1]
    const b = p[i]
    const pre = i > 1 ? p[i - 2] : a
    ctx.beginPath()
    ctx.moveTo((pre.x + a.x) / 2, (pre.y + a.y) / 2)
    if (i === p.length - 1) ctx.quadraticCurveTo(a.x, a.y, b.x, b.y)
    else ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
    ctx.stroke()
  }

  /** The original: soft glowing dots. */
  private drawGlow(ctx: CanvasRenderingContext2D, now: number, brain: boolean) {
    const n = this.trail.length
    for (let i = 0; i < n; i++) {
      const p = this.trail[i]
      const life = 1 - (now - p.t) / TRAIL_MS.glow
      const r = (brain ? 34 : 30) * (0.45 + 0.55 * life)
      ctx.globalAlpha = life * (brain ? 0.55 : 0.9)
      const s = brain ? (i % 3 === 0 ? this.sprites.violet : this.sprites.blue) : this.sprites.warm
      ctx.drawImage(s, p.x - r, p.y - r, r * 2, r * 2)
    }
  }

  /** A thin streak of light that tapers off behind the cursor, like a long exposure. */
  private drawRibbon(ctx: CanvasRenderingContext2D, now: number, brain: boolean) {
    const n = this.trail.length
    const passes = brain
      ? [
          { w: 9, a: 0.22, c: (t: number) => (t > 0.5 ? '#3ddcff' : '#d65cff') },
          { w: 2.4, a: 1, c: () => '#dffaff' },
        ]
      : [
          { w: 13, a: 0.34, c: () => '#ff8a33' },
          { w: 5, a: 0.5, c: () => '#ffc27a' },
          { w: 2.4, a: 1, c: () => '#fffaf0' },
        ]
    for (const pass of passes) {
      for (let i = 1; i < n; i++) {
        const f = this.fade(i, now)
        if (f <= 0) continue
        ctx.globalAlpha = pass.a * f
        ctx.lineWidth = pass.w * (0.2 + 0.8 * f)
        ctx.strokeStyle = pass.c(i / (n - 1))
        this.segment(ctx, i)
      }
    }
  }

  /** A fountain pen line: thicker when the cursor slows, thinner when it rushes. */
  private drawInk(ctx: CanvasRenderingContext2D, now: number, brain: boolean) {
    const p = this.trail
    ctx.strokeStyle = brain ? '#c9f4ff' : '#3a2616'
    for (let i = 1; i < p.length; i++) {
      const f = this.fade(i, now)
      if (f <= 0) continue
      const dt = Math.max(1, p[i].t - p[i - 1].t)
      const speed = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) / dt
      const nib = Math.max(1, Math.min(4.2, 4.4 - speed * 1.6))
      ctx.globalAlpha = (brain ? 0.8 : 0.78) * f
      ctx.lineWidth = nib * (0.4 + 0.6 * f)
      this.segment(ctx, i)
    }
  }

  /** A dashed route like the ones on the sailing chart, with waypoints dropped along the way. */
  private drawRoute(ctx: CanvasRenderingContext2D, now: number, brain: boolean) {
    const p = this.trail
    const period = DASH[0] + DASH[1]
    ctx.setLineDash(DASH)
    ctx.strokeStyle = brain ? '#3ddcff' : '#b3402e'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'butt'
    for (let i = 1; i < p.length; i++) {
      const f = this.fade(i, now)
      if (f <= 0) continue
      ctx.globalAlpha = 0.9 * f
      // dashes are anchored to the distance travelled, so they stay put instead of crawling
      ctx.lineDashOffset = p[i - 1].d % period
      ctx.beginPath()
      ctx.moveTo(p[i - 1].x, p[i - 1].y)
      ctx.lineTo(p[i].x, p[i].y)
      ctx.stroke()
    }
    ctx.setLineDash([])
    for (const w of this.waypoints) {
      const k = (now - w.t) / WAYPOINT_MS
      const pop = Math.min(1, k * 6)
      ctx.globalAlpha = 1 - k
      ctx.beginPath()
      ctx.arc(w.x, w.y, 4.2 * (0.6 + 0.4 * pop), 0, Math.PI * 2)
      ctx.fillStyle = brain ? '#05070a' : '#fff8ec'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = brain ? '#d65cff' : '#b3402e'
      ctx.stroke()
    }
  }

  /** Rings spreading out behind the cursor, like a finger drawn across still water. */
  private drawRipples(ctx: CanvasRenderingContext2D, now: number, brain: boolean) {
    for (const r of this.rings) {
      const k = (now - r.t) / RING_MS
      const e = 1 - Math.pow(1 - k, 3)
      const radius = 3 + 26 * e
      const a = (1 - k) * 0.85
      ctx.beginPath()
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2)
      if (!brain) {
        ctx.globalAlpha = a * 0.35
        ctx.lineWidth = 3.2
        ctx.strokeStyle = '#3a2616'
        ctx.stroke()
      }
      ctx.globalAlpha = a
      ctx.lineWidth = 1.5
      ctx.strokeStyle = brain ? '#3ddcff' : '#fffaf0'
      ctx.stroke()
    }
  }
}

export const fx = new Fx()
