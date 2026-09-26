// The photoreal Room: one wide photograph plus a depth map, rendered with a small
// WebGL shader so the camera can drift slowly through the space with real parallax
// (near things slide past faster than the far wall). The chair is a separate cut-out
// layer drawn at its own depth, so it moves as one solid piece instead of smearing
// into the rug behind it. Hotspots and hover zones are projected with the same math,
// so they stay pinned to the objects. Without WebGL it falls back to a plain panning image.
// The view out the window has a little life of its own (see windowLife.ts).

import { MAX_BIRDS, PHOTO_PX, SASQUATCH, WINDOW_MASK, WindowLife } from './windowLife'

export interface Spot {
  id: string
  /** Position in the photo, 0..1. */
  x: number
  y: number
  /** Relative nearness from the depth map, 0 (far) .. 1 (near). */
  depth: number
}

export interface Zone {
  id: string
  /** Rectangle in the photo, 0..1. */
  x: number
  y: number
  w: number
  h: number
  depth: number
}

export interface ProjectedSpot {
  id: string
  x: number
  y: number
  /** 0 when off screen, 1 when comfortably inside it. */
  inView: number
}

export interface ProjectedZone {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface Cutout {
  src: string
  /** Where the cut-out sits in the photo, 0..1. */
  rect: { x: number; y: number; w: number; h: number }
  depth: number
}

export interface RoomViewOptions {
  canvas: HTMLCanvasElement
  fallback: HTMLImageElement
  /** Photo for the WebGL view (without the cut-out). */
  sources: { width: number; src: string }[]
  /** Complete photo for the no-WebGL fallback. */
  flatSources: { width: number; src: string }[]
  depthSrc: string
  cutout?: Cutout
  aspect: number
  spots: Spot[]
  zones?: Zone[]
  interactive: boolean
  reducedMotion: boolean
  /** Open on the whole room, then ease in and start drifting. */
  intro: boolean
  onFrame?: (spots: ProjectedSpot[], zones: ProjectedZone[]) => void
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
uniform sampler2D uCut;
uniform sampler2D uWin;
uniform sampler2D uSq;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform vec2 uShift;
uniform float uDolly;
uniform float uFocus;
uniform vec4 uCutRect;
uniform float uCutDepth;
uniform float uCutOn;
uniform float uLife;
uniform float uTime;
uniform vec4 uWinRect;
uniform vec4 uSqPos;
uniform float uSqOn;
uniform vec4 uBirds[${MAX_BIRDS}];
varying vec2 vUv;

const vec2 PX = vec2(${PHOTO_PX.w}.0, ${PHOTO_PX.h}.0);

vec2 displace(vec2 img) {
  float d = texture2D(uDepth, img).r - uFocus;
  return uShift * d + (img - uCenter) * uDolly * d;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  vec2 q = uCenter + (s - 0.5) * uSize;
  // invert the parallax: find the photo point that lands on this pixel
  vec2 img = q;
  for (int i = 0; i < 6; i++) img = q - displace(img);

  // the sasquatch atlas has mipmaps, so it is sampled outside any branch
  vec2 P = img * PX;
  vec2 sp = vec2(32.0 + (P.x - uSqPos.x) / ${SASQUATCH.scale} * uSqPos.w, 60.0 + (P.y - uSqPos.y) / ${SASQUATCH.scale});
  vec2 spc = clamp(sp, vec2(0.5), vec2(63.5));
  float f0 = floor(uSqPos.z);
  float f1 = mod(f0 + 1.0, ${SASQUATCH.frames}.0);
  vec4 sq = mix(texture2D(uSq, vec2((f0 * 64.0 + spc.x) / ${SASQUATCH.frames * SASQUATCH.frameSize}.0, spc.y / 64.0)),
                texture2D(uSq, vec2((f1 * 64.0 + spc.x) / ${SASQUATCH.frames * SASQUATCH.frameSize}.0, spc.y / 64.0)), fract(uSqPos.z));

  vec3 col;
  vec2 wu = (img - uWinRect.xy) / uWinRect.zw;
  if (uLife > 0.5 && wu.x > 0.0 && wu.y > 0.0 && wu.x < 1.0 && wu.y < 1.0) {
    vec3 m = texture2D(uWin, wu).rgb;
    float t = uTime;

    // trees: a slow breeze, a pixel or two at most, in gusts that roll across the view
    float gust = 0.55 + 0.45 * sin(t * 0.21 + P.x * 0.0021) * sin(t * 0.13 + 1.7);
    vec2 sway = vec2(
      sin(t * 0.9 + P.x * 0.011 + P.y * 0.004) * 0.65 + sin(t * 1.63 + P.x * 0.023 - P.y * 0.012) * 0.35,
      0.3 * sin(t * 1.21 + P.x * 0.017 + P.y * 0.006));
    col = texture2D(uImage, img + sway * (1.8 * gust * m.g) / PX).rgb;

    // the sasquatch, behind anything leafy, softened by the air between
    float inSprite = step(0.0, sp.x) * step(sp.x, 64.0) * step(0.0, sp.y) * step(sp.y, 64.0);
    float lum = dot(col, vec3(0.3, 0.59, 0.11));
    float leafy = max(smoothstep(0.725, 0.627, lum), smoothstep(0.086, 0.165, col.r - col.b));
    float k = uSqOn * inSprite * m.b * (1.0 - leafy) * smoothstep(62.0, 55.0, sp.y);
    sq *= k;
    sq.rgb = sq.rgb * 0.72 + vec3(0.84, 0.83, 0.83) * sq.a * 0.28;
    col = col * (1.0 - sq.a) + sq.rgb;

    // birds: tiny dark flecks with flapping wings, only against open sky
    float bird = 0.0;
    for (int i = 0; i < ${MAX_BIRDS}; i++) {
      vec4 b = uBirds[i];
      if (b.z > 0.0) {
        vec2 d = P - b.xy;
        float tip = -(0.12 + 0.5 * b.w) * b.z;
        float dist = min(segment(d, vec2(0.0), vec2(-b.z, tip)), segment(d, vec2(0.0), vec2(b.z, tip)));
        bird = max(bird, 1.0 - smoothstep(0.35, 1.15, dist));
      }
    }
    col = mix(col, vec3(0.3, 0.29, 0.31), bird * 0.6 * smoothstep(0.25, 0.7, m.r));

    // three thin wisps of cloud, drifting across the upper panes every few minutes
    float detail = fbm(vec2(P.x / 90.0 - t * 0.02, P.y / 32.0));
    float cloud = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec3 c = i == 0 ? vec3(1600.0, 210.0, 230.0) : i == 1 ? vec3(2150.0, 330.0, 300.0) : vec3(2600.0, 170.0, 180.0);
      float cx = mod(c.x + t * 4.0 - 1250.0, 1300.0) + 1250.0;
      vec2 d = vec2((P.x - cx) / c.z, (P.y - c.y) / (c.z * 0.14));
      float shape = exp(-dot(d, d) * 2.2);
      cloud = max(cloud, shape * smoothstep(0.3, 0.72, detail + shape * 0.3 - fi * 0.02));
    }
    col = mix(col, vec3(1.0, 0.985, 0.965), cloud * m.r * 0.4);
  } else {
    col = texture2D(uImage, img).rgb;
  }

