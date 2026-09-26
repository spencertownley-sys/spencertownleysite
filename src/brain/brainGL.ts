// The Brain mode hero: a procedural, holographic 3D brain rendered with three.js.
// Everything is generated in code (no model files): the cortex is a sphere sculpted
// into brain proportions, with folds from a warped noise field whose zero lines glow
// as sulci. Circuit traces, particles, HUD rings and light streaks build the ambience,
// and a bloom pass gives it the glow. Node anchors are projected to screen space every
// frame so the DOM labels can follow the rotation.

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { snoise } from './noise'
import type { BrainNodeDef } from './nodes'

export const BLUE_HEX = '#3DDCFF'
export const VIOLET_HEX = '#D65CFF'
const BLUE = new THREE.Color(BLUE_HEX)
const VIOLET = new THREE.Color(VIOLET_HEX)

/** Revolutions per minute: slow enough to read the labels as they pass. */
const RPM = 2.5
const SPEED = (RPM * Math.PI * 2) / 60
const START_ANGLE = -Math.PI / 2 // frontal lobe facing left, like a textbook side view

export interface ProjectedNode {
  id: string
  x: number
  y: number
  /** -1 facing away from the camera, 1 facing it. */
  facing: number
}

export interface FrameInfo {
  width: number
  height: number
  cx: number
  cy: number
  radius: number
  nodes: ProjectedNode[]
}

export interface BrainGLOptions {
  canvas: HTMLCanvasElement
  nodes: BrainNodeDef[]
  quality: 'high' | 'low'
  reducedMotion: boolean
  onFrame?: (f: FrameInfo) => void
}

/* ------------------------------------------------------------------ */
/* Shape                                                               */
/* ------------------------------------------------------------------ */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Warped noise whose zero crossings trace meandering sulci. */
function foldField(x: number, y: number, z: number) {
  const w = 0.38
  const wx = snoise(x * 1.4 + 11.1, y * 1.4, z * 1.4) * w
  const wy = snoise(x * 1.4, y * 1.4 + 23.7, z * 1.4) * w
  const wz = snoise(x * 1.4, y * 1.4, z * 1.4 + 37.9) * w
  const f = 2.55
  return snoise((x + wx) * f, (y + wy) * f * 1.2, (z + wz) * f)
}

/** Lateral (Sylvian) fissure: separates the temporal lobe on both sides. */
function sylvian(dx: number, dy: number, dz: number) {
  // segment in the (z, y) plane from front-low to back-high
  const az = 0.62
  const ay = -0.16
  const bz = -0.18
  const by = 0.14
  const vz = bz - az
  const vy = by - ay
  const t = clamp01(((dz - az) * vz + (dy - ay) * vy) / (vz * vz + vy * vy))
  const d = Math.hypot(dz - (az + vz * t), dy - (ay + vy * t))
  return Math.exp(-((d / 0.045) ** 2)) * smoothstep(0.3, 0.6, Math.abs(dx))
}

interface SurfacePoint {
  x: number
  y: number
  z: number
  fold: number
}

/** Maps a unit direction to a point on the cortex surface. */
function cortex(dx: number, dy: number, dz: number): SurfacePoint {
  let x = dx * 0.76
  let y = dy * 0.66
  let z = dz

  // taller toward the back (parietal dome), a little lower at the front
  y += 0.08 * Math.max(0, dy) * (0.55 - dz * 0.45)
  // flatter underside
  if (y < -0.12) y = -0.12 + (y + 0.12) * 0.5
  // temporal lobes bulge down and out, forward of center
  const tl = Math.exp(-((dz - 0.12) ** 2) / 0.16) * smoothstep(0.05, -0.55, dy) * Math.abs(dx)
  x += Math.sign(dx) * 0.06 * tl
  y -= 0.17 * tl
  // lift the back underside to make room for the cerebellum
  y += 0.13 * smoothstep(-0.2, -0.85, dz) * smoothstep(0.0, -0.6, dy)
  // slightly pointed occipital pole, rounder frontal pole
  z *= 1 + 0.05 * smoothstep(-0.4, -1, dz)

  const longitudinal = Math.exp(-((dx / 0.055) ** 2)) * smoothstep(0.05, 0.45, dy)
  const lateral = sylvian(dx, dy, dz)
  const fold = foldField(dx, dy, dz) * (1 - Math.max(longitudinal, lateral))
  const gyrus = smoothstep(0.0, 0.42, Math.abs(fold))
  const r = 1 + 0.05 * (gyrus - 0.55) - 0.08 * longitudinal - 0.035 * lateral
  return { x: x * r, y: y * r, z: z * r, fold }
}

