// Ambient sound for both modes, generated with the Web Audio API so the site
// ships without audio files. Browsers only allow audio after a user gesture,
// so sound is "on" by default and starts on the first click, tap, or key press.
// Real loops can replace the generated beds via `audio` in content/site.ts.

import { audio as audioConfig } from '../content/site'
import type { Mode } from './router'

type Sfx = 'hover' | 'open' | 'close' | 'toggle-brain' | 'toggle-room' | 'dissolve'

const MUTE_KEY = 'st-muted'
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function noiseBuffer(ctx: AudioContext, seconds: number, kind: 'white' | 'brown' | 'crackle'): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    if (kind === 'white') d[i] = Math.random() * 2 - 1
    else if (kind === 'brown') {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = last * 3.5
    } else {
      // sparse vinyl-style clicks
      d[i] = Math.random() < 0.00035 ? (Math.random() * 2 - 1) * rand(0.3, 1) : d[i - 1] ? d[i - 1] * 0.55 : 0
    }
  }
  return buf
}

function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

interface Bed {
  out: GainNode
  start(): void
  stop(): void
}

/** Warm, lo-fi room: soft chords, a little vinyl, the odd music-box note. */
function roomBed(ctx: AudioContext, wet: AudioNode): Bed {
  const out = ctx.createGain()
  out.gain.value = 0
  const timers: number[] = []
  const sources: AudioScheduledSourceNode[] = []

  const tone = ctx.createBufferSource()
  tone.buffer = noiseBuffer(ctx, 3, 'brown')
  tone.loop = true
  const toneLp = ctx.createBiquadFilter()
  toneLp.type = 'lowpass'
  toneLp.frequency.value = 380
  const toneGain = ctx.createGain()
  toneGain.gain.value = 0.05
  tone.connect(toneLp).connect(toneGain).connect(out)

  const crackle = ctx.createBufferSource()
  crackle.buffer = noiseBuffer(ctx, 5, 'crackle')
  crackle.loop = true
  const crackleHp = ctx.createBiquadFilter()
  crackleHp.type = 'highpass'
  crackleHp.frequency.value = 1800
  const crackleGain = ctx.createGain()
  crackleGain.gain.value = 0.07
  crackle.connect(crackleHp).connect(crackleGain).connect(out)

  const padFilter = ctx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 1000
  padFilter.Q.value = 0.4
  const padGain = ctx.createGain()
  padGain.gain.value = 0.055
  padFilter.connect(padGain)
  padGain.connect(out)
  padGain.connect(wet)
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.06
  const lfoAmt = ctx.createGain()
  lfoAmt.gain.value = 280
  lfo.connect(lfoAmt).connect(padFilter.frequency)

  const chords = [
    [53, 57, 60, 64],
    [52, 55, 59, 62],
    [50, 53, 60, 64],
    [48, 52, 55, 59],
  ]
  let ci = 0
  const playChord = () => {
    const t = ctx.currentTime
    const len = 9
    for (const n of chords[ci % chords.length]) {
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.value = midi(n)
        o.detune.value = det
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.5, t + 2.5)
        g.gain.setValueAtTime(0.5, t + len - 3)
        g.gain.linearRampToValueAtTime(0, t + len)
        o.connect(g).connect(padFilter)
        o.start(t)
        o.stop(t + len + 0.1)
      }
    }
    ci++
  }

  const pentatonic = [72, 74, 76, 79, 81, 84]
  const pluck = () => {
    const t = ctx.currentTime
    const f = midi(pick(pentatonic))
    const o = ctx.createOscillator()
    o.frequency.value = f
    const o2 = ctx.createOscillator()
    o2.frequency.value = f * 2
    const g = ctx.createGain()
    const g2 = ctx.createGain()
    g2.gain.value = 0.15
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.03, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8)
    o.connect(g)
    o2.connect(g2).connect(g)
    g.connect(out)
    g.connect(wet)
    o.start(t)
    o2.start(t)
    o.stop(t + 2)
    o2.stop(t + 2)
    timers.push(window.setTimeout(pluck, rand(1800, 5200)))
  }

  return {
    out,
    start() {
      tone.start()
      crackle.start()
      lfo.start()
      sources.push(tone, crackle, lfo)
      playChord()
      timers.push(window.setInterval(playChord, 8000))
      timers.push(window.setTimeout(pluck, 2500))
    },
    stop() {
      timers.forEach((id) => {
        window.clearInterval(id)
        window.clearTimeout(id)
      })
      sources.forEach((s) => s.stop())
    },
  }
}

