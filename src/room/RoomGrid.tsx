import { motion } from 'framer-motion'
import { sectionById, site, type SectionId } from '../content/site'
import { ambience } from '../lib/audio'
import { ObjectArt } from './ObjectArt'
import { gridOrder, roomObjects } from './objects'

/** Mobile Room: the same objects as a simple, scrollable grid. */
export function RoomGrid({ onOpen }: { onOpen: (id: SectionId) => void }) {
  return (
    <div className="room-grid-wrap">
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
                whileTap={{ scale: 0.96, rotate: i % 2 ? 1.5 : -1.5 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.03 * i } }}
              >
                <span className="tile-art">
                  <ObjectArt src={def.src} crop={def.crop} />
                </span>
                <span className="tile-label">{section.roomLabel}</span>
                <span className="tile-sub">{section.subtitle}</span>
              </motion.button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
