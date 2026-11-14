import { useEffect, useRef } from 'react'
import { CloseIcon } from '../components/icons'
import { ambience } from '../lib/audio'
import { closeToScene } from '../lib/router'
import { InLink } from './ui'

/** Shown for a path that matches no section. The server answers these with a real 404. */
export function NotFound({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <div ref={ref} className="panel is-small panel-notfound" role="dialog" aria-modal="true" aria-labelledby="panel-title-notfound" tabIndex={-1}>
        <header className="panel-head">
          <span className="panel-glyph" aria-hidden="true" />
          <div className="panel-titles">
            <h2 id="panel-title-notfound">Page not found</h2>
            <p className="panel-sub">There is nothing at this address.</p>
          </div>
          <button
            type="button"
            className="panel-close"
            aria-label="Close"
            onClick={() => {
              ambience.sfx('close')
              closeToScene()
            }}
          >
            <CloseIcon />
          </button>
        </header>
        <div className="panel-body">
          <p>The link may be old or mistyped. Try one of these instead.</p>
          <div className="btn-row">
            <InLink to="/">Back to the room</InLink>
            <InLink to="/work">Career and resume</InLink>
          </div>
        </div>
      </div>
    </>
  )
}
