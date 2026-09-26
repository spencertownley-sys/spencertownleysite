// Life outside the window: the trees sway a little, a few faint clouds drift, birds
// cross now and then, and every 90 seconds a sasquatch walks along the hillside.
// The shader in roomView.ts draws all of it in photo space, so it moves with the
// camera and stays behind the window frame. This file holds the where and the when.
import maskSrc from '../assets/room/window-mask.webp'
import sasquatchSrc from '../assets/room/sasquatch.webp'

/** Size of the source photo in pixels; everything below is measured on it. */
export const PHOTO_PX = { w: 3840, h: 2143 }

/**
 * The mask covers the window (photo px 1440..2520 x 60..960), at half resolution.
 * R: open sky (clouds and birds), G: foliage (sway), B: window glass, with the lamp,
 * laptop and frame cut out (the sasquatch only shows through glass).
 */
export const WINDOW_MASK = {
  src: maskSrc,
  rect: { x: 1440 / PHOTO_PX.w, y: 60 / PHOTO_PX.h, w: 1080 / PHOTO_PX.w, h: 900 / PHOTO_PX.h },
}

export const SASQUATCH = {
  src: sasquatchSrc,
  /** The atlas: 16 walk-cycle frames of 64 x 64, facing right, feet at (32, 60). */
  frames: 16,
  frameSize: 64,
  /** Photo px per sprite px: he stands about 50 px tall in the photo. */
  scale: 0.9,
  /** First walk this many seconds in, then one every `period`. */
  first: 30,
  period: 90,
  /** Photo px per second, and seconds per full stride (matched so the feet do not slide). */
  speed: 22,
  cycle: 1.25,
  /** From behind the tall tree to past the right edge of the window. */
  fromX: 2120,
  toX: 2510,
}

// The ground he walks on: a trail along the hillside, low enough that the bushes in
// front always hide his feet (measured from where the foliage tops out).
const GROUND: [number, number][] = [
  [2100, 902],
  [2285, 902],
  [2330, 889],
  [2405, 884],
  [2445, 906],
  [2520, 908],
]

function groundAt(x: number) {
  for (let i = 0; i < GROUND.length - 1; i++) {
    const [a, ya] = GROUND[i]
    const [b, yb] = GROUND[i + 1]
    if (x <= b) {
      const t = Math.max(0, (x - a) / (b - a))
      return ya + (yb - ya) * (0.5 - 0.5 * Math.cos(Math.PI * t))
    }
  }
  return GROUND[GROUND.length - 1][1]
}

// Birds cross the upper panes, well above the mountain.
const SKY = { left: 1450, right: 2520, top: 150, bottom: 430 }
export const MAX_BIRDS = 4

interface Flight {
  start: number
  duration: number
  dir: 1 | -1
  y: number
  birds: { dx: number; dy: number; size: number; phase: number }[]
}

/** A small seeded random, so the sky does the same thing on every visit. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface LifeFrame {
  /** Per bird: x, y (photo px), half wingspan (px, 0 = none), wing lift (-1..1). */
  birds: Float32Array
  /** Feet x, feet y (photo px), walk-cycle frame (0..16), facing (1 right, -1 left); null when he is not out. */
  sasquatch: [number, number, number, number] | null
}

export class WindowLife {
  private rand = rng(47)
  private flights: Flight[] = []
  private nextFlight = 6
  private out: LifeFrame = { birds: new Float32Array(MAX_BIRDS * 4), sasquatch: null }

  /** Where everything is at `t` seconds since the room opened. */
  at(t: number): LifeFrame {
    this.planBirds(t)
    const birds = this.out.birds
    birds.fill(0)
    let n = 0
    for (const f of this.flights) {
      const p = (t - f.start) / f.duration
      if (p < 0 || p > 1) continue
      const x0 = f.dir > 0 ? SKY.left - 40 : SKY.right + 40
      const x1 = f.dir > 0 ? SKY.right + 40 : SKY.left - 40
      for (const b of f.birds) {
        if (n >= MAX_BIRDS) break
        const x = x0 + (x1 - x0) * p + b.dx * f.dir
        const y = f.y + b.dy + 10 * Math.sin(t * 0.7 + b.phase)
        // flap for a beat, then glide with the wings held up a little
        const beat = (t + b.phase) % 2.6
        const lift = beat < 1.1 ? Math.sin(beat * Math.PI * 2 * 3.2) : 0.35
        birds.set([x, y, b.size, lift], n * 4)
        n++
      }
    }
    this.out.sasquatch = this.sasquatch(t)
    return this.out
  }

  private planBirds(t: number) {
    this.flights = this.flights.filter((f) => t < f.start + f.duration)
    while (t >= this.nextFlight) {
      const r = this.rand
      const count = 1 + Math.floor(r() * 3)
      const speed = 45 + r() * 25
      const birds = Array.from({ length: count }, (_, i) => ({
        dx: -i * (16 + r() * 14),
        dy: (i % 2 ? 1 : -1) * i * (5 + r() * 6),
        size: 5 + r() * 2,
        phase: r() * 3,
      }))
      this.flights.push({
        start: this.nextFlight,
        duration: (SKY.right - SKY.left + 80) / speed,
        dir: r() < 0.5 ? 1 : -1,
        y: SKY.top + r() * (SKY.bottom - SKY.top),
        birds,
      })
      this.nextFlight += 22 + r() * 26
    }
  }

  private sasquatch(t: number): LifeFrame['sasquatch'] {
    const s = SASQUATCH
    if (t < s.first) return null
    const k = Math.floor((t - s.first) / s.period)
    const walked = t - s.first - k * s.period
    const span = s.toX - s.fromX
    const duration = span / s.speed
    if (walked > duration) return null
    // every other trip goes the other way
    const facing = k % 2 === 0 ? 1 : -1
    const x = facing > 0 ? s.fromX + walked * s.speed : s.toX - walked * s.speed
    const frame = ((walked / s.cycle) * s.frames) % s.frames
    return [x, groundAt(x), frame, facing]
  }
}