  // the cut-out is flat, at one depth, so it inverts exactly
  if (uCutOn > 0.5) {
    float dc = uCutDepth - uFocus;
    vec2 ci = (q - uShift * dc + uCenter * uDolly * dc) / (1.0 + uDolly * dc);
    vec2 cu = (ci - uCutRect.xy) / uCutRect.zw;
    if (cu.x > 0.0 && cu.y > 0.0 && cu.x < 1.0 && cu.y < 1.0) {
      vec4 c = texture2D(uCut, cu); // premultiplied on upload
      col = col * (1.0 - c.a) + c.rgb;
    }
  }

  // gentle, static vignette
  vec2 v = vUv - 0.5;
  col *= 1.0 - 0.25 * dot(v, v) * 1.6;
  gl_FragColor = vec4(col, 1.0);
}
`

const FOCUS_DEPTH = 0.24
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const ease = (t: number) => t * t * (3 - 2 * t)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Cam {
  cx: number
  cy: number
  size: { x: number; y: number }
  shiftX: number
  shiftY: number
  dolly: number
}

export class RoomView {
  private o: RoomViewOptions
  private gl: WebGLRenderingContext | null = null
  private prog: WebGLProgram | null = null
  private tex: WebGLTexture | null = null
  private dtex: WebGLTexture | null = null
  private ctex: WebGLTexture | null = null
  private wtex: WebGLTexture | null = null
  private stex: WebGLTexture | null = null
  private cutReady = false
  private lifeReady = 0
  private life = new WindowLife()
  /** Seconds of life outside the window; it holds still while the camera is zoomed all the way in. */
  private lifeTime = 0
  private loc: Record<string, WebGLUniformLocation | null> = {}
  private raf = 0
  private last = 0
  private time = 0
  private ready = false
  private readyAt = -1
  private disposed = false
  private ro: ResizeObserver
  private w = 1
  private h = 1
  private dpr = 1
  private loadedWidth = 0

  // path position along the room (0 = left end, 1 = right end); u eases toward goal
  private u = 0.5
  private goal = 0.5
  private dir = -1
  private paused = false
  private dragging = false
  private dragX = 0
  private idleUntil = 0
  private mx = 0
  private my = 0
  private smx = 0
  private smy = 0

  // zoom into a rectangle of the photo (the laptop screen)
  private focusRect: { x: number; y: number; w: number; h: number } | null = null
  private focusFrom = 0
  private focusTo = 0
  private focusStart = 0
  private focusDur = 1
  private focusDone: (() => void) | null = null
  private focusVal = 0
  private focusFit: ((w: number, h: number) => { x: number; y: number; w: number; h: number }) | null = null
  /** Canvas size last drawn while fully zoomed in; the frame is static then, so skip redraws. */
  private focusDrawn = ''
  /** Bumped on every texture upload, so a sharper photo arriving mid-zoom gets drawn. */
  private uploads = 0
  private drawnAt = 0

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
      window.addEventListener('pointercancel', this.onUp)
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
    this.goal = clamp(this.goal + amount, 0, 1)
    this.dir = amount >= 0 ? 1 : -1
    this.idleUntil = performance.now() + 4000
    this.skipIntro()
  }

  /**
   * Zoom the camera until `rect` (a region of the photo) fills the screen, or back
   * out with null. `fit` places the rect in a given screen box instead (in px), so
   * some of its surroundings stay visible. `instant` jumps straight there.
   */
  focus(
    rect: { x: number; y: number; w: number; h: number } | null,
    opts: { instant?: boolean; done?: () => void; fit?: (w: number, h: number) => { x: number; y: number; w: number; h: number } } = {},
  ) {
    if (rect) {
      this.focusRect = rect
      this.focusFit = opts.fit ?? null
      this.loadLargest()
    }
    const to = rect ? 1 : 0
    const instant = opts.instant || this.o.reducedMotion
    this.focusFrom = instant ? to : this.focusVal
    this.focusTo = to
    this.focusStart = performance.now()
    this.focusDur = (rect ? 1250 : 1000) * Math.max(0.35, Math.abs(to - this.focusVal))
    this.focusDone = opts.done ?? null
    if (instant) this.focusVal = to
    this.skipIntro()
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    const c = this.o.canvas
    c.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    c.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('visibilitychange', this.onVisibility)
    const gl = this.gl
    if (gl) {
      gl.deleteTexture(this.tex)
      gl.deleteTexture(this.dtex)
      gl.deleteTexture(this.ctex)
      gl.deleteTexture(this.wtex)
      gl.deleteTexture(this.stex)
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
      const names = ['uImage', 'uDepth', 'uCut', 'uWin', 'uSq', 'uCenter', 'uSize', 'uShift', 'uDolly', 'uFocus', 'uCutRect', 'uCutDepth', 'uCutOn']
      const lifeNames = ['uLife', 'uTime', 'uWinRect', 'uSqPos', 'uSqOn', 'uBirds']
      for (const n of [...names, ...lifeNames]) this.loc[n] = gl.getUniformLocation(p, n)
      gl.uniform1i(this.loc.uImage, 0)
      gl.uniform1i(this.loc.uDepth, 1)
      gl.uniform1i(this.loc.uCut, 2)
      gl.uniform1i(this.loc.uWin, 3)
      gl.uniform1i(this.loc.uSq, 4)
      gl.uniform1f(this.loc.uFocus, FOCUS_DEPTH)
      gl.uniform1f(this.loc.uCutOn, 0)
      gl.uniform1f(this.loc.uLife, 0)
      const wr = WINDOW_MASK.rect
      gl.uniform4f(this.loc.uWinRect, wr.x, wr.y, wr.w, wr.h)
      this.gl = gl
      this.prog = p
      this.tex = this.makeTexture()
      this.dtex = this.makeTexture()
      this.ctex = this.makeTexture()
      this.wtex = this.makeTexture()
      this.stex = this.makeTexture()
      // until the window textures load, their units need something complete to sample
      for (const [unit, t] of [[3, this.wtex], [4, this.stex]] as const) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
      }
      if (!this.o.reducedMotion) {
        this.loadImage(WINDOW_MASK.src).then((img) => {
          this.upload(this.wtex, img, 3, false)
          this.lifeLoaded()
        }, () => {})
        this.loadImage(SASQUATCH.src).then((img) => {
          if (!this.gl || this.disposed) return
          this.upload(this.stex, img, 4, true)
          // it is drawn much smaller than the atlas, so give it mipmaps to keep it from shimmering
          this.gl.generateMipmap(this.gl.TEXTURE_2D)
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR)
          this.lifeLoaded()
        }, () => {})
      }
      this.loadImage(this.o.depthSrc).then((img) => this.upload(this.dtex, img, 1, false), () => {})
      const cut = this.o.cutout
      if (cut) {
        gl.uniform4f(this.loc.uCutRect, cut.rect.x, cut.rect.y, cut.rect.w, cut.rect.h)
        gl.uniform1f(this.loc.uCutDepth, cut.depth)
        this.loadImage(cut.src).then((img) => {
          if (!this.gl || this.disposed) return
          this.upload(this.ctex, img, 2, true)
          this.cutReady = true
          this.gl.uniform1f(this.loc.uCutOn, 1)
        }, () => {})
      }
    } catch (err) {
      console.warn('Room WebGL unavailable, using a flat image', err)
      this.gl = null
    }
  }

  /** The window comes alive once both its mask and the sasquatch are in. */
  private lifeLoaded() {
    if (!this.gl || this.disposed) return
    if (++this.lifeReady === 2) this.gl.uniform1f(this.loc.uLife, 1)
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

  private upload(t: WebGLTexture | null, img: HTMLImageElement, unit: number, alpha: boolean) {
    const gl = this.gl
    if (!gl || this.disposed) return
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, alpha)
    const fmt = alpha ? gl.RGBA : gl.RGB
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, img)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    this.uploads++
  }

  /** Loads the smallest photo that stays sharp at the current canvas size. */
  private pickSource() {
    const size = this.viewSize(this.steadyZoom())
    const needed = (this.w * this.dpr) / size.x
    const list = this.gl ? this.o.sources : this.o.flatSources
    const sorted = [...list].sort((a, b) => a.width - b.width)
    const pick = sorted.find((s) => s.width >= needed * 0.85) ?? sorted[sorted.length - 1]
    if (pick.width <= this.loadedWidth) return
    this.loadedWidth = pick.width
    const img = this.o.fallback
    const done = (el: HTMLImageElement) => {
      if (this.gl) this.upload(this.tex, el, 0, false)
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

  /** Zooming in shows the photo much larger, so fetch the sharpest copy. */
  private loadLargest() {
    if (!this.gl) return
    const best = [...this.o.sources].sort((a, b) => b.width - a.width)[0]
    if (!best || best.width <= this.loadedWidth) return
    this.loadedWidth = best.width
    this.loadImage(best.src).then((el) => this.upload(this.tex, el, 0, false), () => {})
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

  private onDown = (e: PointerEvent) => this.beginDrag(e.clientX)

  /** Start dragging through the room (also used by overlays that sit on the canvas). */
  beginDrag(clientX: number) {
    if (this.focusVal > 0 || !this.o.interactive) return
    this.dragging = true
    this.dragX = clientX
    this.skipIntro()
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      this.mx = (e.clientX / window.innerWidth - 0.5) * 2
      this.my = (e.clientY / window.innerHeight - 0.5) * 2
    }
    if (!this.dragging) return
    const size = this.viewSize(this.zoom())
    const span = Math.max(0.0001, 1 - size.x)
    const dx = e.clientX - this.dragX
    this.dragX = e.clientX
    this.goal = clamp(this.goal - ((dx / this.w) * size.x) / span, 0, 1)
    if (dx) this.dir = dx < 0 ? 1 : -1
    this.idleUntil = performance.now() + 3500
  }

  private onUp = () => {
    this.dragging = false
  }

  private onWheel = (e: WheelEvent) => {
    if (this.focusVal > 0) return
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    this.nudge(d * 0.0006)
  }

  /* ---------------- camera ---------------- */

  /** Seconds the whole room stays in view before the camera eases in. */
  private static INTRO_HOLD = 2.4
  private static INTRO_EASE = 3.6

  private skipIntro() {
    // any deliberate move ends the opening hold, but the zoom still eases in
    if (this.readyAt >= 0 && this.time - this.readyAt < RoomView.INTRO_HOLD) this.readyAt = this.time - RoomView.INTRO_HOLD
  }

  /** How far in the settled camera sits: about 80% of the room's width on wide screens. */
  private steadyZoom() {
    const coverX = Math.min(1, this.w / this.h / this.o.aspect)
    return Math.max(1.07, coverX / Math.min(0.8, coverX / 1.07))
  }

  private introProgress() {
    if (!this.o.intro) return 1
    if (this.readyAt < 0) return 0
    return clamp((this.time - this.readyAt - RoomView.INTRO_HOLD) / RoomView.INTRO_EASE, 0, 1)
  }

  /** Current zoom: 1 shows the whole photo (cover fit). */
  private zoom() {
    const steady = this.steadyZoom()
    if (this.o.reducedMotion && this.o.intro) return 1.03
    return 1.03 + (steady - 1.03) * easeInOut(this.introProgress())
  }

  /** Fraction of the photo visible at once. */
  private viewSize(zoom: number) {
    const v = this.w / this.h
    const a = this.o.aspect
    return v < a ? { x: v / a / zoom, y: 1 / zoom } : { x: 1 / zoom, y: a / v / zoom }
  }

  private roomCamera(): Cam {
    const breathe = this.o.reducedMotion ? 0 : 0.5 - 0.5 * Math.cos(this.time * 0.2)
    const size = this.viewSize(this.zoom() * (1 + breathe * 0.02))
    const look = this.smx * 0.015
    const minX = size.x / 2 + 0.012
    const maxX = 1 - size.x / 2 - 0.012
    const cx = minX >= maxX ? 0.5 : clamp(minX + (maxX - minX) * ease(this.u) + look, minX, maxX)
    const sway = this.o.reducedMotion ? 0 : 0.006 * Math.sin(this.time * 0.3)
    const cy = clamp(0.5 + sway + this.smy * 0.008, size.y / 2 + 0.01, 1 - size.y / 2 - 0.01)
    // camera translation drives the parallax: follow the path, plus a little of the mouse
    const intro = this.introProgress()
    const t = (ease(this.u) - 0.5) * 2 * intro + this.smx * 0.3
    const k = 0.012
    return { cx, cy, size, shiftX: -t * k, shiftY: -this.smy * k * 0.3, dolly: breathe * 0.03 }
  }

  /** Blend from the room camera to one where `focusRect` fills the screen. */
  private camera(): Cam {
    const base = this.roomCamera()
    const f = this.focusVal
    const r = this.focusRect
    if (f <= 0 || !r) return base
    const v = this.w / this.h
    const a = this.o.aspect
    let sx: number
    let tx: number
    let ty: number
    const box = this.focusFit?.(this.w, this.h)
    if (box) {
      // scale and center so the rect lands exactly on `box`
      sx = (r.w * this.w) / box.w
      const sy = (sx * a) / v
      tx = r.x + r.w / 2 - ((box.x + box.w / 2) / this.w - 0.5) * sx
      ty = r.y + r.h / 2 - ((box.y + box.h / 2) / this.h - 0.5) * sy
    } else {
      // biggest screen-shaped box inside the rect, so the rect covers the whole view
      sx = r.w
      const sy = (sx * a) / v
      if (sy > r.h) sx = (r.h * v) / a
      sx *= 0.96
      tx = r.x + r.w / 2
      ty = r.y + r.h / 2
    }
    // zoom about the one point that stays put, so the move reads as flying straight in
    const ratio = sx / base.size.x
    const s = Math.exp(Math.log(base.size.x) + (Math.log(sx) - Math.log(base.size.x)) * f) / base.size.x
    const px = ratio === 1 ? tx : (tx - base.cx * ratio) / (1 - ratio)
    const py = ratio === 1 ? ty : (ty - base.cy * ratio) / (1 - ratio)
    return {
      cx: px + (base.cx - px) * s,
      cy: py + (base.cy - py) * s,
      size: { x: base.size.x * s, y: base.size.y * s },
      shiftX: base.shiftX * (1 - f),
      shiftY: base.shiftY * (1 - f),
      dolly: base.dolly * (1 - f),
    }
  }

  private project(x: number, y: number, depth: number, cam: Cam) {
    const d = this.gl ? depth - FOCUS_DEPTH : 0
    const qx = x + cam.shiftX * d + (x - cam.cx) * cam.dolly * d
    const qy = y + cam.shiftY * d + (y - cam.cy) * cam.dolly * d
    return { x: ((qx - cam.cx) / cam.size.x + 0.5) * this.w, y: ((qy - cam.cy) / cam.size.y + 0.5) * this.h }
  }

  private tick = (now: number) => {
    if (this.disposed || document.visibilityState === 'hidden') return
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0
    this.last = now
    this.time += dt
    if (this.ready && this.readyAt < 0) this.readyAt = this.time

    // focus tween
    if (this.focusVal !== this.focusTo || this.focusDone) {
      const p = clamp((now - this.focusStart) / this.focusDur, 0, 1)
      this.focusVal = this.focusFrom + (this.focusTo - this.focusFrom) * easeInOut(p)
      if (p >= 1) {
        this.focusVal = this.focusTo
        const cb = this.focusDone
        this.focusDone = null
        cb?.()
      }
    }

    const settled = this.introProgress() > 0
    const moving = !this.o.reducedMotion && !this.paused && !this.dragging && now > this.idleUntil && settled && this.focusVal === 0
    if (moving) {
      // one slow pass across the room takes about a minute, then it turns around
      this.goal += this.dir * dt * 0.017
      if (this.goal > 1) {
        this.goal = 1
        this.dir = -1
      } else if (this.goal < 0) {
        this.goal = 0
        this.dir = 1
      }
    }
    this.u += (this.goal - this.u) * Math.min(1, dt * 2.2)
    // the mouse only steers gently, and catches up slowly
    const k = Math.min(1, dt * 0.9)
    this.smx += (this.mx - this.smx) * k
    this.smy += (this.my - this.smy) * k

    // the world outside keeps going, except while the camera is all the way in (the frame is static then)
    if (this.focusVal < 1) this.lifeTime += dt

    const cam = this.camera()
    const gl = this.gl
    // fully zoomed in the frame stops moving, so only refresh it a few times a second
    const sizeKey = `${this.o.canvas.width}x${this.o.canvas.height}x${this.uploads}`
    const still = this.focusVal === 1 && this.focusDrawn === sizeKey && now - this.drawnAt < 250
    if (gl && this.ready && !still) {
      this.focusDrawn = this.focusVal === 1 ? sizeKey : ''
      this.drawnAt = now

      gl.uniform2f(this.loc.uCenter, cam.cx, cam.cy)
      gl.uniform2f(this.loc.uSize, cam.size.x, cam.size.y)
      gl.uniform2f(this.loc.uShift, cam.shiftX, cam.shiftY)
      gl.uniform1f(this.loc.uDolly, cam.dolly)
      gl.uniform1f(this.loc.uCutOn, this.cutReady ? 1 : 0)
      if (this.lifeReady === 2) {
        const life = this.life.at(this.lifeTime)
        gl.uniform1f(this.loc.uTime, this.lifeTime)
        gl.uniform4fv(this.loc.uBirds, life.birds)
        gl.uniform1f(this.loc.uSqOn, life.sasquatch ? 1 : 0)
        if (life.sasquatch) gl.uniform4fv(this.loc.uSqPos, life.sasquatch)
      }
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
      // dots fade out near the edges; narrow phones get a thinner edge so more of them stay tappable
      const margin = Math.min(40, this.w * 0.05)
      const fade = Math.min(60, this.w * 0.08)
      const spots: ProjectedSpot[] = this.o.spots.map((s) => {
        const p = this.project(s.x, s.y, s.depth, cam)
        const inView = clamp(Math.min(p.x - margin, this.w - margin - p.x, p.y - margin, this.h - margin - p.y) / fade, 0, 1)
        return { id: s.id, x: p.x, y: p.y, inView: inView * (1 - this.focusVal) }
      })
      const zones: ProjectedZone[] = (this.o.zones ?? []).map((z) => {
        const a = this.project(z.x, z.y, z.depth, cam)
        const b = this.project(z.x + z.w, z.y + z.h, z.depth, cam)
        return { id: z.id, x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }
      })
      cb(spots, zones)
    }
    this.raf = requestAnimationFrame(this.tick)
  }
}