function cerebellum(dx: number, dy: number, dz: number): SurfacePoint {
  const fold = Math.sin(dy * 26 + 1.4 * snoise(dx * 2.2, dy * 2.2, dz * 2.2) + 3 * dz)
  const vermis = Math.exp(-((dx / 0.08) ** 2))
  const r = 1 + 0.025 * (smoothstep(0, 0.6, Math.abs(fold)) - 0.5) - 0.06 * vermis
  return { x: dx * 0.52 * r, y: dy * 0.27 * r - 0.37, z: dz * 0.34 * r - 0.6, fold }
}

/** Builds a displaced sphere, storing the fold value for the shader. */
function sculpt(fn: (x: number, y: number, z: number) => SurfacePoint, ws: number, hs: number) {
  const geo = new THREE.SphereGeometry(1, ws, hs)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const folds = new Float32Array(pos.count)
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const p = fn(v.x, v.y, v.z)
    pos.setXYZ(i, p.x, p.y, p.z)
    folds[i] = p.fold
  }
  geo.setAttribute('aFold', new THREE.BufferAttribute(folds, 1))
  geo.computeVertexNormals()
  return geo
}

function brainstem(segs: number) {
  const geo = new THREE.CylinderGeometry(0.09, 0.15, 0.95, segs, 24, true)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const folds = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    folds[i] = Math.sin(Math.atan2(z, x) * 14 + y * 2)
    // gentle forward curve as it descends
    pos.setZ(i, z + (0.47 - y) * 0.12)
  }
  geo.setAttribute('aFold', new THREE.BufferAttribute(folds, 1))
  geo.computeVertexNormals()
  geo.translate(0, -0.72, -0.34)
  return geo
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const holoVertex = /* glsl */ `
  attribute float aFold;
  varying float vFold;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    vFold = aFold;
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const holoFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uLine;
  uniform vec3 uBlue;
  uniform vec3 uViolet;
  varying float vFold;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float fres = pow(1.0 - facing, 2.4);

    // glowing sulci: zero crossings of the fold field
    float w = fwidth(vFold) * uLine;
    float line = 1.0 - smoothstep(0.0, w, abs(vFold));
    float halo = 1.0 - smoothstep(0.0, w * 5.0, abs(vFold));

    // violet glints scattered across the gyri
    vec3 cp = vLocal * 34.0;
    vec3 cell = floor(cp);
    float h = hash(cell);
    float d = length(fract(cp) - 0.5);
    float glint = step(0.9, h) * smoothstep(0.2, 0.02, d) * (0.45 + 0.55 * sin(uTime * 2.3 + h * 50.0));

    // slow scan band sweeping up the brain
    float band = fract(uTime * 0.09) * 2.6 - 1.4;
    float scan = smoothstep(0.05, 0.0, abs(vLocal.y - band));

    float top = 0.7 + 0.4 * clamp(vLocal.y + 0.3, 0.0, 1.0);
    vec3 deep = uBlue * vec3(0.3, 0.5, 1.0);
    vec3 bright = mix(uBlue, vec3(1.0), 0.35);
    vec3 col = bright * line * 1.25 * top;
    col += uBlue * halo * 0.1;
    col += deep * (fres * 0.9 + 0.11);
    col += uViolet * (glint * 1.5 + (1.0 - halo) * 0.035);
    col += bright * scan * 0.22;
    float a = clamp(line * 0.9 + halo * 0.12 + fres * 0.6 + glint + scan * 0.2 + 0.1, 0.0, 1.0);
    gl_FragColor = vec4(col * uIntensity, a * uIntensity);
  }
`

function holoMaterial(side: THREE.Side, intensity: number, line = 1.3) {
  return new THREE.ShaderMaterial({
    vertexShader: holoVertex,
    fragmentShader: holoFragment,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uLine: { value: line },
      uBlue: { value: BLUE },
      uViolet: { value: VIOLET },
    },
    side,
    transparent: true,
    depthWrite: side === THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  })
}

