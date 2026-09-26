// The console under the TV: the camera frames the TV and cabinet, the set powers on,
// and an old-school menu lists the games. Arrow keys (or the mouse) pick a cartridge.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import '@fontsource/press-start-2p/latin-400.css'
import { games, sectionById, type Game } from '../content/site'
import { ambience } from '../lib/audio'
import { useReducedMotion } from '../lib/hooks'
import { useArrived, useScreenBox } from '../room/zoom'

/** The menu is laid out on a fixed 320 x 240 screen, then scaled to fit the TV. */
const LOGICAL_W = 320
const LOGICAL_H = 240

interface Props {
  compact: boolean
  onClose: () => void
}

type Screen = { kind: 'menu' } | { kind: 'soon'; game: Game; n: number } | { kind: 'play'; game: Game }

export function GameConsole({ compact, onClose }: Props) {
  const reduced = useReducedMotion()
  const box = useScreenBox(compact ? null : 'console')
  const arrived = useArrived('console', compact)
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
    if (arrived) ambience.sfx('power')
  }, [arrived])

  // keep keyboard focus on the highlighted cartridge
  useEffect(() => {
    if (arrived && screen.kind === 'menu') rows.current[index]?.focus({ preventScroll: true })
  }, [arrived, screen.kind, index])

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

  // the logical screen, scaled into the TV glass (or the phone screen)
  const frame = box ?? fitCompact(view.w, view.h)
  const scale = Math.min(frame.w / LOGICAL_W, frame.h / LOGICAL_H)

  return (
    <>
      {box && (
        <motion.div
          className="tv-backdrop"
          aria-hidden="true"
          onClick={leave}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      {compact && (
        <motion.div className="tv-compact-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="tv-compact-back" onClick={leave}>
            Back
          </button>
        </motion.div>
      )}
      <motion.div
        ref={root}
        className={`tv-screen ${compact ? 'is-compact' : 'is-framed'}`}
        style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
        role="dialog"
        aria-modal="true"
        aria-label={`${sectionById.games.title}: ${sectionById.games.subtitle}`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: arrived ? 1 : 0, transition: { duration: 0.12 } }}
        exit={{ opacity: 0, transition: { duration: reduced ? 0.1 : 0.25 } }}
      >
        {/* the picture "powers on": a bright line opens up into the full screen */}
        <motion.div
          className="crt"
          initial={reduced ? false : { scaleY: 0.012, scaleX: 0.7, filter: 'brightness(3)' }}
          animate={arrived ? { scaleY: 1, scaleX: 1, filter: 'brightness(1)' } : undefined}
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
                      <span>
                        <kbd>↑↓</kbd> PICK <kbd>ENTER</kbd> PLAY
                      </span>
                      <button type="button" className="crt-exit" onClick={leave} tabIndex={-1}>
                        ESC EXIT
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
                      PRESS ENTER
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

/** On phones there is no camera move: the TV screen fills the width, 4:3. */
function fitCompact(w: number, h: number) {
  const top = 64
  const aw = w - 24
  const ah = h - top - 24
  let fw = aw
  let fh = (fw * 3) / 4
  if (fh > ah) {
    fh = ah
    fw = (fh * 4) / 3
  }
  return { x: (w - fw) / 2, y: top + (ah - fh) / 2, w: fw, h: fh }
}
