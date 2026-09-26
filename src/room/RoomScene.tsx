import { useCallback, useEffect, useRef, useState } from 'react'
import { prefetchCloseups } from '../games/GameConsole'
import { sectionById, site, washington, type ObjectId, type SectionId } from '../content/site'
import { ambience } from '../lib/audio'
import { useReducedMotion } from '../lib/hooks'
import { supportsWebGL } from '../lib/webgl'
import { ROOM_PHOTO, roomObjects } from './objects'
import { RoomView, type ProjectedSpot, type ProjectedZone } from './roomView'
import { ZOOM_ARRIVED, zoomBox, zoomFrame, type ZoomTarget } from './zoom'

const ids = Object.keys(roomObjects) as ObjectId[]

type FrameFn = (s: ProjectedSpot[], z: ProjectedZone[]) => void

/** Starts the photo renderer on a canvas; shared by the full scene and the mobile hero. */
export function useRoomView(opts: { interactive: boolean; intro?: boolean; onFrame?: FrameFn }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const view = useRef<RoomView | null>(null)
  const frame = useRef(opts.onFrame)
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const flat = !supportsWebGL()
  const { interactive, intro = false } = opts

  useEffect(() => {
    frame.current = opts.onFrame
  })

  useEffect(() => {
    if (!canvas.current || !img.current) return
    const v = new RoomView({
      canvas: canvas.current,
      fallback: img.current,
      sources: ROOM_PHOTO.sources,
      flatSources: ROOM_PHOTO.flatSources,
      depthSrc: ROOM_PHOTO.depth,
      cutout: ROOM_PHOTO.chair,
      aspect: ROOM_PHOTO.aspect,
      spots: ids.map((id) => ({ id, ...roomObjects[id].spot })),
      zones: [ROOM_PHOTO.window],
      interactive,
      intro,
      reducedMotion: reduced,
      onFrame: (s, z) => frame.current?.(s, z),
      onReady: () => setReady(true),
    })
    view.current = v
    return () => {
      v.dispose()
      view.current = null
    }
  }, [interactive, intro, reduced])

  return { canvas, img, view, ready, flat }
}

export function RoomPhoto({ canvas, img, ready, flat }: Pick<ReturnType<typeof useRoomView>, 'canvas' | 'img' | 'ready' | 'flat'>) {
  return (
    <div className={`room-photo ${ready ? 'is-ready' : ''} ${flat ? 'is-flat' : ''}`}>
      <img ref={img} className="room-fallback" src={ROOM_PHOTO.placeholder} alt="" draggable={false} />
      <canvas ref={canvas} className="room-canvas" />
    </div>
  )
}

interface Props {
  onOpen: (id: SectionId) => void
  /** Where the camera has flown in to (the laptop or the game console), if anywhere. */
  zoomTo?: ZoomTarget | null
  /** Touch screens: labels always show (there is no hover) and a swipe moves the camera. */
  touch?: boolean
  /** Phones: switch to the plain list of everything in the room. */
  onList?: () => void
}