const traceVertex = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  attribute vec3 color;
  varying float vT;
  varying float vSeed;
  varying vec3 vColor;
  void main() {
    vT = aT;
    vSeed = aSeed;
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const traceFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uBase;
  varying float vT;
  varying float vSeed;
  varying vec3 vColor;
  void main() {
    float head = fract(uTime * uSpeed + vSeed);
    float pulse = smoothstep(0.14, 0.0, abs(vT - head));
    float a = uBase + pulse * 1.2;
    gl_FragColor = vec4(vColor * a, a);
  }
`

function traceMaterial(speed: number, base: number) {
  return new THREE.ShaderMaterial({
    vertexShader: traceVertex,
    fragmentShader: traceFragment,
    uniforms: { uTime: { value: 0 }, uSpeed: { value: speed }, uBase: { value: base } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

const pointsVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 color;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 40.0));
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const pointsFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  }
`

function pointsMaterial(pixelRatio: number) {
  return new THREE.ShaderMaterial({
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

const streakFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float edge = pow(1.0 - abs(vUv.x * 2.0 - 1.0), 1.6);
    float spot = exp(-pow((vUv.x - fract(uTime * 0.035 + uSeed)) * 18.0, 2.0));
    float core = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float a = (edge * 0.8 + spot * 1.4) * core * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function randomDir(r: () => number) {
  const u = r() * 2 - 1
  const t = r() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t))
}

/** Circuit traces sprouting from the cortex: out, then turning vertical, then out again. */
function circuitTraces(count: number, r: () => number) {
  const positions: number[] = []
  const ts: number[] = []
  const seeds: number[] = []
  const colors: number[] = []
  const ends: number[] = []
  const endColors: number[] = []
  for (let i = 0; i < count; i++) {
    const d = randomDir(r)
    if (d.y < -0.55) d.y *= -0.5
    d.normalize()
    const s = cortex(d.x, d.y, d.z)
    const p0 = new THREE.Vector3(s.x, s.y, s.z)
    const n = p0.clone().normalize()
    const p1 = p0.clone().addScaledVector(n, 0.05 + r() * 0.16)
    const vertical = r() < 0.72
    const p2 = p1.clone()
    if (vertical) p2.y += (p0.y >= 0 ? 1 : -1) * (0.06 + r() * 0.28)
    else p2.z += (p0.z >= 0 ? 1 : -1) * (0.06 + r() * 0.22)
    const p3 = p2.clone().addScaledVector(n, 0.03 + r() * 0.09)
    const pts = [p0, p1, p2, p3]
    const lens = [0, p0.distanceTo(p1), p1.distanceTo(p2), p2.distanceTo(p3)]
    const total = lens.reduce((a, b) => a + b, 0)
    const seed = r()
    const col = r() < 0.22 ? VIOLET : BLUE
    let acc = 0
    for (let k = 0; k < 3; k++) {
      const a = pts[k]
      const b = pts[k + 1]
      const t0 = acc / total
      acc += lens[k + 1]
      const t1 = acc / total
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
      ts.push(t0, t1)
      seeds.push(seed, seed)
      colors.push(col.r, col.g, col.b, col.r, col.g, col.b)
    }
    ends.push(p3.x, p3.y, p3.z)
    endColors.push(col.r, col.g, col.b)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1))
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return { geo, ends, endColors }
}

/** Vertical data streams falling from the brainstem. */
function dataRain(count: number, r: () => number) {
  const positions: number[] = []
  const ts: number[] = []
  const seeds: number[] = []
  const colors: number[] = []
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2
    const rad = 0.04 + r() * 0.34
    const x = Math.cos(a) * rad
    const z = -0.42 + Math.sin(a) * rad * 0.7
    const top = -1.0 - r() * 0.25
    const len = 0.5 + r() * 1.8
    const col = r() < 0.3 ? VIOLET : BLUE
    positions.push(x, top, z, x, top - len, z)
    ts.push(0, 1)
    const s = r()
    seeds.push(s, s)
    colors.push(col.r, col.g, col.b, col.r, col.g, col.b)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1))
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geo
}

function particles(positions: number[], colors: number[], sizes: number[], seeds: number[]) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
  return geo
}

