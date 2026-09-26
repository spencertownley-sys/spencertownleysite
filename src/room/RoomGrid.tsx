import { motion } from 'framer-motion'
import { sectionById, site, type SectionId } from '../content/site'
import { ambience } from '../lib/audio'
import { gridOrder, roomObjects } from './objects'
import { RoomPhoto, useRoomView, WindowNote } from './RoomScene'

/** Mobile Room: the room drifting by up top, then the same objects as a simple grid. */
export function RoomGrid({ onOpen }: { onOpen: (id: SectionId) => void }) {
  const room = useRoomView({ interactive: false })
  return (
    <div className="room-grid-wrap">
      <div className="room-hero">
        <RoomPhoto canvas={room.canvas} img={room.img} ready={room.ready} flat={room.flat} />
      </div>
      <p className="grid-intro">
        {site.intro} <span className="grid-hint">{site.gridHint}</span>
      </p>
      <ul className="room-grid">
        {gridOrder.map((id, i) => {
          const def = roomObjects[id]
          const section = sectionById[def.section]
          return (
            <li key={id}>
              <motion.button
                type="button"
                className={`grid-tile tile-${id}`}
                onClick={() => {
                  ambience.sfx('open')
                  onOpen(section.id)
                }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.03 * i } }}
              >
                <img className="tile-photo" src={def.crop} alt="" loading="lazy" decoding="async" width={640} height={480} />
                <span className="tile-text">
                  <span className="tile-label">{section.roomLabel}</span>
                  <span className="tile-sub">{section.subtitle}</span>
                </span>
              </motion.button>
            </li>
          )
        })}
      </ul>
      <aside className="grid-window" aria-label="Out the window">
        <WindowNote />
      </aside>
    </div>
  )
}
