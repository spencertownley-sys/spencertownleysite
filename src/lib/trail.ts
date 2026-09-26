// Which cursor trail to draw. Visitors get the default; `?trail=<style>` previews
// another one (and remembers it in this browser) and shows a small picker.

export const TRAIL_STYLES = ['ribbon', 'ink', 'route', 'ripple', 'glow', 'none'] as const
export type TrailStyle = (typeof TRAIL_STYLES)[number]

export const DEFAULT_TRAIL: TrailStyle = 'ribbon'

export const TRAIL_LABELS: Record<TrailStyle, string> = {
  ribbon: 'Light ribbon',
  ink: 'Ink pen',
  route: 'Chart route',
  ripple: 'Ripples',
  glow: 'Soft glow',
  none: 'No trail',
}

const KEY = 'trail-style'
const isStyle = (s: string | null): s is TrailStyle => !!s && (TRAIL_STYLES as readonly string[]).includes(s)

/** True when the page was opened with `?trail=`, which turns on the picker. */
export const trailPreview = new URLSearchParams(window.location.search).has('trail')

export function readTrailStyle(): TrailStyle {
  const q = new URLSearchParams(window.location.search).get('trail')
  if (isStyle(q)) {
    saveTrailStyle(q)
    return q
  }
  try {
    const s = window.localStorage.getItem(KEY)
    if (isStyle(s)) return s
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_TRAIL
}

export function saveTrailStyle(s: TrailStyle) {
  try {
    window.localStorage.setItem(KEY, s)
  } catch {
    /* storage unavailable */
  }
}