function ring(inner: number, outer: number, start: number, length: number, color: THREE.Color, opacity: number) {
  return new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, Math.max(12, Math.round((length / (Math.PI * 2)) * 160)), 1, start, length),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  )
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export class BrainGL {
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  private brain = new THREE.Group()
  private hud = new THREE.Group()
  private halo = new THREE.Group()
  private spinners: { obj: THREE.Object3D; speed: number }[] = []
  private timed: THREE.ShaderMaterial[] = []
  private anchors: { id: string; local: THREE.Vector3; normal: THREE.Vector3 }[] = []
  private raf = 0
  private last = 0
  private time = 0
  private speed = SPEED
  private paused = false
  private dragging = false
  private dragX = 0
  private width = 1
  private height = 1
  private ro: ResizeObserver
  private opts: BrainGLOptions
  private tmp = new THREE.Vector3()
  private tmpN = new THREE.Vector3()
  private disposed = false

  constructor(opts: BrainGLOptions) {
    this.opts = opts
    const high = opts.quality === 'high'
    const canvas = opts.canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: high, alpha: false, powerPreference: 'high-performance' })
    const dpr = Math.min(window.devicePixelRatio || 1, high ? 2 : 1.5)
    this.renderer.setPixelRatio(dpr)
    // Clear to pure black and paint the background with a quad: the quad goes through
    // the same linear color path as everything else, so its tones land exactly.
    this.renderer.setClearColor(0x000000, 1)

    this.camera.position.set(0, 0, 6.4)
    this.camera.lookAt(0, 0, 0)

    const r = rand(20260926)

    // cortex (front surface writes depth; back surface adds a faint see-through layer)
    const cortexGeo = sculpt(cortex, high ? 340 : 220, high ? 230 : 150)
    const back = new THREE.Mesh(cortexGeo, holoMaterial(THREE.BackSide, 0.2, 1.1))
    const front = new THREE.Mesh(cortexGeo, holoMaterial(THREE.FrontSide, 0.9))
    back.renderOrder = 0
    front.renderOrder = 1
    const cereGeo = sculpt(cerebellum, high ? 180 : 120, high ? 120 : 80)
    const cereBack = new THREE.Mesh(cereGeo, holoMaterial(THREE.BackSide, 0.18, 1.1))
    const cere = new THREE.Mesh(cereGeo, holoMaterial(THREE.FrontSide, 0.8))
    const stemGeo = brainstem(high ? 64 : 40)
    const stem = new THREE.Mesh(stemGeo, holoMaterial(THREE.DoubleSide, 0.28))
    this.brain.add(back, cereBack, front, cere, stem)
    ;[back, front, cereBack, cere, stem].forEach((m) => this.timed.push(m.material as THREE.ShaderMaterial))

    // circuitry
    const traces = circuitTraces(high ? 150 : 80, r)
    const traceMat = traceMaterial(0.45, 0.2)
    this.timed.push(traceMat)
    this.brain.add(new THREE.LineSegments(traces.geo, traceMat))
    const endCount = traces.ends.length / 3
    const endPts = new THREE.Points(
      particles(
        traces.ends,
        traces.endColors,
        Array.from({ length: endCount }, () => 2 + r() * 1.2),
        Array.from({ length: endCount }, () => r()),
      ),
      pointsMaterial(dpr),
    )
    this.timed.push(endPts.material as THREE.ShaderMaterial)
    this.brain.add(endPts)

    const rain = new THREE.LineSegments(dataRain(high ? 46 : 24, r), traceMaterial(-0.35, 0.05))
    this.timed.push(rain.material as THREE.ShaderMaterial)
    this.brain.add(rain)

    // glints on the surface and a halo of dust around it
    {
      const pos: number[] = []
      const col: number[] = []
      const size: number[] = []
      const seed: number[] = []
      const n = high ? 900 : 380
      for (let i = 0; i < n; i++) {
        const d = randomDir(r)
        const s = cortex(d.x, d.y, d.z)
        const k = 1.0 + r() * 0.06
        pos.push(s.x * k, s.y * k, s.z * k)
        const c = r() < 0.35 ? VIOLET : r() < 0.5 ? BLUE.clone().lerp(new THREE.Color('#ffffff'), 0.5) : BLUE
        col.push(c.r, c.g, c.b)
        size.push(0.8 + r() * 1.6)
        seed.push(r())
      }
      const surf = new THREE.Points(particles(pos, col, size, seed), pointsMaterial(dpr))
      this.timed.push(surf.material as THREE.ShaderMaterial)
      this.brain.add(surf)
    }
    {
      const pos: number[] = []
      const col: number[] = []
      const size: number[] = []
      const seed: number[] = []
      const n = high ? 700 : 260
      for (let i = 0; i < n; i++) {
        const d = randomDir(r)
        const rad = 1.25 + Math.pow(r(), 1.6) * 1.6
        pos.push(d.x * rad * 1.3, d.y * rad * 0.85, d.z * rad)
        const c = r() < 0.4 ? VIOLET : BLUE
        col.push(c.r, c.g, c.b)
        size.push(0.5 + r() * 1.3)
        seed.push(r())
      }
      const dust = new THREE.Points(particles(pos, col, size, seed), pointsMaterial(dpr))
      this.timed.push(dust.material as THREE.ShaderMaterial)
      this.halo.add(dust)
    }

    // HUD rings framing the brain, facing the camera
    const rings: [THREE.Object3D, number][] = []
    rings.push([ring(1.66, 1.672, 0, Math.PI * 2, BLUE, 0.35), 0])
    {
      const g = new THREE.Group()
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2
        g.add(ring(1.55, 1.578, a, (Math.PI * 2) / 72 / 2.2, BLUE, 0.3))
      }
      rings.push([g, 0.06])
    }
    {
      const g = new THREE.Group()
      g.add(ring(1.78, 1.81, 0.5, 0.9, VIOLET, 0.75))
      g.add(ring(1.78, 1.81, 3.6, 0.6, VIOLET, 0.75))
      g.add(ring(1.74, 1.75, 2.0, 1.2, BLUE, 0.4))
      rings.push([g, -0.035])
    }
    {
      const g = new THREE.Group()
      g.add(ring(2.1, 2.112, 0.2, Math.PI * 1.45, BLUE, 0.28))
      g.add(ring(2.16, 2.19, 4.9, 0.5, VIOLET, 0.55))
      rings.push([g, 0.02])
    }
    {
      const g = new THREE.Group()
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2
        g.add(ring(1.36, 1.4, a, 0.03, i % 6 === 0 ? VIOLET : BLUE, 0.5))
      }
      rings.push([g, -0.08])
    }
    for (const [obj, speed] of rings) {
      this.hud.add(obj)
      if (speed) this.spinners.push({ obj, speed })
    }
    this.hud.position.set(0, 0.05, -0.9)

    // deep navy backdrop with a faint blue haze behind the brain
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
        fragmentShader: `varying vec2 vUv;
          void main(){
            vec2 p = vUv - vec2(0.5, 0.52);
            float d = length(p * vec2(1.25, 1.0));
            vec3 edge = vec3(0.0012, 0.0017, 0.0036);
            vec3 mid = vec3(0.0036, 0.0078, 0.03);
            gl_FragColor = vec4(mix(mid, edge, smoothstep(0.0, 0.62, d)), 1.0);
          }`,
        depthWrite: false,
        depthTest: false,
      }),
    )
    backdrop.frustumCulled = false
    backdrop.renderOrder = -10

    // soft glow behind the brain
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `varying vec2 vUv; uniform vec3 uA; uniform vec3 uB;
          void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.2);
          vec3 c = mix(uB, uA, smoothstep(0.0, 0.6, 1.0 - d)); gl_FragColor = vec4(c * a * 0.1, a * 0.1); }`,
        uniforms: { uA: { value: BLUE }, uB: { value: VIOLET } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    glow.position.set(0, 0.05, -1.6)

    // horizontal light streaks across the scene
    const streaks = new THREE.Group()
    const streakDefs: [number, number, THREE.Color, number][] = [
      [1.28, 0.012, BLUE, 0.35],
      [0.98, 0.008, VIOLET, 0.3],
      [-1.02, 0.01, BLUE, 0.3],
      [-1.42, 0.016, VIOLET, 0.4],
      [-1.62, 0.008, BLUE, 0.22],
      [1.6, 0.008, VIOLET, 0.22],
    ]
    for (const [y, h, color, opacity] of streakDefs) {
      const m = new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: streakFragment,
        uniforms: { uTime: { value: 0 }, uSeed: { value: r() }, uColor: { value: color }, uOpacity: { value: opacity } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      this.timed.push(m)
      const s = new THREE.Mesh(new THREE.PlaneGeometry(16, h), m)
      s.position.set(0, y, -2.2)
      streaks.add(s)
    }

    this.brain.position.set(0, 0.18, 0)
    this.brain.rotation.set(0.1, START_ANGLE, 0)
    this.halo.position.copy(this.brain.position)
    this.scene.add(backdrop, glow, streaks, this.hud, this.halo, this.brain)

    // node anchors on the surface
    for (const n of opts.nodes) {
      let local: THREE.Vector3
      if (n.point) local = new THREE.Vector3(...n.point)
      else {
        const d = new THREE.Vector3(...n.dir).normalize()
        const s = cortex(d.x, d.y, d.z)
        local = new THREE.Vector3(s.x, s.y, s.z).multiplyScalar(1.01)
      }
      this.anchors.push({ id: n.id, local, normal: new THREE.Vector3(...n.dir).normalize() })
    }

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), high ? 0.75 : 0.65, 0.22, 0.16)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()

    canvas.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.raf = requestAnimationFrame(this.tick)
  }

  /** Stops the rotation instantly (hovering a node) or lets it ease back in. */
  setPaused(paused: boolean) {
    this.paused = paused
    if (paused) this.speed = 0
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.opts.canvas.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    })
    this.composer.dispose()
    this.renderer.dispose()
  }

  private resize() {
    const canvas = this.opts.canvas
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    this.width = w
    this.height = h
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h)
    this.camera.aspect = w / h
    // keep the brain (about 2.3 units wide and 2.2 tall with the stem) comfortably in frame
    const fov = THREE.MathUtils.degToRad(this.camera.fov)
    const needH = 3.3 / (2 * Math.tan(fov / 2))
    const needW = 3.5 / (2 * Math.tan(fov / 2) * this.camera.aspect)
    this.camera.position.z = Math.max(needH, needW, 5.2)
    this.camera.updateProjectionMatrix()
    this.points.forEach((m) => (m.uniforms.uPixelRatio.value = this.renderer.getPixelRatio()))
  }

  private get points() {
    return this.timed.filter((m) => 'uPixelRatio' in m.uniforms)
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible' && !this.disposed) {
      this.last = performance.now()
      cancelAnimationFrame(this.raf)
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true
    this.dragX = e.clientX
    this.opts.canvas.setPointerCapture?.(e.pointerId)
  }

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return
    this.brain.rotation.y += (e.clientX - this.dragX) * 0.006
    this.dragX = e.clientX
  }

  private onUp = () => {
    this.dragging = false
  }

  private tick = (now: number) => {
    if (this.disposed) return
    if (document.visibilityState === 'hidden') return
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0
    this.last = now
    this.time += dt

    const target = this.paused || this.opts.reducedMotion ? 0 : SPEED
    this.speed += (target - this.speed) * Math.min(1, dt * 2.2)
    if (!this.dragging) this.brain.rotation.y += this.speed * dt
    this.halo.rotation.y += this.speed * 0.25 * dt
    if (!this.opts.reducedMotion) for (const s of this.spinners) s.obj.rotation.z += s.speed * dt

    for (const m of this.timed) m.uniforms.uTime.value = this.time
    this.composer.render()
    this.emit()
    this.raf = requestAnimationFrame(this.tick)
  }

  private emit() {
    const cb = this.opts.onFrame
    if (!cb) return
    this.brain.updateMatrixWorld()
    const w = this.width
    const h = this.height
    const toScreen = (v: THREE.Vector3) => {
      v.project(this.camera)
      return { x: (v.x + 1) * 0.5 * w, y: (1 - v.y) * 0.5 * h }
    }
    const c = toScreen(this.tmp.copy(this.brain.position))
    const edge = toScreen(this.tmp.set(this.brain.position.x + 1, this.brain.position.y, this.brain.position.z))
    const nodes: ProjectedNode[] = this.anchors.map((a) => {
      const world = this.tmp.copy(a.local).applyMatrix4(this.brain.matrixWorld)
      const toCam = this.tmpN.copy(this.camera.position).sub(world).normalize()
      const nWorld = a.normal.clone().applyQuaternion(this.brain.quaternion)
      const facing = nWorld.dot(toCam)
      const p = toScreen(world)
      return { id: a.id, x: p.x, y: p.y, facing }
    })
    cb({ width: w, height: h, cx: c.x, cy: c.y, radius: Math.abs(edge.x - c.x), nodes })
  }
}
