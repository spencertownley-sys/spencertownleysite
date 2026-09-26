// The console under the TV. The Room camera flies to the TV cabinet and, on the way in,
// the view merges into a head-on close-up of it (the close-up rides on the room's TV and
// fades in, so the whole move reads as one zoom), the set powers on, and an old-school
// menu lists the games.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { AnimatePresence, motion, usePresence } from 'framer-motion'
import '@fontsource/press-start-2p/latin-400.css'
import { games, sectionById, type Game } from '../content/site'
import { ambience } from '../lib/audio'
import { useMediaQuery, useReducedMotion } from '../lib/hooks'
import { screenBox, zoomTrack, type Box } from '../room/zoom'
import tallSmall from '../assets/tv/tv-tall-1080.webp'
import tallLarge from '../assets/tv/tv-tall-1620.webp'
import wideSmall from '../assets/tv/tv-wide-2560.webp'
import wideLarge from '../assets/tv/tv-wide-3840.webp'

/** The menu is laid out on a fixed 256 x 192 screen (4:3, like the old consoles), then scaled to the TV. */
const LOGICAL_W = 256
const LOGICAL_H = 192

/**
 * The head-on close-ups, measured in their full-size pixels: where the TV glass is,
 * and what should fill the view (TV and cabinet on wide screens, the TV on phones).
 */
