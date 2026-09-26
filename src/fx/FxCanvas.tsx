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
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      fx.detach()
    }
  }, [])

  useEffect(() => fx.setMode(mode), [mode])
  useEffect(() => fx.setReducedMotion(reduced), [reduced])

  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />
}
