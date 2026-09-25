import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import brainSrc from '../assets/brain.svg'
import { BrainScene } from './brain/BrainScene'
import { BottomBar, TopBar } from './components/Chrome'
import { sectionForPath, site, type SectionId, sectionById } from './content/site'
import { FxCanvas } from './fx/FxCanvas'
import { ambience } from './lib/audio'
import { COMPACT_QUERY, useMediaQuery, useReducedMotion } from './lib/hooks'
import { closeToScene, navigate, setMode, useLocation, type Mode } from './lib/router'
import { PanelHost } from './panels/PanelHost'
import { RoomGrid } from './room/RoomGrid'
import { RoomScene } from './room/RoomScene'

interface Layer {
  key: number
  mode: Mode
}

export default function App() {
  const { path, mode } = useLocation()
  const compact = useMediaQuery(COMPACT_QUERY)
  const reduced = useReducedMotion()
  const section = sectionForPath(path)

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

  // Warm the Brain art so the first toggle is instant.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const img = new Image()
      img.src = brainSrc
      img.decode?.().catch(() => {})
    }, 1200)
    return () => window.clearTimeout(id)
  }, [])

  const scene = (m: Mode) =>
    m === 'room' ? compact ? <RoomGrid onOpen={open} /> : <RoomScene onOpen={open} /> : <BrainScene onOpen={open} panelOpen={!!section} />

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
      <PanelHost section={section} mode={mode} compact={compact} onClose={close} />
    </div>
  )
}