const CLOSEUPS = {
  wide: {
    srcSet: `${wideSmall} 2560w, ${wideLarge} 3840w`,
    src: wideSmall,
    w: 3840,
    h: 2160,
    screen: { x: 1508, y: 518, w: 608, h: 467 },
    subject: { x: 1015, y: 455, w: 1792, h: 1165 },
  },
  tall: {
    srcSet: `${tallSmall} 1080w, ${tallLarge} 1620w`,
    src: tallSmall,
    w: 2160,
    h: 3840,
    screen: { x: 450, y: 990, w: 970, h: 715 },
    subject: { x: 300, y: 880, w: 1510, h: 1000 },
  },
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Warm the close-ups up before they are needed (the Room calls this on hovering the console). */
export function prefetchCloseups() {
  for (const c of Object.values(CLOSEUPS)) {
    const img = new Image()
    img.srcset = c.srcSet
    img.sizes = '100vw'
    img.src = c.src
  }
}

/** Where the close-up image sits (cover, zoomed so its subject fills the space between the bars) and where its TV glass lands. */
function closeupLayout(vw: number, vh: number, compact: boolean) {
  const c = vw / vh < 0.9 ? CLOSEUPS.tall : CLOSEUPS.wide
  const top = compact ? 64 : 76
  const bottom = compact ? 76 : 68
  const side = 12
  const cover = Math.max(vw / c.w, vh / c.h)
  const fit = Math.min((vw - side * 2) / c.subject.w, (vh - top - bottom) / c.subject.h)
  const s = Math.max(cover, fit)
  const iw = c.w * s
  const ih = c.h * s
  let x = vw / 2 - (c.subject.x + c.subject.w / 2) * s
  let y = top + (vh - top - bottom) / 2 - (c.subject.y + c.subject.h / 2) * s
  x = Math.min(0, Math.max(vw - iw, x))
  y = Math.min(0, Math.max(vh - ih, y))
  const screen: Box = { x: x + c.screen.x * s, y: y + c.screen.y * s, w: c.screen.w * s, h: c.screen.h * s }
  return { c, img: { x, y, w: iw, h: ih }, screen }
}

interface Props {
  compact: boolean
  /** True when the Room camera is flying in (the close-up merges out of the room's TV). */
  camera: boolean
  onClose: () => void
}

type Screen = { kind: 'menu' } | { kind: 'soon'; game: Game; n: number } | { kind: 'play'; game: Game }

export function GameConsole({ compact, camera, onClose }: Props) {
  const reduced = useReducedMotion()
  const touch = useMediaQuery('(hover: none)') || compact
  const [isPresent, safeToRemove] = usePresence()
  const [merged, setMerged] = useState(false)
  const closeup = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  /** When the close-up photo finished loading (0 until then). */
  const loadedAt = useRef(0)
  const root = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const returnFocus = useRef<HTMLElement | null>(null)
  const [index, setIndex] = useState(0)
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' })
  const [view, setView] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const list = games.items

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    root.current?.focus({ preventScroll: true })
    return () => {
      const el = returnFocus.current
      if (el && document.contains(el)) el.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    if (merged) ambience.sfx('power')
  }, [merged])

  // keep keyboard focus on the highlighted cartridge
  useEffect(() => {
    if (merged && screen.kind === 'menu') rows.current[index]?.focus({ preventScroll: true })
  }, [merged, screen.kind, index])

  const leave = () => {
    ambience.sfx('close')
    onClose()
  }

  const choose = (i: number) => {
    const game = list[i]
    ambience.sfx('select')
    setIndex(i)
    setScreen(game.url ? { kind: 'play', game } : { kind: 'soon', game, n: i + 1 })
  }

  const move = (d: number) => {
    ambience.sfx('blip')
    setIndex((i) => (i + d + list.length) % list.length)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (screen.kind === 'menu') leave()
      else {
        ambience.sfx('blip')
        setScreen({ kind: 'menu' })
      }
      return
    }
    if (screen.kind !== 'menu') {
      if (e.key === 'Tab') {
        // keep focus on the TV
        const els = Array.from(root.current?.querySelectorAll<HTMLElement>('button, iframe') ?? [])
        const at = els.indexOf(document.activeElement as HTMLElement)
        e.preventDefault()
        els[(at + (e.shiftKey ? -1 : 1) + els.length) % els.length]?.focus()
      }
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Tab') {
      // Tab cycles the cartridges, like a controller would
      e.preventDefault()
      move(e.shiftKey ? -1 : 1)
    }
  }

  // Escape also works when focus has wandered (for example into a game's frame).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (root.current?.contains(document.activeElement)) return
      if (screen.kind === 'menu') leave()
      else setScreen({ kind: 'menu' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const layout = closeupLayout(view.w, view.h, compact)
  const frame = layout.screen
  const scale = Math.min(frame.w / LOGICAL_W, frame.h / LOGICAL_H)

  // Latest layout, for the animation loop below.
  const live = useRef({ frame, view, tracking: camera && !reduced })
  useEffect(() => {
    live.current = { frame, view, tracking: camera && !reduced }
  })

  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth) loadedAt.current ||= performance.now()
  }, [])

  // The merge, one frame at a time. While the camera flies in, the close-up rides on the
  // room's TV (same place, same size) and fades in with a soft edge, then settles into the
  // head-on view exactly as the camera lands. Leaving plays it backwards as the camera
  // pulls out. Without the camera (list view, reduced motion) it simply fades.
  useEffect(() => {
    let raf = 0
    let done = false
    const since = performance.now()
    const tick = (now: number) => {
      const el = closeup.current
      const { frame, view, tracking } = live.current
      const loaded = loadedAt.current
      const fade = loaded ? Math.min(1, (now - loaded) / 250) : 0
      let w = 1
      let op: number
      if (tracking) {
        const p = zoomTrack.progress
        w = isPresent ? smooth(0.4, 1, p) : smooth(0.5, 1, p)
        op = Math.min(isPresent ? smooth(0.3, 0.8, p) : smooth(0.5, 0.92, p), fade)
      } else {
        op = isPresent ? fade : Math.max(0, 1 - (now - since) / 200)
      }
      // never hang on the way out, whatever the camera is doing
      if (!isPresent) op = Math.min(op, 1 - Math.max(0, now - since - 1100) / 200)
      if (el) {
        if (tracking && w < 1) {
          const room = zoomTrack.box ?? screenBox('console', view.w, view.h)
          const k = room.w / frame.w
          const s = k + (1 - k) * w
          const tx = (room.x + room.w / 2 - (frame.x + frame.w / 2) * k) * (1 - w)
          const ty = (room.y + room.h / 2 - (frame.y + frame.h / 2) * k) * (1 - w)
          el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`
          // soft edges while it is still growing out of the room: a glow around the TV that
          // opens up as it lands, and feathered sides for when it is smaller than the view
          const reach = w * w * Math.hypot(view.w, view.h) * 1.7
          const glow = `radial-gradient(ellipse ${(frame.w * 0.85 + reach).toFixed(0)}px ${(frame.h + reach).toFixed(0)}px at ${(frame.x + frame.w / 2).toFixed(0)}px ${(frame.y + frame.h / 2).toFixed(0)}px, #000 58%, transparent 100%)`
          const f = ((1 - w) * 80).toFixed(0)
          const side = (dir: string) => `linear-gradient(${dir}, transparent, #000 ${f}px, #000 calc(100% - ${f}px), transparent)`
          const mask = `${glow}, ${side('to right')}, ${side('to bottom')}`
          el.style.setProperty('mask-image', mask)
          el.style.setProperty('-webkit-mask-image', mask)
          el.style.setProperty('mask-composite', 'intersect')
          el.style.setProperty('-webkit-mask-composite', 'source-in')
        } else {
          el.style.transform = ''
          for (const prop of ['mask-image', '-webkit-mask-image', 'mask-composite', '-webkit-mask-composite']) el.style.removeProperty(prop)
        }
        el.style.opacity = op.toFixed(3)
      }
      if (isPresent && !done && op >= 1 && w >= 1) {
        done = true
        setMerged(true)
        return // settled; nothing moves until it is time to leave
      }
      if (!isPresent && op <= 0) {
        safeToRemove?.()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPresent, safeToRemove])

  const clickAway = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') leave()
  }

  return (
    <>
      <div ref={closeup} className="tv-closeup" style={{ opacity: 0 }} onClick={clickAway} aria-hidden="true">
        <img
          ref={img}
          src={layout.c.src}
          srcSet={layout.c.srcSet}
          sizes={`${Math.round(layout.img.w)}px`}
          alt=""
          draggable={false}
          onLoad={() => void (loadedAt.current ||= performance.now())}
          style={{ left: layout.img.x, top: layout.img.y, width: layout.img.w, height: layout.img.h }}
        />
      </div>
      <motion.button
        type="button"
        className="tv-back"
        onClick={leave}
        initial={{ opacity: 0 }}
        animate={{ opacity: merged ? 1 : 0 }}
        exit={{ opacity: 0 }}
      >
        <span aria-hidden="true">←</span> Back to the room
        {!compact && <kbd>Esc</kbd>}
      </motion.button>
      <motion.div
        ref={root}
        className="tv-screen"
        style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
        role="dialog"
        aria-modal="true"
        aria-label={`${sectionById.games.title}: ${sectionById.games.subtitle}`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: merged ? 1 : 0, transition: { duration: 0.12 } }}
        exit={{ opacity: 0, transition: { duration: reduced ? 0.1 : 0.2 } }}
      >
        {/* the picture "powers on": a bright line opens up into the full screen */}
        <motion.div
          className="crt"
          initial={reduced ? false : { scaleY: 0.012, scaleX: 0.7, filter: 'brightness(3)' }}
          animate={merged ? { scaleY: 1, scaleX: 1, filter: 'brightness(1)' } : undefined}
          transition={{ duration: 0.42, ease: [0.2, 0.9, 0.3, 1], delay: 0.05 }}
        >
          {screen.kind === 'play' ? (
            <GameFrame game={screen.game} onExit={() => setScreen({ kind: 'menu' })} />
          ) : (
            <div className="crt-logical" style={{ width: LOGICAL_W, height: LOGICAL_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
              <AnimatePresence mode="wait" initial={false}>
                {screen.kind === 'menu' ? (
                  <motion.div key="menu" className="crt-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                    <p className="crt-title">
                      <span className="crt-star" aria-hidden="true">
                        *
                      </span>{' '}
                      {games.menuTitle}{' '}
                      <span className="crt-star" aria-hidden="true">
                        *
                      </span>
                    </p>
                    <p className="crt-sub">PICK A CARTRIDGE</p>
                    <ul className="crt-list" role="listbox" aria-label="Games">
                      {list.map((g, i) => (
                        <li key={g.id} role="presentation">
                          <button
                            ref={(el) => void (rows.current[i] = el)}
                            id={`cart-${g.id}`}
                            type="button"
                            role="option"
                            aria-selected={i === index}
                            tabIndex={i === index ? 0 : -1}
                            className={`crt-row ${i === index ? 'is-on' : ''}`}
                            onPointerEnter={() => {
                              if (i !== index) move(i - index)
                            }}
                            onClick={() => choose(i)}
                          >
                            <span className="crt-arrow" aria-hidden="true">
                              {i === index ? '>' : ' '}
                            </span>
                            <span className="crt-name">{g.title ? g.title.toUpperCase() : `${games.emptySlot} ${i + 1}`}</span>
                            <span className="crt-tag">{g.url ? 'PLAY' : 'SOON'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="crt-foot">
                      {touch ? (
                        <span>TAP A CARTRIDGE</span>
                      ) : (
                        <span>
                          <kbd>↑↓</kbd> PICK <kbd>ENTER</kbd> PLAY
                        </span>
                      )}
                      <button type="button" className="crt-exit" onClick={leave} tabIndex={-1}>
                        {touch ? 'EXIT' : 'ESC EXIT'}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="soon" className="crt-page crt-soon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                    <p className="crt-title">{screen.game.title ? screen.game.title.toUpperCase() : `CARTRIDGE ${screen.n}`}</p>
                    <div className="crt-cart" aria-hidden="true">
                      <span />
                    </div>
                    <p className="crt-msg">COMING SOON</p>
                    <p className="crt-small">{screen.game.blurb ?? games.comingSoon}</p>
                    <button type="button" className="crt-exit crt-blink" onClick={() => setScreen({ kind: 'menu' })}>
                      {touch ? 'TAP TO GO BACK' : 'PRESS ENTER'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  )
}

/** A connected game, playing right on the TV. */
function GameFrame({ game, onExit }: { game: Game; onExit: () => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  return (
    <div className="crt-game" ref={wrap}>
      <iframe src={game.url ?? undefined} title={game.title ?? 'Game'} allow="fullscreen; gamepad; autoplay" sandbox="allow-scripts allow-same-origin allow-pointer-lock" />
      <div className="crt-game-bar">
        <button type="button" onClick={onExit}>
          Menu
        </button>
        <button type="button" onClick={() => void wrap.current?.requestFullscreen?.().catch(() => {})}>
          Full screen
        </button>
      </div>
    </div>
  )
}
