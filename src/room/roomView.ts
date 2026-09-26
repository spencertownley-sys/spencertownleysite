// The photoreal Room: one wide photograph plus a depth map, rendered with a small
// WebGL shader so the camera can drift slowly through the space with real parallax
// (near things slide past faster than the far wall). Hotspots are projected with the
// same math, so they stay pinned to the objects. Without WebGL it falls back to a
// plain panning image.

export interface Spot {
  id: string
  /** Position in the photo, 0..1. */
  x: number
  y: number
  /** Relative nearness from the depth map, 0 (far) .. 1 (near). */
  depth: number
}

export interface ProjectedSpot {
  id: string
  x: number
  y: number
  /** 0 when off screen, 1 when comfortably inside it. */
  inView: number
}

export interface RoomViewOptions {
  canvas: HTMLCanvasElement
  fallback: HTMLImageElement
  sources: { width: number; src: string }[]
  depthSrc: string
  aspect: number
  spots: Spot[]
  interactive: boolean
  reducedMotion: boolean
  onFrame?: (spots: ProjectedSpot[]) => void
  onReady?: () => void
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform vec2 uShift;
uniform float uDolly;
uniform float uFocus;
uniform float uTime;
uniform vec2 uRes;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 displace(vec2 img) {
  float d = texture2D(uDepth, img).r - uFocus;
  return uShift * d + (img - uCenter) * uDolly * d;
}

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  vec2 q = uCenter + (s - 0.5) * uSize;
  // invert the parallax: find the photo point that lands on this pixel
  vec2 img = q;
  for (int i = 0; i < 6; i++) img = q - displace(img);
  vec3 col = texture2D(uImage, img).rgb;

  // sunlight breathes a little
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col *= 1.0 + 0.035 * sin(uTime * 0.45) * smoothstep(0.55, 0.95, lum);

  // dust motes drifting through the bright, sunlit areas
  float dust = 0.0;
  for (int l = 0; l < 2; l++) {
    float fl = float(l);
    vec2 grid = vec2(46.0, 26.0) * (1.0 + fl * 0.7);
    vec2 p = s * grid + vec2(uTime * (0.08 + fl * 0.05), -uTime * (0.16 + fl * 0.06));
    vec2 cell = floor(p);
    float h = hash(cell + fl * 17.0);
    vec2 pos = vec2(hash(cell + 3.1), hash(cell + 7.7)) * 0.8 + 0.1;
    pos += 0.12 * vec2(sin(uTime * 0.6 + h * 30.0), cos(uTime * 0.5 + h * 20.0));
    float d = length((fract(p) - pos) * vec2(1.0, grid.x / grid.y * (uRes.y / uRes.x) * 1.8));
    float size = 0.05 + 0.05 * hash(cell + 9.2);
    dust += step(0.62, h) * smoothstep(size, 0.0, d) * (0.5 + 0.5 * sin(uTime * 1.7 + h * 40.0));
  }
  col += vec3(1.0, 0.93, 0.8) * dust * smoothstep(0.5, 0.9, lum) * 0.5;