/** Deep drone, slow filter sweep, a shimmer on top, and sparse data blips. */
function brainBed(ctx: AudioContext, wet: AudioNode): Bed {
  const out = ctx.createGain()
  out.gain.value = 0
  const timers: number[] = []
  const sources: AudioScheduledSourceNode[] = []

  const drone = ctx.createGain()
  drone.gain.value = 0.07
  drone.connect(out)
  for (const [f, amt] of [
    [55, 0.9],
    [82.41, 0.55],
    [110, 0.35],
  ] as const) {
    const o = ctx.createOscillator()
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = amt
    const l = ctx.createOscillator()
    l.frequency.value = rand(0.03, 0.09)
    const la = ctx.createGain()
    la.gain.value = amt * 0.35
    l.connect(la).connect(g.gain)
    o.connect(g).connect(drone)
    sources.push(o, l)
  }

  const sweep = ctx.createBiquadFilter()
  sweep.type = 'lowpass'
  sweep.frequency.value = 520
  sweep.Q.value = 5
  const sweepGain = ctx.createGain()
  sweepGain.gain.value = 0.018
  sweep.connect(sweepGain)
  sweepGain.connect(out)
  sweepGain.connect(wet)
  for (const [f, det] of [
    [110, -7],
    [164.81, 7],
  ] as const) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.detune.value = det
    o.connect(sweep)
    sources.push(o)
  }
  const sl = ctx.createOscillator()
  sl.frequency.value = 0.035
  const sla = ctx.createGain()
  sla.gain.value = 360
  sl.connect(sla).connect(sweep.frequency)
  sources.push(sl)

  const shimmer = ctx.createGain()
  shimmer.gain.value = 0.006
  shimmer.connect(wet)
  shimmer.connect(out)
  for (const n of [81, 88, 95]) {
    const o = ctx.createOscillator()
    o.frequency.value = midi(n)
    const g = ctx.createGain()
    g.gain.value = 0.5
    const l = ctx.createOscillator()
    l.frequency.value = rand(0.05, 0.15)
    const la = ctx.createGain()
    la.gain.value = 0.5
    l.connect(la).connect(g.gain)
    o.connect(g).connect(shimmer)
    sources.push(o, l)
  }

  const echo = ctx.createDelay(1)
  echo.delayTime.value = 0.32
  const fb = ctx.createGain()
  fb.gain.value = 0.35
  echo.connect(fb).connect(echo)
  echo.connect(wet)
  const blipNotes = [81, 83, 85, 88, 90, 93]
  const blip = () => {
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.frequency.value = midi(pick(blipNotes))
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.018, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    const p = ctx.createStereoPanner()
    p.pan.value = rand(-0.8, 0.8)
    o.connect(g).connect(p)
    p.connect(out)
    p.connect(echo)
    o.start(t)
    o.stop(t + 0.12)
    timers.push(window.setTimeout(blip, rand(900, 3600)))
  }

  return {
    out,
    start() {
      sources.forEach((s) => s.start())
      timers.push(window.setTimeout(blip, 1500))
    },
    stop() {
      timers.forEach((id) => window.clearTimeout(id))
      sources.forEach((s) => s.stop())
    },
  }
}

/** Plays a looping file through the same bed gain, for when real audio exists. */
function trackBed(ctx: AudioContext, src: string): Bed {
  const out = ctx.createGain()
  out.gain.value = 0
  const el = new Audio(src)
  el.loop = true
  el.crossOrigin = 'anonymous'
  ctx.createMediaElementSource(el).connect(out)
  return {
    out,
    start: () => void el.play().catch(() => {}),
    stop: () => el.pause(),
  }
}

class Ambience {
  muted = readMuted()
  private mode: Mode = 'room'
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private wet: GainNode | null = null
  private beds: Partial<Record<Mode, Bed>> = {}
  private listeners = new Set<() => void>()

