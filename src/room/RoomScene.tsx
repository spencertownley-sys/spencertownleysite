import { useEffect, useState, type CSSProperties } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type Variants } from 'framer-motion'
import { sectionById, type ObjectId, type SectionId } from '../content/site'
import { ambience } from '../lib/audio'
import { PORTRAIT_QUERY, useMediaQuery, useReducedMotion } from '../lib/hooks'
import { FloorArt, WallArt, landscapeFurniture, portraitFurniture } from './Backdrop'
import { ObjectArt } from './ObjectArt'
import { landscape, portrait, roomObjects, type Layer, type Placement, type SceneLayout } from './objects'

interface Props {
  onOpen: (id: SectionId) => void
}

// TV screen bounds inside the cropped art, for the idle screen shimmer.
const TV_SCREEN = { left: '19.7%', top: '35.7%', width: '45.5%', height: '38.8%' }

export function RoomScene({ onOpen }: Props) {
  const isPortrait = useMediaQuery(PORTRAIT_QUERY)
  const reduced = useReducedMotion()
  const layout = isPortrait ? portrait : landscape
  const spec = isPortrait ? portraitFurniture : landscapeFurniture

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 50, damping: 18 })
  const sy = useSpring(py, { stiffness: 50, damping: 18 })
  const wallX = useTransform(sx, (v) => v * -5)
  const wallY = useTransform(sy, (v) => v * -3)
  const floorX = useTransform(sx, (v) => v * -12)
  const floorY = useTransform(sy, (v) => v * -6)

  useEffect(() => {
    if (reduced) return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      px.set((e.clientX / window.innerWidth - 0.5) * 2)
      py.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [px, py, reduced])

  // Every few seconds one object gives a small wiggle, a hint that things are clickable.
  const [nudge, setNudge] = useState<ObjectId | null>(null)
  useEffect(() => {
    if (reduced) return
    const ids = layout.placements.map((p) => p.id)
    let clear = 0
    const id = window.setInterval(() => {
      if (document.hidden) return
      setNudge(ids[Math.floor(Math.random() * ids.length)])
      clear = window.setTimeout(() => setNudge(null), 900)
    }, 5200)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(clear)
    }
  }, [layout, reduced])

  const stageStyle = { '--sw': layout.width, '--sh': layout.height } as CSSProperties
  const layer = (name: Layer) =>
    layout.placements
      .filter((p) => p.layer === name)
      .map((p) => <RoomObject key={p.id} placement={p} layout={layout} nudging={nudge === p.id} onOpen={onOpen} />)

  return (
    <div className={`room-scene ${isPortrait ? 'is-portrait' : ''}`}>
      <motion.div className="stage room-layer" style={{ ...stageStyle, x: wallX, y: wallY }}>
        <WallArt spec={spec} />
        {layer('wall')}
      </motion.div>
      <motion.div className="stage room-layer" style={{ ...stageStyle, x: floorX, y: floorY }}>
        <FloorArt spec={spec} />
        {layer('floor')}
      </motion.div>
    </div>
  )
}

function RoomObject({
  placement,
  layout,
  nudging,
  onOpen,
}: {
  placement: Placement
  layout: SceneLayout
  nudging: boolean
  onOpen: (id: SectionId) => void
}) {
  const def = roomObjects[placement.id]
  const section = sectionById[def.section]
  const h = (placement.w * def.crop.h) / def.crop.w
  const top = placement.bottom - h
  const r = placement.rotate ?? 0
  const tagBelow = placement.layer === 'wall'

  const body: Variants = {
    idle: { y: 0, scale: 1, rotate: r, transition: { type: 'spring', stiffness: 300, damping: 20 } },
    hover: {
      y: -14,
      scale: 1.06,
      rotate: [r, r - 3.5, r + 3, r - 1.5, r],
      transition: { y: { type: 'spring', stiffness: 420, damping: 16 }, scale: { type: 'spring', stiffness: 420, damping: 16 }, rotate: { duration: 0.55 } },
    },
    tap: { scale: 0.95, y: -6, transition: { duration: 0.08 } },
    nudge: { rotate: [r, r - 2.5, r + 2.5, r - 1, r], y: [0, -5, 0], transition: { duration: 0.75 } },
  }
  const shadow: Variants = {
    idle: { scaleX: 1, opacity: 1 },
    hover: { scaleX: 0.78, opacity: 0.55 },
    tap: { scaleX: 0.9, opacity: 0.8 },
    nudge: { scaleX: 1, opacity: 1 },
  }

  return (
    <motion.button
      type="button"
      className={`room-object obj-${placement.id} layer-${placement.layer}`}
      style={{
        left: `${(placement.x / layout.width) * 100}%`,
        top: `${(top / layout.height) * 100}%`,
        width: `${(placement.w / layout.width) * 100}%`,
        zIndex: placement.z ?? 0,
      }}
      initial="idle"
      animate={nudging ? 'nudge' : 'idle'}
      whileHover="hover"
      whileFocus="hover"
      whileTap="tap"
      onPointerEnter={() => ambience.sfx('hover')}
      onClick={() => {
        ambience.sfx('open')
        onOpen(section.id)
      }}
      aria-label={`${section.roomLabel}. ${def.name}.`}
    >
      {placement.layer === 'floor' && <motion.span className="object-shadow" variants={shadow} />}
      <motion.span className="object-body" variants={body}>
        <ObjectArt src={def.src} crop={def.crop} />
        {placement.id === 'tv' && <span className="tv-screen" style={TV_SCREEN} />}
      </motion.span>
      <span className={`object-tag ${tagBelow ? 'below' : ''}`} aria-hidden="true">
        {section.roomLabel}
      </span>
    </motion.button>
  )
}
