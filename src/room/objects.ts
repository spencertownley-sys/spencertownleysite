import tv from '../../assets/tv.svg'
import camera from '../../assets/camera.svg'
import laptop from '../../assets/laptop.svg'
import plaque from '../../assets/play-button-plaque.svg'
import backpack from '../../assets/backpack.svg'
import poster from '../../assets/travel-poster.svg'
import passport from '../../assets/passport-journal.svg'
import guitar from '../../assets/guitar.svg'
import speaker from '../../assets/bt-speaker.svg'
import type { ObjectId, SectionId } from '../content/site'

export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export interface RoomObjectDef {
  id: ObjectId
  section: SectionId
  name: string
  src: string
  /** Tight bounds of the drawing inside the 2048 x 2048 source artboard. */
  crop: Crop
}

// Crops measured from the path geometry of each SVG, padded slightly.
const pad = (c: Crop, p = 14): Crop => ({ x: c.x - p, y: c.y - p, w: c.w + p * 2, h: c.h + p * 2 })

export const roomObjects: Record<ObjectId, RoomObjectDef> = {
  tv: { id: 'tv', section: 'video', name: 'Retro TV', src: tv, crop: pad({ x: 264, y: 232, w: 1528, h: 1540 }) },
  camera: { id: 'camera', section: 'photography', name: 'Camera', src: camera, crop: pad({ x: 206, y: 283, w: 1639, h: 1471 }) },
  laptop: { id: 'laptop', section: 'projects', name: 'Open laptop', src: laptop, crop: pad({ x: 227, y: 350, w: 1593, h: 1368 }) },
  plaque: { id: 'plaque', section: 'youtube', name: 'Play button plaque', src: plaque, crop: pad({ x: 689, y: 364, w: 670, h: 1321 }) },
  backpack: { id: 'backpack', section: 'work', name: 'Backpack', src: backpack, crop: pad({ x: 310, y: 213, w: 1422, h: 1588 }) },
  poster: { id: 'poster', section: 'countries', name: 'Travel poster', src: poster, crop: pad({ x: 380, y: 169, w: 1344, h: 1723 }) },
  passport: { id: 'passport', section: 'trips', name: 'Passport and journal', src: passport, crop: pad({ x: 244, y: 234, w: 1562, h: 1583 }) },
  guitar: { id: 'guitar', section: 'music', name: 'Guitar', src: guitar, crop: pad({ x: 343, y: 166, w: 1485, h: 1589 }) },
  speaker: { id: 'speaker', section: 'listen', name: 'Bluetooth speaker', src: speaker, crop: pad({ x: 264, y: 299, w: 1522, h: 1479 }) },
}

export type Layer = 'wall' | 'floor'

export interface Placement {
  id: ObjectId
  /** Left edge and bottom edge in scene units, plus width. Height follows the art. */
  x: number
  bottom: number
  w: number
  layer: Layer
  rotate?: number
  /** Stacking order within the layer. */
  z?: number
}

export interface SceneLayout {
  width: number
  height: number
  floorY: number
  placements: Placement[]
}

export const landscape: SceneLayout = {
  width: 1600,
  height: 1000,
  floorY: 668,
  placements: [
    { id: 'poster', x: 118, bottom: 408, w: 196, layer: 'wall', rotate: -2 },
    { id: 'camera', x: 1168, bottom: 338, w: 196, layer: 'wall' },
    { id: 'plaque', x: 1398, bottom: 338, w: 104, layer: 'wall', z: 1 },
    { id: 'tv', x: 132, bottom: 716, w: 272, layer: 'floor', z: 2 },
    { id: 'passport', x: 574, bottom: 566, w: 134, layer: 'floor', z: 2 },
    { id: 'laptop', x: 720, bottom: 568, w: 258, layer: 'floor', z: 2 },
    { id: 'speaker', x: 990, bottom: 566, w: 108, layer: 'floor', z: 2 },
    { id: 'guitar', x: 1300, bottom: 772, w: 236, layer: 'floor', z: 1 },
    { id: 'backpack', x: 1062, bottom: 852, w: 190, layer: 'floor', z: 3 },
  ],
}

export const portrait: SceneLayout = {
  width: 1000,
  height: 1400,
  floorY: 930,
  placements: [
    { id: 'poster', x: 70, bottom: 470, w: 200, layer: 'wall', rotate: -2 },
    { id: 'camera', x: 616, bottom: 594, w: 196, layer: 'wall' },
    { id: 'plaque', x: 846, bottom: 594, w: 104, layer: 'wall', z: 1 },
    { id: 'passport', x: 78, bottom: 836, w: 134, layer: 'floor', z: 2 },
    { id: 'laptop', x: 222, bottom: 838, w: 250, layer: 'floor', z: 2 },
    { id: 'speaker', x: 482, bottom: 836, w: 104, layer: 'floor', z: 2 },
    { id: 'guitar', x: 690, bottom: 968, w: 236, layer: 'floor', z: 1 },
    { id: 'tv', x: 104, bottom: 1188, w: 272, layer: 'floor', z: 3 },
    { id: 'backpack', x: 630, bottom: 1250, w: 200, layer: 'floor', z: 4 },
  ],
}

/** Mobile grid order: recruiters first. */
export const gridOrder: ObjectId[] = ['backpack', 'laptop', 'camera', 'tv', 'plaque', 'guitar', 'speaker', 'poster', 'passport']
