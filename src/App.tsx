import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomBar, TopBar } from './components/Chrome'
import { sectionForPath, site, type SectionId, sectionById } from './content/site'
import { CursorGlow } from './fx/CursorGlow'
import { FxCanvas } from './fx/FxCanvas'
import { ambience } from './lib/audio'
import { COMPACT_QUERY, useMediaQuery, useReducedMotion } from './lib/hooks'
import { closeToScene, navigate, setMode, useLocation, type Mode } from './lib/router'
import { GameConsole } from './games/GameConsole'
import { LaptopDesktop } from './laptop/LaptopDesktop'
import { PanelHost } from './panels/PanelHost'
import { RoomGrid } from './room/RoomGrid'
import { RoomScene } from './room/RoomScene'
import type { ZoomTarget } from './room/zoom'

// three.js only loads when Brain mode is first needed (or once the page is idle).
const loadBrain = () => import('./brain/BrainScene')
const BrainScene = lazy(loadBrain)

interface Layer {
  key: number
  mode: Mode
}

export default function App() {
  const { path, mode } = useLocation()
  const compact = useMediaQuery(COMPACT_QUERY)
  const reduced = useReducedMotion()
  const section = sectionForPath(path)
  // In the Room, the projects live on the laptop and the games on the console under the
  // TV: the camera flies in to them instead of opening a panel.
  const zoomTo: ZoomTarget | null =
    mode !== 'room' ? null : section?.id === 'projects' ? 'laptop' : section?.id === 'games' ? 'console' : null

  // Phones get the real room too; the old grid of cards is one tap away as a list view.
  const [roomList, setRoomList] = useState(false)
  const listView = compact && roomList
  const touch = useMediaQuery('(hover: none)') || compact
  // Whether the Room camera flies in to the laptop or console (not from the list view).
  const camera = mode === 'room' && !listView

  const open = useCallback((id: SectionId) => navigate(sectionById[id].path), [])
  const close = useCallback(() => closeToScene(), [])

  // Keep the outgoing scene mounted underneath while the incoming one is revealed.
  const [layers, setLayers] = useState<Layer[]>([{ key: 0, mode }])
  const top = layers[layers.length - 1]
  if (top.mode !== mode) {
    setLayers([top, { key: top.key + 1, mode }])
  }

  const changeMode = (m: Mode) => {
    if (m === mode) return
    ambience.sfx(m === 'brain' ? 'toggle-brain' : 'toggle-room')
    setMode(m)
  }

  useEffect(() => ambience.setMode(mode), [mode])

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', mode === 'brain' ? '#05070A' : '#F4EFE4')
  }, [mode])

  useEffect(() => {
    document.title = section ? `${section.title} | ${site.name}` : `${site.name} | ${site.role}`
  }, [section])

  // Fetch the Brain code in the background so the first toggle is quick.
  useEffect(() => {
    const id = window.setTimeout(() => void loadBrain().catch(() => {}), 2500)
    return () => window.clearTimeout(id)
  }, [])

  const scene = (m: Mode) =>
    m === 'room' ? (
      listView ? (
        <RoomGrid onOpen={open} onBack={() => setRoomList(false)} />
      ) : (
        <RoomScene onOpen={open} zoomTo={zoomTo} touch={touch} onList={compact ? () => setRoomList(true) : undefined} />
      )
    ) : (
      <Suspense fallback={<div className="brain-scene" />}>
        <BrainScene onOpen={open} panelOpen={!!section} />
      </Suspense>
    )

  return (
    <div className={`app ${compact ? 'is-compact' : ''} ${section ? 'panel-open' : ''}`} data-mode={mode}>
      <TopBar mode={mode} onMode={changeMode} compact={compact} />
      <main className="scene-root" inert={section ? true : undefined}>
        <h1 className="sr-only">
          {site.name}: {site.role}
        </h1>
        {layers.map((l, i) => {
          const incoming = i === layers.length - 1 && layers.length > 1
          return (
            <motion.div
              key={l.key}
              className={`scene-layer scene-${l.mode}`}
              style={{ zIndex: i }}
              initial={incoming ? (reduced ? { opacity: 0 } : { clipPath: 'circle(0% at 50% 0%)' }) : false}
              animate={reduced ? { opacity: 1 } : { clipPath: 'circle(150% at 50% 0%)' }}
              transition={{ duration: reduced ? 0.2 : 0.75, ease: [0.7, 0, 0.3, 1] }}
              onAnimationComplete={() => {
                if (incoming) setLayers((ls) => ls.slice(-1))
              }}
              aria-hidden={i < layers.length - 1 ? true : undefined}
            >
              {scene(l.mode)}
            </motion.div>
          )
        })}
      </main>
      <BottomBar compact={compact} mode={mode} />
      <FxCanvas mode={mode} />
      <CursorGlow />
      <PanelHost section={zoomTo ? undefined : section} mode={mode} compact={compact} onClose={close} />
      <AnimatePresence initial={false}>
        {zoomTo === 'laptop' && <LaptopDesktop key="laptop" compact={compact} camera={camera} onClose={close} />}
        {zoomTo === 'console' && <GameConsole key="console" compact={compact} camera={camera} onClose={close} />}
      </AnimatePresence>
    </div>
  )
}
