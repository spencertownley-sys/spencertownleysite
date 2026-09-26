import { useEffect, useRef, useState } from 'react'
import type { Mode } from '../lib/router'
import { useReducedMotion } from '../lib/hooks'
import { readTrailStyle, saveTrailStyle, TRAIL_LABELS, TRAIL_STYLES, trailPreview, type TrailStyle } from '../lib/trail'
import { fx } from './fx'

export function FxCanvas({ mode }: { mode: Mode }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const [trail, setTrail] = useState<TrailStyle>(readTrailStyle)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    fx.attach(canvas)
    const onResize = () => fx.resize()
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') fx.pointer(e.clientX, e.clientY)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      fx.detach()
    }
  }, [])

  useEffect(() => fx.setMode(mode), [mode])
  useEffect(() => fx.setReducedMotion(reduced), [reduced])
  useEffect(() => fx.setTrail(trail), [trail])

  return (
    <>
      <canvas ref={ref} className="fx-canvas" aria-hidden="true" />
      {trailPreview && (
        <div className="trail-picker" role="group" aria-label="Cursor trail preview">
          <span className="trail-picker-title">Cursor trail</span>
          {TRAIL_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={trail === s}
              onClick={() => {
                saveTrailStyle(s)
                setTrail(s)
              }}
            >
              {TRAIL_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
