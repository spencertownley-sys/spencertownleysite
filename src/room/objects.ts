import type { ObjectId, SectionId } from '../content/site'

export interface RoomObjectDef {
  id: ObjectId
  section: SectionId
  name: string
  /** Close-up cut from the room photo, used for tiles and panel headers. */
  crop: string
  /** Where the object sits in the room photo (0..1) and how near it is (from the depth map). */
  spot: { x: number; y: number; depth: number }
}

const crop = (id: ObjectId) => `/room/crops/${id}.webp`

// Spots measured on the 3840 x 2143 source photo; depth sampled from the depth map.
export const roomObjects: Record<ObjectId, RoomObjectDef> = {
  poster: { id: 'poster', section: 'countries', name: 'Antique sailing chart', crop: crop('poster'), spot: { x: 0.1268, y: 0.2613, depth: 0.118 } },
  tv: { id: 'tv', section: 'video', name: 'Walnut console TV', crop: crop('tv'), spot: { x: 0.0859, y: 0.4946, depth: 0.282 } },
  passport: { id: 'passport', section: 'trips', name: 'Passport and journal', crop: crop('passport'), spot: { x: 0.388, y: 0.5264, depth: 0.428 } },
  laptop: { id: 'laptop', section: 'projects', name: 'Open laptop', crop: crop('laptop'), spot: { x: 0.5039, y: 0.4564, depth: 0.249 } },
  speaker: { id: 'speaker', section: 'listen', name: 'Amp speaker', crop: crop('speaker'), spot: { x: 0.6036, y: 0.4956, depth: 0.314 } },
  camera: { id: 'camera', section: 'photography', name: 'Camera', crop: crop('camera'), spot: { x: 0.7831, y: 0.2968, depth: 0.184 } },
  plaque: { id: 'plaque', section: 'youtube', name: 'Play button plaque', crop: crop('plaque'), spot: { x: 0.8518, y: 0.2613, depth: 0.153 } },
  guitar: { id: 'guitar', section: 'music', name: 'Acoustic guitar', crop: crop('guitar'), spot: { x: 0.8971, y: 0.6206, depth: 0.224 } },
  backpack: { id: 'backpack', section: 'work', name: 'Travel backpack', crop: crop('backpack'), spot: { x: 0.7383, y: 0.7513, depth: 0.545 } },
}

export const ROOM_PHOTO = {
  aspect: 3840 / 2143,
  // the room without the chair; the chair is drawn on top as its own layer
  sources: [
    { width: 1280, src: '/room/room-1280.webp' },
    { width: 1920, src: '/room/room-1920.webp' },
    { width: 3200, src: '/room/room-3200.webp' },
    { width: 3840, src: '/room/room-3840.webp' },
  ],
  // the complete photo, for browsers without WebGL
  flatSources: [
    { width: 1920, src: '/room/room-still-1920.webp' },
    { width: 3200, src: '/room/room-still-3200.webp' },
  ],
  depth: '/room/depth.png',
  chair: { src: '/room/chair.webp', rect: { x: 0.348438, y: 0.575362, w: 0.210156, h: 0.424638 }, depth: 0.86 },
  /** The laptop's screen, which the camera zooms into. */
  laptopScreen: { x: 0.45677, y: 0.40691, w: 0.09427, h: 0.09893 },
  /** The window glass above the desk: hovering it shows a note about Washington. */
  window: { id: 'window', x: 0.3841, y: 0.0467, w: 0.2643, h: 0.35, depth: 0.1 },
  // 48px blur-up placeholder shown while the photo loads
  placeholder:
    'data:image/webp;base64,UklGRnABAABXRUJQVlA4IGQBAADwBwCdASowABsAPtFWp08oJCMiKrgKAQAaCWQAnTLG/7APvlcua6qKkf4Z3b9x3qSkYQwn553V3NdKgj/l76O51HC0oCOR1JAA1w3Y9UWz2I1TqxEzpTLM8ungfck+kkJ9iOTPYEjJkC4ZD6+EyUMfe6iflrKQVDS0PTRHXnQwotmiNCYNNWM7v1dhknUo/yKhyLXH7Y71QfY50AcpDHU17UFU9UPsVImxeCc9fYyOVXXpKOXNYMvra2SJ8ybNIL1d6XqGG+37nAasdDJroV9iZ+y623Ugzq/KJBBllCUIWBmB9j3sfsMKhQdGO4aikQA7UepOLkeP/uIvusRLUbyZGa5gMx03UWv4gKqpSaf29U4wZzpJq0mrLCuYGtamiLGI4AETsKmLXC6ia5kpFkXVppi1U2y5FMX+mHS/Wx8BENczbHOWMtqXaUta0trSDG5j0Lq8KbztHRdSAJQt3xYI7EQAAA==',
}

/** Mobile grid order: recruiters first. */
export const gridOrder: ObjectId[] = ['backpack', 'laptop', 'camera', 'tv', 'plaque', 'guitar', 'speaker', 'poster', 'passport']
