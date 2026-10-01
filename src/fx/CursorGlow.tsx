import { useEffect, useRef } from 'react'

/** A very soft light that sits right under the mouse. No trail: it follows exactly. */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let x = 0
    let y = 0
    const place = () => {
      raf = 0
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
        el.classList.remove('is-on')
        return
      }
      x = e.clientX
      y = e.clientY
      el.classList.add('is-on')
      if (!raf) raf = requestAnimationFrame(place)
    }
    const hide = () => el.classList.remove('is-on')
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) hide()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerout', onOut)
    window.addEventListener('blur', hide)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onOut)
      window.removeEventListener('blur', hide)
    }
  }, [])

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />
}