  // gentle vignette and grain, like a real photo
  vec2 v = vUv - 0.5;
  col *= 1.0 - 0.28 * dot(v, v) * 1.6;
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}
`

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const ease = (t: number) => t * t * (3 - 2 * t)

export class RoomView {
  private o: RoomViewOptions
  private gl: WebGLRenderingContext | null = null
  private prog: WebGLProgram | null = null
  private tex: WebGLTexture | null = null
  private dtex: WebGLTexture | null = null
  private loc: Record<string, WebGLUniformLocation | null> = {}
  private raf = 0
  private last = 0
  private time = 0
  private ready = false
  private disposed = false
  private ro: ResizeObserver
  private w = 1
  private h = 1
  private dpr = 1
  private loadedWidth = 0

  // path position along the room (0 = left end, 1 = right end), direction and state
  private u = 0.42
  private dir = 1
  private paused = false
  private dragging = false
  private dragX = 0
  private idleUntil = 0
  private mx = 0
  private my = 0
  private smx = 0
  private smy = 0

  constructor(o: RoomViewOptions) {
    this.o = o
    const gl = (o.canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false }) ||
      null) as WebGLRenderingContext | null
    if (gl) this.initGL(gl)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(o.canvas.parentElement ?? o.canvas)
    this.resize()
    if (o.interactive) {
      o.canvas.addEventListener('pointerdown', this.onDown)
      window.addEventListener('pointermove', this.onMove)
      window.addEventListener('pointerup', this.onUp)
      o.canvas.addEventListener('wheel', this.onWheel, { passive: true })
    }
    document.addEventListener('visibilitychange', this.onVisibility)
    this.raf = requestAnimationFrame(this.tick)
  }

  get webgl() {
    return !!this.gl
  }

  setPaused(p: boolean) {
    this.paused = p
  }

  /** Move along the room, for keyboard control. */
  nudge(amount: number) {
    this.u = clamp(this.u + amount, 0, 1)
    this.dir = amount >= 0 ? 1 : -1
    this.idleUntil = performance.now() + 4000
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    const c = this.o.canvas
    c.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    c.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('visibilitychange', this.onVisibility)
    const gl = this.gl
    if (gl) {
      gl.deleteTexture(this.tex)
      gl.deleteTexture(this.dtex)
      gl.deleteProgram(this.prog)
    }
  }

  /* ---------------- setup ---------------- */

  private initGL(gl: WebGLRenderingContext) {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    try {
      const p = gl.createProgram()!
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT))
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link')
      gl.useProgram(p)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      const a = gl.getAttribLocation(p, 'aPos')
      gl.enableVertexAttribArray(a)
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
      for (const n of ['uImage', 'uDepth', 'uCenter', 'uSize', 'uShift', 'uDolly', 'uFocus', 'uTime', 'uRes']) this.loc[n] = gl.getUniformLocation(p, n)
      gl.uniform1i(this.loc.uImage, 0)
      gl.uniform1i(this.loc.uDepth, 1)
      this.gl = gl
      this.prog = p
      this.tex = this.makeTexture()
      this.dtex = this.makeTexture()
      this.loadImage(this.o.depthSrc).then((img) => this.upload(this.dtex, img, 1))
    } catch (err) {
      console.warn('Room WebGL unavailable, using a flat image', err)
      this.gl = null
    }
  }

  private makeTexture() {
    const gl = this.gl!
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return t
  }

  private loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  private upload(t: WebGLTexture | null, img: HTMLImageElement, unit: number) {
    const gl = this.gl
    if (!gl || this.disposed) return
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
  }

  /** Loads the smallest photo that stays sharp at the current canvas size. */
  private pickSource() {
    const size = this.viewSize(0)
    const needed = (this.w * this.dpr) / size.x
    const sorted = [...this.o.sources].sort((a, b) => a.width - b.width)
    const pick = sorted.find((s) => s.width >= needed * 0.85) ?? sorted[sorted.length - 1]
    if (pick.width <= this.loadedWidth) return
    this.loadedWidth = pick.width
    const img = this.o.fallback
    const done = (el: HTMLImageElement) => {
      if (this.gl) this.upload(this.tex, el, 0)
      if (!this.ready) {
        this.ready = true
        this.o.onReady?.()
      }
    }
    if (this.gl) this.loadImage(pick.src).then(done, () => {})
    else {
      img.src = pick.src
      img.decode?.().then(() => done(img), () => done(img))
    }
  }

  private resize() {
    const c = this.o.canvas
    const box = c.parentElement ?? c
    this.w = Math.max(1, box.clientWidth)
    this.h = Math.max(1, box.clientHeight)
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.round(this.w * this.dpr)
    c.height = Math.round(this.h * this.dpr)
    this.gl?.viewport(0, 0, c.width, c.height)
    this.pickSource()
  }

  /* ---------------- input ---------------- */

  private onVisibility = () => {
    if (document.visibilityState === 'visible' && !this.disposed) {
      this.last = 0
      cancelAnimationFrame(this.raf)
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true
    this.dragX = e.clientX
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      this.mx = (e.clientX / window.innerWidth - 0.5) * 2
      this.my = (e.clientY / window.innerHeight - 0.5) * 2
    }
    if (!this.dragging) return
    const size = this.viewSize(0)
    const span = Math.max(0.0001, 1 - size.x)
    const dx = e.clientX - this.dragX
    this.dragX = e.clientX
    this.u = clamp(this.u - ((dx / this.w) * size.x) / span, 0, 1)
    if (dx) this.dir = dx < 0 ? 1 : -1
    this.idleUntil = performance.now() + 3500
  }

  private onUp = () => {
    this.dragging = false
  }

  private onWheel = (e: WheelEvent) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    this.nudge(d * 0.0006)
  }

  /* ---------------- camera ---------------- */

  /** Fraction of the photo visible at once (cover fit with a small overscan). */
  private viewSize(dolly: number) {
    const v = this.w / this.h
    const a = this.o.aspect
    const over = 1.07 * (1 + dolly * 0.035)
    return v < a ? { x: v / a / over, y: 1 / over } : { x: 1 / over, y: a / v / over }
  }

  private camera(dollyPhase: number) {
    const dolly = 0.5 - 0.5 * Math.cos(dollyPhase)
    const size = this.viewSize(dolly)
    const look = this.smx * 0.035
    const minX = size.x / 2 + 0.012
    const maxX = 1 - size.x / 2 - 0.012
    const cx = minX >= maxX ? 0.5 : clamp(minX + (maxX - minX) * ease(this.u) + look, minX, maxX)
    const cy = clamp(0.5 + 0.008 * Math.sin(this.time * 0.37) + this.smy * 0.012, size.y / 2 + 0.01, 1 - size.y / 2 - 0.01)
    // camera translation drives the parallax: follow the path, plus the mouse
    const t = (ease(this.u) - 0.5) * 2 + this.smx * 0.7
    const k = 0.02
    return { cx, cy, size, shiftX: -t * k, shiftY: -this.smy * k * 0.4, dolly: dolly * 0.05 }
  }

  private tick = (now: number) => {
    if (this.disposed || document.visibilityState === 'hidden') return
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0
    this.last = now
    this.time += dt

    const moving = !this.o.reducedMotion && !this.paused && !this.dragging && now > this.idleUntil
    if (moving) {
      // one slow pass across the room takes about 40 seconds, then it turns around
      this.u += this.dir * dt * 0.025
      if (this.u > 1) {
        this.u = 1
        this.dir = -1
      } else if (this.u < 0) {
        this.u = 0
        this.dir = 1
      }
    }
    const k = Math.min(1, dt * 2.5)
    this.smx += (this.mx - this.smx) * k
    this.smy += (this.my - this.smy) * k

    const cam = this.camera(this.o.reducedMotion ? 0 : this.time * 0.22)
    const gl = this.gl
    if (gl && this.ready) {
      gl.uniform2f(this.loc.uCenter, cam.cx, cam.cy)
      gl.uniform2f(this.loc.uSize, cam.size.x, cam.size.y)
      gl.uniform2f(this.loc.uShift, cam.shiftX, cam.shiftY)
      gl.uniform1f(this.loc.uDolly, cam.dolly)
      gl.uniform1f(this.loc.uFocus, 0.24)
      gl.uniform1f(this.loc.uTime, this.o.reducedMotion ? 0 : this.time)
      gl.uniform2f(this.loc.uRes, this.w, this.h)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    } else if (!gl) {
      // flat fallback: position the photo so the same region shows
      const img = this.o.fallback
      const iw = this.w / cam.size.x
      const ih = this.h / cam.size.y
      img.style.width = `${iw}px`
      img.style.height = `${ih}px`
      img.style.transform = `translate(${(-cam.cx * iw + this.w / 2).toFixed(1)}px, ${(-cam.cy * ih + this.h / 2).toFixed(1)}px)`
    }

    const cb = this.o.onFrame
    if (cb) {
      const out: ProjectedSpot[] = this.o.spots.map((s) => {
        const d = gl ? s.depth - 0.24 : 0
        const qx = s.x + cam.shiftX * d + (s.x - cam.cx) * cam.dolly * d
        const qy = s.y + cam.shiftY * d + (s.y - cam.cy) * cam.dolly * d
        const x = ((qx - cam.cx) / cam.size.x + 0.5) * this.w
        const y = ((qy - cam.cy) / cam.size.y + 0.5) * this.h
        const margin = 40
        const inView = clamp(Math.min(x - margin, this.w - margin - x, y - margin, this.h - margin - y) / 60, 0, 1)
        return { id: s.id, x, y, inView }
      })
      cb(out)
    }
    this.raf = requestAnimationFrame(this.tick)
  }
}
