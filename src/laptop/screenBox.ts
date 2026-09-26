import { ROOM_PHOTO } from '../room/objects'

/** Fired on window when the camera has finished flying into the laptop screen. */
export const LAPTOP_ARRIVED = 'laptop-arrived'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

const PHOTO_W = 3840
const PHOTO_H = PHOTO_W / ROOM_PHOTO.aspect
const S = ROOM_PHOTO.laptopScreen

/** Width over height of the laptop screen, in real pixels. */
export const SCREEN_ASPECT = (S.w * PHOTO_W) / (S.h * PHOTO_H)

/**
 * Where the laptop screen lands once the camera has flown in: as big as fits between the
 * top and bottom bars, so the bezel and a little of the room stay in view around it.
 * The camera (roomView) and the desktop overlay both use this, so they line up exactly.
 */
export function laptopScreenBox(w: number, h: number): Box {
  const top = 86
  const bottom = 84
  const side = Math.max(40, w * 0.06)
  const aw = Math.max(1, w - side * 2)
  const ah = Math.max(1, h - top - bottom)
  let bw = aw
  let bh = bw / SCREEN_ASPECT
  if (bh > ah) {
    bh = ah
    bw = bh * SCREEN_ASPECT
  }
  return { x: (w - bw) / 2, y: top + (ah - bh) / 2, w: bw, h: bh }
}
