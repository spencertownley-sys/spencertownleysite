import { useEffect, useRef } from 'react'
import type { Mode } from '../lib/router'
import { useReducedMotion } from '../lib/hooks'
import { fx } from './fx'

export function FxCanvas({ mode }: { mode: Mode }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

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

  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />
}