export function RoomScene({ onOpen, zoomTo = null, touch = false, onList }: Props) {
  const spots = useRef<Record<string, HTMLButtonElement | null>>({})
  const windowZone = useRef<HTMLButtonElement>(null)
  const note = useRef<HTMLDivElement>(null)
  const [hint, setHint] = useState(true)
  const [noteOpen, setNoteOpen] = useState(false)
  const hovering = useRef<string | null>(null)
  const pointer = useRef('mouse')

  const onFrame = useCallback<FrameFn>((list, zones) => {
    for (const s of list) {
      const el = spots.current[s.id]
      if (!el) continue
      el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`
      el.style.opacity = s.inView.toFixed(3)
      el.style.visibility = s.inView > 0.02 ? 'visible' : 'hidden'
    }
    const z = zones[0]
    const el = windowZone.current
    if (z && el) {
      el.style.transform = `translate3d(${z.x.toFixed(1)}px, ${z.y.toFixed(1)}px, 0)`
      el.style.width = `${z.w.toFixed(1)}px`
      el.style.height = `${z.h.toFixed(1)}px`
      const n = note.current
      if (n) {
        // pin the note to the wall beside the window, or inside it when there is no room
        const vw = el.parentElement?.clientWidth ?? window.innerWidth
        const nw = n.offsetWidth
        const right = z.x + z.w + 18
        const x = right + nw < vw - 16 ? right : Math.max(16, Math.min(z.x + z.w - nw - 18, vw - nw - 16))
        const y = Math.max(76, z.y + z.h * 0.12)
        n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      }
    }
  }, [])

  // a deep link straight to the laptop or console skips the opening pull-back
  const [intro] = useState(() => !zoomTo)
  const { canvas, img, view, ready, flat } = useRoomView({ interactive: true, intro, onFrame })

  // Labels show while the whole room is in view on arrival, then only on hover.
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => setHint(false), 6200)
    return () => window.clearTimeout(t)
  }, [ready])

  // Fly into the laptop or the TV cabinet while its overlay is open, and back out after.
  const first = useRef(true)
  useEffect(() => {
    const v = view.current
    if (!v) return
    if (zoomTo) {
      const target = zoomTo
      v.focus(zoomFrame(target), {
        instant: first.current,
        fit: (w, h) => zoomBox(target, w, h),
        done: () => window.dispatchEvent(new CustomEvent(ZOOM_ARRIVED, { detail: target })),
      })
    } else if (!first.current) {
      v.focus(null)
    }
    first.current = false
  }, [zoomTo, view])

  // Arrow keys move through the room when nothing else wants them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, [role="dialog"]') || t.isContentEditable)) return
      if (e.key === 'ArrowRight') view.current?.nudge(0.07)
      if (e.key === 'ArrowLeft') view.current?.nudge(-0.07)
      if (e.key === 'Escape') setNoteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const enter = (id: string) => {
    if (id === 'console') prefetchCloseups()
    hovering.current = id
    view.current?.setPaused(true)
    if (id !== 'window') ambience.sfx('hover')
  }
  const leave = (id: string) => {
    if (hovering.current === id) hovering.current = null
    if (!hovering.current) view.current?.setPaused(false)
  }

  const showNote = () => {
    enter('window')
    setNoteOpen(true)
  }
  const hideNote = () => {
    leave('window')
    setNoteOpen(false)
  }

  return (
    <div className={`room-scene ${hint || touch ? 'show-labels' : ''} ${zoomTo ? 'is-zoomed' : ''} ${touch ? 'is-touch' : ''}`}>
      <RoomPhoto canvas={canvas} img={img} ready={ready} flat={flat} />
      <div className="room-spots">
        <button
          ref={windowZone}
          type="button"
          className="room-window"
          aria-label={`The view out the window. ${washington.title}.`}
          aria-expanded={noteOpen}
          aria-controls="window-note"
          onPointerDown={(e) => {
            pointer.current = e.pointerType
            view.current?.beginDrag(e.clientX)
          }}
          onPointerEnter={(e) => e.pointerType === 'mouse' && showNote()}
          onPointerLeave={(e) => e.pointerType === 'mouse' && hideNote()}
          // keyboard focus opens it; a tap's focus would open it just before the click closed it again
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && showNote()}
          onBlur={hideNote}
          onClick={(e) => {
            // a mouse is already hovering it open, so a click keeps it; taps and keys toggle it
            const toggle = e.detail === 0 || pointer.current !== 'mouse'
            if (noteOpen && toggle) hideNote()
            else showNote()
          }}
        />
        {ids.map((id) => {
          const def = roomObjects[id]
          const section = sectionById[def.section]
          const below = def.labelBelow ?? def.spot.y < 0.22
          return (
            <button
              key={id}
              type="button"
              ref={(el) => void (spots.current[id] = el)}
              className={`room-spot spot-${id} ${below ? 'label-below' : ''}`}
              onPointerEnter={() => enter(id)}
              onPointerLeave={() => leave(id)}
              onFocus={() => enter(id)}
              onBlur={() => leave(id)}
              onClick={() => {
                ambience.sfx('open')
                if (id === 'console') prefetchCloseups()
                onOpen(section.id)
              }}
              aria-label={`${section.roomLabel}. ${def.name}.`}
              tabIndex={zoomTo ? -1 : undefined}
            >
              <span className="spot-dot" aria-hidden="true" />
              <span className="spot-label" aria-hidden="true">
                <span className="spot-name">{section.roomLabel}</span>
                <span className="spot-object">{def.name}</span>
              </span>
            </button>
          )
        })}
        <div ref={note} id="window-note" className={`window-note ${noteOpen ? 'is-open' : ''}`} role="note">
          <WindowNote />
        </div>
      </div>
      {touch && !zoomTo && (
        <p className={`touch-hint ${hint && ready && !noteOpen ? 'is-on' : ''}`} aria-hidden="true">
          {site.touchHint}
        </p>
      )}
      {onList && !zoomTo && (
        <button type="button" className="room-list-btn" onClick={onList}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          List view
        </button>
      )}
    </div>
  )
}

export function WindowNote() {
  return (
    <div className="note-card">
      <span className="note-stamp" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="40" height="40">
          <path d="M4 32 L15 14 L20 21 L25 12 L36 32 Z" fill="currentColor" opacity="0.9" />
          <path d="M22.4 16.2 L25 12 L27.6 16.2 L25.6 15.4 L24.4 16.6 Z" fill="#fff" />
          <path d="M8 32 L11 26 L14 32 Z M27 32 L30 25 L33 32 Z" fill="#2f5d46" />
        </svg>
        WA
      </span>
      <span className="note-eyebrow">{washington.eyebrow}</span>
      <strong className="note-title">{washington.title}</strong>
      <span className="note-body">{washington.body}</span>
      <span className="note-fact">
        <b>Fun fact</b> {washington.fact}
      </span>
    </div>
  )
}
