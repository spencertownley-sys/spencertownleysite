// Places in the Room the camera can fly into: the laptop (its desktop) and the TV
// cabinet (the game console). The camera (roomView) and the overlay drawn on top
// both use these boxes, so the overlay lands exactly on the screen in the photo.
import { useEffect, useState } from 'react'
import { ROOM_PHOTO } from './objects'

export type ZoomTarget = 'laptop' | 'console'

/** A box on screen, in CSS pixels. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A rectangle of the photo, 0..1. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Fired on window (detail: the ZoomTarget) when the camera has finished flying in. */
export const ZOOM_ARRIVED = 'room-zoom-arrived'

const PHOTO_W = 3840
const PHOTO_H = PHOTO_W / ROOM_PHOTO.aspect

interface Margins {
  top: number
  bottom: number
  side: (w: number) => number
}

const targets: Record<ZoomTarget, { frame: Rect; screen: Rect; margins: Margins }> = {
  // the laptop screen fills the space between the top and bottom bars, bezel still in view
  laptop: { frame: ROOM_PHOTO.laptopScreen, screen: ROOM_PHOTO.laptopScreen, margins: { top: 86, bottom: 84, side: (w) => Math.max(40, w * 0.06) } },
  // the whole TV and cabinet, with a little room around them
  console: { frame: ROOM_PHOTO.tvUnit, screen: ROOM_PHOTO.tvScreen, margins: { top: 78, bottom: 72, side: () => 28 } },
}

/**
 * Where a target's frame lands: as big as fits inside the margins, then nudged so the
 * photo's own edges never come into view (the TV cabinet sits right at the left edge).
 */
export function zoomBox(target: ZoomTarget, w: number, h: number): Box {
  const { frame: r, margins: m } = targets[target]
  const aspect = (r.w * PHOTO_W) / (r.h * PHOTO_H)
  const side = m.side(w)
  const aw = Math.max(1, w - side * 2)
  const ah = Math.max(1, h - m.top - m.bottom)
  let bw = aw
  let bh = bw / aspect
  if (bh > ah) {
    bh = ah
    bw = bh * aspect
  }
  let x = (w - bw) / 2
  let y = m.top + (ah - bh) / 2
  const sx = bw / r.w
  const sy = bh / r.h
  const left = x - r.x * sx
  if (left > 0) x -= left
  const right = x + (1 - r.x) * sx
  if (right < w) x += w - right
  const top = y - r.y * sy
  if (top > 0) y -= top
  const bottom = y + (1 - r.y) * sy
  if (bottom < h) y += h - bottom
  return { x, y, w: bw, h: bh }
}

/** Where a target's screen (the part the overlay covers) lands. */
export function screenBox(target: ZoomTarget, w: number, h: number): Box {
  const { frame: r, screen: s } = targets[target]
  const b = zoomBox(target, w, h)
  return {
    x: b.x + ((s.x - r.x) / r.w) * b.w,
    y: b.y + ((s.y - r.y) / r.h) * b.h,
    w: (s.w / r.w) * b.w,
    h: (s.h / r.h) * b.h,
  }
}

export const zoomFrame = (target: ZoomTarget) => targets[target].frame

/** The screen box for a target, kept in step with the window size (null: not framed). */
export function useScreenBox(target: ZoomTarget | null) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return target ? screenBox(target, size.w, size.h) : null
}

/** True once the camera has landed on `target` (immediately when there is no camera). */
export function useArrived(target: ZoomTarget, immediate: boolean) {
  const [arrived, setArrived] = useState(immediate)
  useEffect(() => {
    if (arrived) return
    const land = (e: Event) => {
      if ((e as CustomEvent<ZoomTarget>).detail === target) setArrived(true)
    }
    window.addEventListener(ZOOM_ARRIVED, land)
    const fallback = window.setTimeout(() => setArrived(true), 2400)
    return () => {
      window.removeEventListener(ZOOM_ARRIVED, land)
      window.clearTimeout(fallback)
    }
  }, [arrived, target])
  return arrived
}