  get started() {
    return this.ctx?.state === 'running'
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit() {
    this.listeners.forEach((l) => l())
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock = () => {
    if (this.muted) return
    if (!this.ctx) this.build()
    const ctx = this.ctx
    if (ctx && ctx.state !== 'running' && document.visibilityState === 'visible') {
      ctx.resume().then(() => this.emit(), () => {})
    }
  }

  private build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(comp).connect(ctx.destination)
    const verb = ctx.createConvolver()
    verb.buffer = impulse(ctx, 3.2, 2.6)
    const wet = ctx.createGain()
    wet.gain.value = 0.55
    wet.connect(verb).connect(master)
    this.master = master
    this.wet = wet

    const room = audioConfig.roomTrack ? trackBed(ctx, audioConfig.roomTrack) : roomBed(ctx, wet)
    const brain = audioConfig.brainTrack ? trackBed(ctx, audioConfig.brainTrack) : brainBed(ctx, wet)
    room.out.connect(master)
    brain.out.connect(master)
    room.start()
    brain.start()
    this.beds = { room, brain }
    this.applyMode(0.01)
    master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8)

    ctx.addEventListener('statechange', () => this.emit())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void ctx.suspend()
      else if (!this.muted) void ctx.resume()
    })
  }

  private applyMode(timeConstant: number) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    this.beds.room?.out.gain.setTargetAtTime(this.mode === 'room' ? 1 : 0, t, timeConstant)
    this.beds.brain?.out.gain.setTargetAtTime(this.mode === 'brain' ? 1 : 0, t, timeConstant)
  }

  setMode(mode: Mode) {
    if (mode === this.mode) return
    this.mode = mode
    this.applyMode(0.45)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
    const ctx = this.ctx
    if (muted) {
      if (ctx && this.master) {
        this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
        window.setTimeout(() => this.muted && void ctx.suspend(), 400)
      }
    } else {
      this.unlock()
      if (ctx && this.master) {
        void ctx.resume()
        this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.3)
      }
    }
    this.emit()
  }

  sfx(kind: Sfx) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.muted || ctx.state !== 'running') return
    const t = ctx.currentTime
    const env = (g: GainNode, peak: number, len: number) => {
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(peak, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    }
    const tone = (type: OscillatorType, f0: number, f1: number, len: number, peak: number, delay = 0) => {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(f0, t + delay)
      o.frequency.exponentialRampToValueAtTime(f1, t + delay + len)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t + delay)
      g.gain.linearRampToValueAtTime(peak, t + delay + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + len)
      o.connect(g).connect(master)
      if (this.wet) g.connect(this.wet)
      o.start(t + delay)
      o.stop(t + delay + len + 0.05)
    }
    const noise = (f0: number, f1: number, len: number, peak: number, q = 1) => {
      const s = ctx.createBufferSource()
      s.buffer = noiseBuffer(ctx, len + 0.05, 'white')
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = q
      bp.frequency.setValueAtTime(f0, t)
      bp.frequency.exponentialRampToValueAtTime(f1, t + len)
      const g = ctx.createGain()
      env(g, peak, len)
      s.connect(bp).connect(g).connect(master)
      s.start(t)
      s.stop(t + len + 0.05)
    }
    const brain = this.mode === 'brain'
    switch (kind) {
      case 'hover':
        if (brain) tone('sine', 1400, 2100, 0.06, 0.025)
        else tone('sine', 560, 380, 0.08, 0.06)
        break
      case 'dissolve':
        noise(5200, 2400, 0.35, 0.03, 2.5)
        break
      case 'open':
        if (brain) tone('sine', 320, 1250, 0.28, 0.035)
        else {
          tone('triangle', midi(79), midi(79), 0.12, 0.05)
          tone('triangle', midi(84), midi(84), 0.18, 0.05, 0.08)
        }
        break
      case 'close':
        if (brain) tone('sine', 1100, 360, 0.2, 0.025)
        else tone('triangle', midi(76), midi(72), 0.16, 0.04)
        break
      case 'toggle-brain':
        noise(400, 5000, 0.6, 0.05, 1.2)
        tone('sine', 110, 55, 0.7, 0.05)
        break
      case 'toggle-room':
        noise(5000, 500, 0.6, 0.05, 1.2)
        tone('triangle', midi(72), midi(72), 0.25, 0.04, 0.15)
        break
    }
  }
}

export const ambience = new Ambience()

/** Starts audio on the first user gesture anywhere on the page. */
export function installAudioUnlock() {
  const events = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const
  const handler = () => {
    ambience.unlock()
    if (ambience.started || ambience.muted) {
      // keep listening while muted so un-muting later still has a gesture path
      if (ambience.started) events.forEach((e) => window.removeEventListener(e, handler, true))
    }
  }
  events.forEach((e) => window.addEventListener(e, handler, true))
}
