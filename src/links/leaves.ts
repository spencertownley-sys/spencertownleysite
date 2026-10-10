// Where each link's leaf sits on the two plant pictures (Higgsfield, wide and tall), as the
// leaf's center in 0..1 of the picture. Re-measure these if a picture changes.
import wide3840 from '../assets/links/garden-wide-3840.webp'
import wide1920 from '../assets/links/garden-wide-1920.webp'
import tall2160 from '../assets/links/garden-tall-2160.webp'
import tall1080 from '../assets/links/garden-tall-1080.webp'
import wideMask from '../assets/links/garden-wide-mask.webp'
import tallMask from '../assets/links/garden-tall-mask.webp'

export interface GardenArt {
  src: string
  srcSet: string
  /** The leaves alone, as an alpha mask of the whole picture (assets/links/leaf-mask.mjs), for lifting one on hover. */
  mask: string
  /** Full size in pixels. */
  w: number
  h: number
  /** The size of one leaf, 0..1 of the picture. */
  leaf: { w: number; h: number }
  /** Leaf centers by link id (see linkGarden.leaves in site.ts). */
  spots: Record<string, [number, number]>
  /** An empty patch of wall for the title card, 0..1 of the picture. */
  title: { x: number; y: number; w: number; h: number }
}

/** Vines trail across the wall from a pot on a shelf, lower left. For landscape screens. */
export const wideArt: GardenArt = {
  src: wide1920,
  srcSet: `${wide1920} 1920w, ${wide3840} 3840w`,
  mask: wideMask,
  w: 3840,
  h: 2160,
  leaf: { w: 0.058, h: 0.125 },
  spots: {
    // the top vine
    jimothy: [0.2525, 0.142],
    more: [0.4169, 0.094],
    smoosh: [0.8175, 0.139],
    // the middle vine
    'points-pool': [0.2581, 0.367],
    'make-that': [0.3825, 0.464],
    shortlist: [0.4775, 0.476],
    downbeat: [0.6231, 0.324],
    linkedin: [0.77, 0.387],
    github: [0.9075, 0.467],
    // the bottom vine
    'photo-site': [0.3238, 0.693],
    'video-site': [0.4456, 0.796],
    'photo-ig': [0.5644, 0.804],
    youtube: [0.7613, 0.702],
    'band-ig': [0.8356, 0.764],
    'band-yt': [0.9225, 0.872],
    // by the pot
    'travel-ig': [0.135, 0.559],
    email: [0.2206, 0.844],
  },
  // between the middle and bottom vines, right of center
  title: { x: 0.53, y: 0.47, w: 0.2, h: 0.16 },
}

/** Two vines climb from a pot at the bottom. For portrait screens. */
export const tallArt: GardenArt = {
  src: tall1080,
  srcSet: `${tall1080} 1080w, ${tall2160} 2160w`,
  mask: tallMask,
  w: 2160,
  h: 3840,
  leaf: { w: 0.1, h: 0.065 },
  spots: {
    // the left vine, top down
    'points-pool': [0.23, 0.1125],
    'make-that': [0.371, 0.203],
    shortlist: [0.264, 0.2875],
    downbeat: [0.387, 0.375],
    jimothy: [0.25, 0.4625],
    more: [0.38, 0.547],
    smoosh: [0.272, 0.631],
    linkedin: [0.4256, 0.709],
    github: [0.369, 0.794],
    // the right vine, top down
    'photo-site': [0.733, 0.156],
    'video-site': [0.77, 0.266],
    'photo-ig': [0.682, 0.347],
    youtube: [0.802, 0.441],
    'band-ig': [0.68, 0.528],
    'band-yt': [0.822, 0.616],
    'travel-ig': [0.662, 0.691],
    email: [0.616, 0.781],
  },
  // beside the pot, on the left
  title: { x: 0.03, y: 0.835, w: 0.35, h: 0.12 },
}

/** The leaves and the title card together (0..1), so the layout can keep all of it on screen. */
export function contentBounds(art: GardenArt) {
  const pts = Object.values(art.spots)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const t = art.title
  return {
    x0: Math.min(t.x, ...xs.map((x) => x - art.leaf.w / 2)),
    x1: Math.max(t.x + t.w, ...xs.map((x) => x + art.leaf.w / 2)),
    y0: Math.min(t.y, ...ys.map((y) => y - art.leaf.h / 2)),
    y1: Math.max(t.y + t.h, ...ys.map((y) => y + art.leaf.h / 2)),
  }
}
