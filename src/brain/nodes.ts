import type { SectionId } from '../content/site'

export interface BrainNodeDef {
  id: SectionId
  /**
   * Where the node lives on the brain, as a direction from its center in brain space:
   * x = right hemisphere, y = up, z = toward the front (frontal lobe).
   * Loosely matched to the region each section is named after.
   */
  dir: [number, number, number]
  /** Optional explicit point instead of a surface direction (the brainstem). */
  point?: [number, number, number]
}

export const brainNodes: BrainNodeDef[] = [
  { id: 'work', dir: [0.3, 0.55, 0.8] }, // prefrontal cortex
  { id: 'trips', dir: [-0.15, 0.05, 1] }, // frontal pole
  { id: 'youtube', dir: [-0.8, -0.1, 0.55] }, // Broca's area (left)
  { id: 'how-i-build', dir: [0.25, 1, 0.12] }, // motor cortex
  { id: 'travel-and-planning', dir: [-0.04, 1, 0.45] }, // corpus callosum, along the midline
  { id: 'projects', dir: [-0.35, 0.85, -0.45] }, // parietal lobe
  { id: 'framework', dir: [0.8, 0.45, -0.4] }, // association cortex (right)
  { id: 'photography', dir: [0.1, 0.3, -1] }, // visual cortex, back of the head
  { id: 'video', dir: [-0.7, 0.0, -0.7] }, // area V5, occipito-temporal (left)
  { id: 'music', dir: [0.95, -0.25, 0.2] }, // auditory cortex, right temporal lobe
  { id: 'countries', dir: [-0.9, -0.45, 0.05] }, // hippocampus, medial temporal (left)
  { id: 'currently', dir: [0.45, -0.75, 0.5] }, // reward circuit, underside
  { id: 'listen', dir: [0, -1, 0], point: [0, -1.02, -0.3] }, // brainstem relay
  { id: 'games', dir: [0.4, -0.7, -0.75] }, // cerebellum, low at the back
  { id: 'writing', dir: [-0.85, 0.4, -0.3] }, // angular gyrus (left), where reading and writing meet
]
