import type { ObjectId, SectionId } from '../content/site'
// Imported (not in public/) so every file gets a content hash in its name: a new
// photo can never be hidden behind a browser's cached copy of the old one.
import chairSrc from '../assets/room/chair.webp'
import depthSrc from '../assets/room/depth.png'
import room1280 from '../assets/room/room-1280.webp'
import room1920 from '../assets/room/room-1920.webp'
import room3200 from '../assets/room/room-3200.webp'
import room3840 from '../assets/room/room-3840.webp'
import still1920 from '../assets/room/room-still-1920.webp'
import still3200 from '../assets/room/room-still-3200.webp'

const crops = import.meta.glob<string>('../assets/room/crops/*.webp', { eager: true, query: '?url', import: 'default' })

export interface RoomObjectDef {
  id: ObjectId
  section: SectionId
  name: string
  /** Close-up cut from the room photo, used for tiles and panel headers. */
  crop: string
  /** Where the object sits in the room photo (0..1) and how near it is (from the depth map). */
  spot: { x: number; y: number; depth: number }
  /** Show the hover label under the dot (when a neighbor's label would overlap). */
  labelBelow?: boolean
}

const crop = (id: ObjectId) => crops[`../assets/room/crops/${id}.webp`]

// Spots measured on the 3840 x 2143 source photo; depth sampled from the depth map.
export const roomObjects: Record<ObjectId, RoomObjectDef> = {
  poster: { id: 'poster', section: 'countries', name: 'Antique sailing chart', crop: crop('poster'), spot: { x: 0.1268, y: 0.2613, depth: 0.12 } },
  tv: { id: 'tv', section: 'video', name: 'Walnut console TV', crop: crop('tv'), spot: { x: 0.0859, y: 0.4946, depth: 0.275 } },
  console: { id: 'console', section: 'games', name: 'Game console', crop: crop('console'), spot: { x: 0.1497, y: 0.679, depth: 0.246 } },
  passport: { id: 'passport', section: 'trips', name: 'Passport and journal', crop: crop('passport'), spot: { x: 0.388, y: 0.5264, depth: 0.41 } },
  laptop: { id: 'laptop', section: 'projects', name: 'Open laptop', crop: crop('laptop'), spot: { x: 0.5039, y: 0.4564, depth: 0.212 } },
  speaker: { id: 'speaker', section: 'listen', name: 'Amp speaker', crop: crop('speaker'), spot: { x: 0.6036, y: 0.4956, depth: 0.271 } },
  books: { id: 'books', section: 'writing', name: 'Books on the desk', crop: crop('books'), spot: { x: 0.6635, y: 0.4806, depth: 0.282 }, labelBelow: true },
  camera: { id: 'camera', section: 'photography', name: 'Camera', crop: crop('camera'), spot: { x: 0.7831, y: 0.2968, depth: 0.194 } },
  plaque: { id: 'plaque', section: 'youtube', name: 'Play button plaque', crop: crop('plaque'), spot: { x: 0.8518, y: 0.2613, depth: 0.164 } },
  guitar: { id: 'guitar', section: 'music', name: 'Acoustic guitar', crop: crop('guitar'), spot: { x: 0.8971, y: 0.6206, depth: 0.228 } },
  backpack: { id: 'backpack', section: 'work', name: 'Travel backpack', crop: crop('backpack'), spot: { x: 0.7383, y: 0.7513, depth: 0.542 } },
}

export const ROOM_PHOTO = {
  aspect: 3840 / 2143,
  // the room without the chair; the chair is drawn on top as its own layer
  sources: [
    { width: 1280, src: room1280 },
    { width: 1920, src: room1920 },
    { width: 3200, src: room3200 },
    { width: 3840, src: room3840 },
  ],
  // the complete photo, for browsers without WebGL
  flatSources: [
    { width: 1920, src: still1920 },
    { width: 3200, src: still3200 },
  ],
  depth: depthSrc,
  chair: { src: chairSrc, rect: { x: 0.348438, y: 0.575362, w: 0.210156, h: 0.424638 }, depth: 0.86 },
  /** The laptop's screen, which the camera zooms into. */
  laptopScreen: { x: 0.45677, y: 0.40691, w: 0.09427, h: 0.09893 },
  /** The TV and the cabinet body (legs left out, so the camera comes in close)... */
  tvUnit: { x: 0, y: 0.4223, w: 0.2383, h: 0.33 },
  /** ...and the TV's glass, where the game menu shows. */
  tvScreen: { x: 0.03776, y: 0.44704, w: 0.08776, h: 0.11619 },
  /** The window glass above the desk: hovering it shows a note about Washington. */
  window: { id: 'window', x: 0.3841, y: 0.0467, w: 0.2643, h: 0.35, depth: 0.1 },
  // 48px blur-up placeholder shown while the photo loads
  placeholder:
    'data:image/webp;base64,UklGRnoBAABXRUJQVlA4IG4BAABwCACdASowABsAPtFeqE8oJSOiJWsxABoJZACdMsJEt/q+OzFjqQzGqfxbLLvPNOwuUCUSjhnX9JjBP14Wnk5a5pvSHR73M3rDpbagANcN1oRvI9RjXQWJ9s2ZMYit81JI/BZ1M6LU+BS03lUncH5v/t8O7eLJ2RUeLBLOFbrAtKrR/CJcl25AUa+RBXnhcfGSVcqs5/kPEE9wLGU0OmPIDtSGNSQjaVVCCYUZrp9bIu0YqBXUCv0+sPAEcMppVWRb1GGT+AXSSnI6xZLFc5P9WXwaP6Zz6H9LVoZGawJsYw2RnrUJCCbuO6wuPRzQ8RvjvpNx986/4xqOtyHJAnFJSvbyDbFRHWR4IGpdGZ0xc3xki76boAsZ9RG0siZc51epiCb6EvqtwffBwKabaOWyO0pDOfyRoZKkOJO7qQLkh0PPPjHcnQkH6gvQ5wpQc4OPLCquXQoFgxfGEjfzJ9D+XKQgKUgB4er3cEdRUAA=',
}

/** Mobile grid order: recruiters first. */
export const gridOrder: ObjectId[] = ['backpack', 'laptop', 'books', 'camera', 'tv', 'console', 'plaque', 'guitar', 'speaker', 'poster', 'passport']
