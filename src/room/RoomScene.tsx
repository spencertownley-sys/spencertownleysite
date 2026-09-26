import { useCallback, useEffect, useRef, useState } from 'react'
import { sectionById, type ObjectId, type SectionId } from '../content/site'
import { ambience } from '../lib/audio'
import { useReducedMotion } from '../lib/hooks'
import { supportsWebGL } from '../lib/webgl'
import { ROOM_PHOTO, roomObjects } from './objects'
import { RoomView, type ProjectedSpot } from './roomView'

const ids = Object.keys(roomObjects) as ObjectId[]

/** Starts the photo renderer on a canvas; shared by the full scene and the mobile hero. */
export function useRoomView(opts: { interactive: boolean; onFrame?: (s: ProjectedSpot[]) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const view = useRef<RoomView | null>(null)
  const frame = useRef(opts.onFrame)
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const flat = !supportsWebGL()
  const { interactive } = opts

  useEffect(() => {
    frame.current = opts.onFrame
  })

  useEffect(() => {
    if (!canvas.current || !img.current) return
    const v = new RoomView({
      canvas: canvas.current,
      fallback: img.current,
      sources: ROOM_PHOTO.sources,
      depthSrc: ROOM_PHOTO.depth,
      aspect: ROOM_PHOTO.aspect,
      spots: ids.map((id) => ({ id, ...roomObjects[id].spot })),
      interactive,
      reducedMotion: reduced,
      onFrame: (s) => frame.current?.(s),
      onReady: () => setReady(true),
    })
    view.current = v
    return () => {
      v.dispose()
      view.current = null
    }
  }, [interactive, reduced])

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

export function RoomScene({ onOpen }: { onOpen: (id: SectionId) => void }) {
  const spots = useRef<Record<string, HTMLButtonElement | null>>({})
  const [hint, setHint] = useState(true)
  const hovering = useRef<string | null>(null)

  const onFrame = useCallback((list: ProjectedSpot[]) => {
    for (const s of list) {
      const el = spots.current[s.id]
      if (!el) continue
      el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`
      el.style.opacity = s.inView.toFixed(3)
      el.style.visibility = s.inView > 0.02 ? 'visible' : 'hidden'
    }
  }, [])

  const { canvas, img, view, ready, flat } = useRoomView({ interactive: true, onFrame })

  // Labels show for a few seconds on arrival, then only on hover.
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => setHint(false), 5200)
    return () => window.clearTimeout(t)
  }, [ready])

  // Arrow keys move through the room when nothing else wants them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, [role="dialog"]') || t.isContentEditable)) return
      if (e.key === 'ArrowRight') view.current?.nudge(0.07)
      if (e.key === 'ArrowLeft') view.current?.nudge(-0.07)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const enter = (id: string) => {
    hovering.current = id
    view.current?.setPaused(true)
    ambience.sfx('hover')
  }
  const leave = (id: string) => {
    if (hovering.current === id) hovering.current = null
    if (!hovering.current) view.current?.setPaused(false)
  }

  return (
    <div className={`room-scene ${hint ? 'show-labels' : ''}`}>
      <RoomPhoto canvas={canvas} img={img} ready={ready} flat={flat} />
      <div className="room-spots">
        {ids.map((id) => {
          const def = roomObjects[id]
          const section = sectionById[def.section]
          const below = def.spot.y < 0.22
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
                onOpen(section.id)
              }}
              aria-label={`${section.roomLabel}. ${def.name}.`}
            >
              <span className="spot-dot" aria-hidden="true" />
              <span className="spot-label" aria-hidden="true">
                <span className="spot-name">{section.roomLabel}</span>
                <span className="spot-object">{def.name}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
