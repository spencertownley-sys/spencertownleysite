import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, type TargetAndTransition } from 'framer-motion'
import type { Section } from '../content/site'
import { CloseIcon } from '../components/icons'
import { ambience } from '../lib/audio'
import { useReducedMotion } from '../lib/hooks'
import type { Mode } from '../lib/router'
import { ObjectArt } from '../room/ObjectArt'
import { roomObjects } from '../room/objects'
import { sectionContent } from './sections'

interface Props {
  section: Section | undefined
  mode: Mode
  compact: boolean
  onClose: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'

export function PanelHost({ section, mode, compact, onClose }: Props) {
  const reduced = useReducedMotion()
  const returnFocus = useRef<HTMLElement | null>(null)
  const open = !!section

  // Layout effect so this runs before the panel's own effect moves focus into it.
  useLayoutEffect(() => {
    if (open) returnFocus.current ??= document.activeElement as HTMLElement | null
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        ambience.sfx('close')
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) return
    const el = returnFocus.current
    returnFocus.current = null
    if (el && document.contains(el)) el.focus({ preventScroll: true })
  }, [open])

  const small = !!section?.compact
  const from: TargetAndTransition = reduced ? { opacity: 0 } : small ? { opacity: 0, scale: 0.92, y: 16 } : compact ? { y: '100%' } : { x: '108%' }
  const to: TargetAndTransition = reduced ? { opacity: 1 } : small ? { opacity: 1, scale: 1, y: 0 } : compact ? { y: 0 } : { x: 0 }

  return (
    <AnimatePresence>
      {section && (
        <motion.div
          key="backdrop"
          className="panel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => {
            ambience.sfx('close')
            onClose()
          }}
        />
      )}
      {section && (
        <Panel key={section.id} section={section} mode={mode} small={small} from={from} to={to} onClose={onClose} />
      )}
    </AnimatePresence>
  )
}

function Panel({
  section,
  mode,
  small,
  from,
  to,
  onClose,
}: {
  section: Section
  mode: Mode
  small: boolean
  from: TargetAndTransition
  to: TargetAndTransition
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const Content = sectionContent[section.id]
  const obj = section.object ? roomObjects[section.object] : null
  const titleId = `panel-title-${section.id}`

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !ref.current) return
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const eyebrow = mode === 'brain' ? section.brain.region : obj ? obj.name : 'Brain only'

  return (
    <motion.div
      ref={ref}
      className={`panel ${small ? 'is-small' : ''} panel-${section.id}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={trap}
      initial={from}
      animate={to}
      exit={{ ...from, transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
    >
      <header className="panel-head">
        {obj ? (
          <span className="panel-art" aria-hidden="true">
            <ObjectArt src={obj.src} crop={obj.crop} />
          </span>
        ) : (
          <span className="panel-glyph" aria-hidden="true" />
        )}
        <div className="panel-titles">
          <p className="panel-eyebrow">{eyebrow}</p>
          <h2 id={titleId}>{section.title}</h2>
          <p className="panel-sub">{section.subtitle}</p>
        </div>
        <button
          type="button"
          className="panel-close"
          aria-label="Close"
          onClick={() => {
            ambience.sfx('close')
            onClose()
          }}
        >
          <CloseIcon />
        </button>
      </header>
      <div className="panel-body">
        <Content />
      </div>
    </motion.div>
  )
}
