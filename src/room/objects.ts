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

// Spots measured on the 3840 x 1648 source photo; depth sampled from the depth map.
export const roomObjects: Record<ObjectId, RoomObjectDef> = {
  poster: { id: 'poster', section: 'countries', name: 'Travel poster', crop: crop('poster'), spot: { x: 0.1276, y: 0.176, depth: 0.293 } },
  tv: { id: 'tv', section: 'video', name: 'Vintage TV', crop: crop('tv'), spot: { x: 0.099, y: 0.4248, depth: 0.289 } },
  passport: { id: 'passport', section: 'trips', name: 'Passport and journal', crop: crop('passport'), spot: { x: 0.3885, y: 0.4563, depth: 0.256 } },
  laptop: { id: 'laptop', section: 'projects', name: 'Open laptop', crop: crop('laptop'), spot: { x: 0.5036, y: 0.3701, depth: 0.186 } },
  speaker: { id: 'speaker', section: 'listen', name: 'Bluetooth speaker', crop: crop('speaker'), spot: { x: 0.6073, y: 0.4187, depth: 0.24 } },
  camera: { id: 'camera', section: 'photography', name: 'Camera', crop: crop('camera'), spot: { x: 0.7839, y: 0.1566, depth: 0.264 } },
  plaque: { id: 'plaque', section: 'youtube', name: 'Play button plaque', crop: crop('plaque'), spot: { x: 0.8521, y: 0.1153, depth: 0.234 } },
  guitar: { id: 'guitar', section: 'music', name: 'Acoustic guitar', crop: crop('guitar'), spot: { x: 0.8948, y: 0.6432, depth: 0.206 } },
  backpack: { id: 'backpack', section: 'work', name: 'Travel backpack', crop: crop('backpack'), spot: { x: 0.737, y: 0.7282, depth: 0.186 } },
}

export const ROOM_PHOTO = {
  aspect: 3840 / 1648,
  sources: [
    { width: 1280, src: '/room/room-1280.webp' },
    { width: 1920, src: '/room/room-1920.webp' },
    { width: 3200, src: '/room/room-3200.webp' },
    { width: 3840, src: '/room/room-3840.webp' },
  ],
  depth: '/room/depth.png',
  // 48px blur-up placeholder shown while the photo loads
  placeholder:
    'data:image/webp;base64,UklGRkYBAABXRUJQVlA4IDoBAAAQBwCdASowABUAPtFYpk2oJKOiMBVYAQAaCWYAnTMEyLvAAiuSbQ5dJyMTYBGwhcnjI9zn4cJtAq4wIAQtyhlVwAD7ufXRBaaw9JQyQ0D2xN8FS7vh7mFyYx3mjY88hZU52bwfJxs1weE7ZL5yootDVJLOa/bhvYkROWadH49j/2QGzygHjw9am6GGxO3nnm4ap/Ra6mI8JVnPPxC0AuEnSLd7qw+Hv9rbP38GI/ZPcrEZob8LLtzZKLCD3MwnrLQJTM3xM0ghwgVZF4UX3/V98mQItrgBjQLM8PFT/WqERbqjo+6PsapA10ABjYUniNmfMuCdq68K5HUsHXb/bBqwGoqh95clqI87XR7j3xLddcqGAetsSdL8BE/0EeYITxMHPuL/KP9VhqYDrffsargTEf5vBKlVSAAAAA==',
}

/** Mobile grid order: recruiters first. */
export const gridOrder: ObjectId[] = ['backpack', 'laptop', 'camera', 'tv', 'plaque', 'guitar', 'speaker', 'poster', 'passport']
