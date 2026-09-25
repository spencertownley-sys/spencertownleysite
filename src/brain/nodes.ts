import type { SectionId } from '../content/site'

export interface BrainNodeDef {
  id: SectionId
  /** Point on the brain drawing, normalized to the 2048 x 2048 artboard. */
  anchor: [number, number]
  /** Where the label sits around the brain, in degrees clockwise from 3 o'clock. */
  angle: number
}

// Anchors sit on real vertices of the wireframe, loosely matched to the region
// each section is named after (visual cortex for photography, and so on).
export const brainNodes: BrainNodeDef[] = [
  { id: 'photography', anchor: [0.815, 0.448], angle: 347 },
  { id: 'video', anchor: [0.833, 0.546], angle: 12 },
  { id: 'countries', anchor: [0.565, 0.547], angle: 38 },
  { id: 'listen', anchor: [0.601, 0.765], angle: 72 },
  { id: 'music', anchor: [0.38, 0.637], angle: 112 },
  { id: 'currently', anchor: [0.417, 0.537], angle: 147 },
  { id: 'youtube', anchor: [0.23, 0.522], angle: 167 },
  { id: 'trips', anchor: [0.167, 0.452], angle: 188 },
  { id: 'travel-and-planning', anchor: [0.378, 0.45], angle: 208 },
  { id: 'work', anchor: [0.22, 0.338], angle: 229 },
  { id: 'how-i-build', anchor: [0.435, 0.238], angle: 256 },
  { id: 'projects', anchor: [0.574, 0.24], angle: 288 },
  { id: 'framework', anchor: [0.66, 0.316], angle: 320 },
]

export const BRAIN_STAGE = {
  width: 1600,
  height: 1000,
  brain: { x: 385, y: 88, size: 830 },
  center: { x: 800, y: 512 },
  rx: 565,
  ry: 356,
}

export type LabelSide = 'left' | 'right' | 'top' | 'bottom'

export interface PlacedNode extends BrainNodeDef {
  ax: number
  ay: number
  lx: number
  ly: number
  side: LabelSide
}

export function placeNodes(): PlacedNode[] {
  const { brain, center, rx, ry } = BRAIN_STAGE
  return brainNodes.map((n) => {
    const a = (n.angle * Math.PI) / 180
    const lx = center.x + rx * Math.cos(a)
    const ly = center.y + ry * Math.sin(a)
    const deg = ((n.angle % 360) + 360) % 360
    const side: LabelSide = deg > 240 && deg < 300 ? 'top' : deg > 60 && deg < 120 ? 'bottom' : Math.cos(a) < 0 ? 'left' : 'right'
    return {
      ...n,
      ax: brain.x + n.anchor[0] * brain.size,
      ay: brain.y + n.anchor[1] * brain.size,
      lx,
      ly,
      side,
    }
  })
}
