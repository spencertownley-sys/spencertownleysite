// The laptop in the Room: the camera flies into its screen, and this desktop takes
// over. Folders open small windows with a README and a live preview of each project.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { howIBuild, laptop, links, projects, projectsCopy, sectionById, site, work, type Project } from '../content/site'
import { ExternalIcon } from '../components/icons'
import { ambience } from '../lib/audio'
import { useNow, useReducedMotion } from '../lib/hooks'
import { navigate } from '../lib/router'
import wallpaperLarge from '../assets/desk/wallpaper-2688.webp'
import wallpaperSmall from '../assets/desk/wallpaper-1440.webp'
import { useArrived, useScreenBox } from '../room/zoom'

type Item =
  | { kind: 'project'; id: string; label: string; project: Project }
  | { kind: 'cases'; id: 'cases'; label: string }
  | { kind: 'text'; id: 'how'; label: string }
  | { kind: 'resume'; id: 'resume'; label: string }

const items: Item[] = [
  ...projects.map((p): Item => ({ kind: 'project', id: p.id, label: p.name, project: p })),
  { kind: 'cases', id: 'cases', label: laptop.extras.cases.name },
  { kind: 'text', id: 'how', label: laptop.extras.howIBuild.name },
  { kind: 'resume', id: 'resume', label: laptop.extras.resume.name },
]

/** Shortcuts that leave the site, kept in a dock along the bottom like a Mac's. */
const dock: { id: 'linkedin' | 'github' | 'mail'; label: string; href: string }[] = [
  { id: 'linkedin', label: laptop.extras.linkedin.name, href: links.linkedin.url },
  { id: 'github', label: laptop.extras.github.name, href: links.github.url },
  { id: 'mail', label: laptop.extras.mail.name, href: `mailto:${site.email}` },
]

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

interface Props {
  compact: boolean
  /** True when the Room camera is flying in to the laptop (show the desktop once it lands). */
  camera: boolean
  onClose: () => void
}

export function LaptopDesktop({ compact, camera, onClose }: Props) {
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = items.find((i) => i.id === openId) ?? null
  const iconRefs = useRef<Record<string, HTMLElement | null>>({})
  const box = useScreenBox(compact ? null : 'laptop')
  // show the desktop once the camera has landed on the screen, so the two line up
  const arrived = useArrived('laptop', !camera)

  useLayoutEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    root.current?.focus({ preventScroll: true })
    return () => {
      const el = returnFocus.current
      if (el && document.contains(el)) el.focus({ preventScroll: true })
    }
  }, [])

  const closeWindow = () => {
    const id = openId
    setOpenId(null)
    ambience.sfx('close')
    if (id) requestAnimationFrame(() => iconRefs.current[id]?.focus({ preventScroll: true }))
  }

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (openId) closeWindow()
      else {
        ambience.sfx('close')
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !root.current) return
    const els = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
    if (!els.length) return
    const first = els[0]
    const last = els[els.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const activate = (item: Item) => {
    ambience.sfx('open')
    setOpenId(item.id)
  }

  const leave = () => {
    ambience.sfx('close')
    onClose()
  }

  return (
    <>
      {box && (
        // the room around the laptop: clicking it steps back out
        <motion.div
          className="desk-backdrop"
          aria-hidden="true"
          onClick={leave}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      <motion.div
        ref={root}
        className={`desk ${compact ? 'is-compact' : 'is-framed'}`}
        style={box ? { left: box.x, top: box.y, width: box.w, height: box.h } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={`${laptop.owner}: ${sectionById.projects.title}`}
        tabIndex={-1}
        onKeyDown={trap}
        initial={{ opacity: 0 }}
        animate={{ opacity: arrived ? 1 : 0, transition: { duration: reduced ? 0.2 : 0.35 } }}
        exit={{ opacity: 0, transition: { duration: reduced ? 0.15 : 0.3 } }}
      >
        <img
          className="desk-wallpaper"
          src={wallpaperSmall}
          srcSet={`${wallpaperSmall} 1440w, ${wallpaperLarge} 2688w`}
          sizes={box ? `${Math.round(box.w)}px` : '100vw'}
          alt=""
          aria-hidden="true"
          draggable={false}
        />

        <MenuBar onBack={leave} />

        <div className="desk-surface">
          <h2 className="sr-only">{sectionById.projects.title}</h2>
          <ul className="desk-icons" aria-label="Desktop">
            {items.map((item) => (
              <li key={item.id}>
                <DeskIcon item={item} selected={openId === item.id} onOpen={() => activate(item)} refFn={(el) => void (iconRefs.current[item.id] = el)} />
              </li>
            ))}
          </ul>

          <aside className="desk-sticky" aria-label="Note">
            <strong>{sectionById.projects.title}</strong>
            <p>{projectsCopy.lead}</p>
            <p className="sticky-hint">{compact ? laptop.touchHint : laptop.hint}</p>
          </aside>
        </div>

        <nav className="desk-dock" aria-label="Dock">
          {dock.map((d) => {
            const external = d.href.startsWith('http')
            return (
              <a
                key={d.id}
                className="dock-item"
                href={d.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={() => ambience.sfx('open')}
                data-tip={d.label}
              >
                <DockArt id={d.id} />
                <span className="sr-only">
                  {d.label}
                  {external ? ' (opens in a new tab)' : ''}
                </span>
              </a>
            )
          })}
        </nav>

        <AnimatePresence>
          {open && (
            <DeskWindow key={open.id} item={open} compact={compact} reduced={reduced} onClose={closeWindow} />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}

function MenuBar({ onBack }: { onBack: () => void }) {
  const now = useNow(20000)
  const day = now.toLocaleDateString(undefined, { weekday: 'short' })
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return (
    <header className="desk-bar">
      <span className="desk-owner">
        <span className="desk-mark" aria-hidden="true" />
        {laptop.owner}
      </span>
      <span className="desk-menus" aria-hidden="true">
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Go</span>
      </span>
      <span className="desk-status">
        <span className="desk-clock" aria-hidden="true">
          {day} {time}
        </span>
        <button type="button" className="desk-back" onClick={onBack}>
          <span>Back to the room</span>
          <kbd>Esc</kbd>
        </button>
      </span>
    </header>
  )
}

function DeskIcon({ item, selected, onOpen, refFn }: { item: Item; selected: boolean; onOpen: () => void; refFn: (el: HTMLElement | null) => void }) {
  return (
    <button ref={refFn} type="button" className={`desk-icon ${selected ? 'is-selected' : ''}`} onClick={onOpen} aria-haspopup="dialog">
      <IconArt item={item} />
      <span className="icon-label">{item.label}</span>
    </button>
  )
}

/** Hand-drawn icons: manila folders with a small emblem, plus file and link icons. */
function IconArt({ item }: { item: Item }) {
  if (item.kind === 'project') {
    return (
      <svg className="icon-art" viewBox="0 0 64 52" aria-hidden="true">
        <path d="M3 9a4 4 0 0 1 4-4h15l5 5h30a4 4 0 0 1 4 4v3H3z" fill="#c9923f" />
        <rect x="3" y="14" width="58" height="35" rx="4" fill="#e8b460" />
        <rect x="3" y="14" width="58" height="4" rx="2" fill="#f3c97c" />
        <g transform="translate(32 32)" fill="none" stroke="#9a6524" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
          {emblem(item.id)}
        </g>
      </svg>
    )
  }
  if (item.kind === 'text' || item.kind === 'resume') {
    const pdf = item.kind === 'resume'
    return (
      <svg className="icon-art" viewBox="0 0 64 52" aria-hidden="true">
        <path d="M18 2h20l10 10v37a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fdfbf6" stroke="#cfc6b8" />
        <path d="M38 2v8a2 2 0 0 0 2 2h8" fill="#ece5d8" stroke="#cfc6b8" />
        {pdf ? (
          <>
            <rect x="12" y="30" width="30" height="12" rx="2" fill="#d94b3d" />
            <text x="27" y="39.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">
              PDF
            </text>
          </>
        ) : (
          <g stroke="#a99f90" strokeWidth="1.6" strokeLinecap="round">
            <path d="M22 20h20M22 25h20M22 30h16M22 35h20M22 40h12" />
          </g>
        )}
      </svg>
    )
  }
  // the case studies folder
  return (
    <svg className="icon-art" viewBox="0 0 64 52" aria-hidden="true">
      <path d="M3 9a4 4 0 0 1 4-4h15l5 5h30a4 4 0 0 1 4 4v3H3z" fill="#5f86b8" />
      <rect x="3" y="14" width="58" height="35" rx="4" fill="#7ea6d6" />
      <rect x="3" y="14" width="58" height="4" rx="2" fill="#a3c3e8" />
      <g transform="translate(32 32)" fill="none" stroke="#2f5585" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        <path d="M-9 8h18M-6 8V2M0 8v-9M6 8v-5" />
      </g>
    </svg>
  )
}

function DockArt({ id }: { id: 'linkedin' | 'github' | 'mail' }) {
  if (id === 'linkedin') {
    return (
      <svg className="dock-art" viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="11" fill="#0a66c2" />
        <path d="M15 20v14M15 13.5v.5M22 34V20M22 26.5c0-3.6 2.2-6.5 5.5-6.5s5 2.4 5 6V34" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
    )
  }
  if (id === 'github') {
    return (
      <svg className="dock-art" viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="11" fill="#24292f" />
        <path d="M19 16l-8 8 8 8M29 16l8 8-8 8M26.5 13l-5 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="dock-art" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#3d8bfd" />
      <rect x="9" y="13" width="30" height="22" rx="3" fill="#fff" />
      <path d="M10 15l14 10 14-10" fill="none" stroke="#3d8bfd" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  )
}

function emblem(id: string) {
  switch (id) {
    case 'points-pool': // a trophy
      return (
        <>
          <path d="M-6-8h12v5a6 6 0 0 1-12 0z" />
          <path d="M-6-6h-3a3 3 0 0 0 4 4M6-6h3a3 3 0 0 1-4 4M0 3v3M-4 8h8" />
        </>
      )
    case 'make-that': // a light bulb
      return (
        <>
          <path d="M-4 3a6.5 6.5 0 1 1 8 0v2h-8z" />
          <path d="M-3 8h6" />
        </>
      )
    case 'shortlist': // two photos, one starred
      return (
        <>
          <rect x="-9" y="-7" width="10" height="13" rx="1.5" />
          <rect x="-1" y="-5" width="10" height="13" rx="1.5" />
          <path d="M4 -1l1 2 2 .3-1.5 1.4.4 2.1L4 3.8 2.1 4.8l.4-2.1L1 1.3l2-.3z" strokeWidth="1.2" />
        </>
      )
    default: // a music note
      return (
        <>
          <path d="M-2 5V-8l8-2v12" />
          <circle cx="-4.5" cy="5.5" r="2.6" />
          <circle cx="3.5" cy="2.5" r="2.6" />
        </>
      )
  }
}

/* ---------------- windows ---------------- */

function DeskWindow({ item, compact, reduced, onClose }: { item: Item; compact: boolean; reduced: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = `desk-win-${item.id}`
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  const title = item.kind === 'project' ? `${item.project.name}` : item.label
  const from = reduced ? { opacity: 0 } : compact ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.94, y: 12 }
  return (
    <motion.div
      ref={ref}
      className={`desk-window win-${item.kind}`}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      initial={from}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ ...from, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <div className="win-bar">
        <span className="win-dots">
          <button type="button" className="win-dot is-close" aria-label="Close window" onClick={onClose} />
          <span className="win-dot is-min" aria-hidden="true" />
          <span className="win-dot is-max" aria-hidden="true" />
        </span>
        <span id={titleId} className="win-title">
          {title}
        </span>
        <span className="win-bar-end" />
      </div>
      {item.kind === 'project' && <ProjectWindow project={item.project} />}
      {item.kind === 'cases' && <CasesWindow />}
      {item.kind === 'text' && <HowIBuildFile />}
      {item.kind === 'resume' && <ResumeFile onClose={onClose} />}
    </motion.div>
  )
}

function ProjectWindow({ project }: { project: Project }) {
  const [tab, setTab] = useState<'readme' | 'preview'>('readme')
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="win-body win-split">
      <nav className="win-side" aria-label={`${project.name} folder`}>
        <p className="side-head">Files</p>
        <button type="button" className={`side-item ${tab === 'readme' ? 'is-active' : ''}`} onClick={() => setTab('readme')} aria-pressed={tab === 'readme'}>
          <FileGlyph /> README.md
        </button>
        <button type="button" className={`side-item ${tab === 'preview' ? 'is-active' : ''}`} onClick={() => setTab('preview')} aria-pressed={tab === 'preview'}>
          <GlobeGlyph /> Live preview
        </button>
        <a className="side-item side-link" href={project.url} target="_blank" rel="noopener noreferrer">
          <ExternalIcon width={15} height={15} /> Open the site
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </nav>
      {tab === 'readme' ? (
        <article className="readme">
          <p className="readme-path">~/Projects/{project.name}/README.md</p>
          <h3>
            {project.name} <span className="readme-status">{project.status}</span>
          </h3>
          <p className="readme-desc">{project.description}</p>
          <h4>Why I built it</h4>
          <p>{project.why}</p>
          <h4>Tags</h4>
          <ul className="readme-tags">
            {project.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4>Try it</h4>
          <p className="readme-actions">
            <button type="button" className="readme-btn" onClick={() => setTab('preview')}>
              See it running here
            </button>
            <a className="readme-btn is-ghost" href={project.url} target="_blank" rel="noopener noreferrer">
              {project.host} <ExternalIcon width={14} height={14} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </article>
      ) : (
        <div className="preview">
          <div className="preview-bar">
            <span className="preview-url">
              <LockGlyph /> {project.host}
            </span>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="preview-open">
              Open in a new tab <ExternalIcon width={13} height={13} />
            </a>
          </div>
          <div className={`preview-frame ${loaded ? 'is-loaded' : ''}`}>
            <iframe
              src={project.url}
              title={`${project.name}, live`}
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              onLoad={() => setLoaded(true)}
            />
            {!loaded && <p className="preview-wait">Loading {project.host}. If it stays blank, open it in a new tab.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function CasesWindow() {
  const list = work.caseStudies.items
  const [i, setI] = useState(0)
  const c = list[i]
  const file = (k: number) => `${list[k].title ?? `Case study ${k + 1}`}.md`
  const steps: [string, string | null, string][] = [
    ['Problem', c.problem, 'What was stuck.'],
    ['What I changed', c.change, 'The fix, and how it got adopted.'],
    ['Result', c.result, 'What it moved, in numbers.'],
  ]
  return (
    <div className="win-body win-split">
      <nav className="win-side" aria-label="Case studies">
        <p className="side-head">Case studies</p>
        {list.map((item, k) => (
          <button key={item.id} type="button" className={`side-item ${k === i ? 'is-active' : ''}`} onClick={() => setI(k)} aria-pressed={k === i}>
            <FileGlyph /> {file(k)}
          </button>
        ))}
      </nav>
      <article className="readme">
        <p className="readme-path">~/Case studies/{file(i)}</p>
        <h3>
          {c.title ?? 'Case study in progress'} {!c.title && <span className="readme-status is-soon">Coming soon</span>}
        </h3>
        {c.org && <p className="readme-desc">{c.org}</p>}
        {!c.title && <p>{work.caseStudies.placeholder}</p>}
        {steps.map(([label, text, hint]) => (
          <div key={label}>
            <h4>{label}</h4>
            <p className={text ? '' : 'readme-hint'}>{text ?? hint}</p>
          </div>
        ))}
        {c.url && (
          <p className="readme-actions">
            <a className="readme-btn" href={c.url} target="_blank" rel="noopener noreferrer">
              Read the full case study <ExternalIcon width={14} height={14} />
            </a>
          </p>
        )}
      </article>
    </div>
  )
}

function HowIBuildFile() {
  return (
    <div className="win-body txt">
      <p className="txt-line is-head"># {sectionById['how-i-build'].title}</p>
      <p className="txt-line">{howIBuild.lead}</p>
      <p className="txt-line is-gap" />
      {howIBuild.steps.map((s, i) => (
        <p key={s.title} className="txt-line">
          {i + 1}. {s.title}
          <span className="txt-note">   {s.note}</span>
        </p>
      ))}
      <p className="txt-line is-gap" />
      <p className="txt-line is-head">## Where it shows up</p>
      {howIBuild.evidence.map((e) => (
        <p key={e.name} className="txt-line">
          - {e.name}: <span className="txt-note">{e.note}</span>
        </p>
      ))}
      <p className="txt-line is-gap" />
      <p className="txt-line txt-cursor" aria-hidden="true" />
    </div>
  )
}

function ResumeFile({ onClose }: { onClose: () => void }) {
  return (
    <div className="win-body doc">
      <div className="doc-page">
        <p className="doc-eyebrow">{work.eyebrow}</p>
        <h3>{site.name}</h3>
        <p className="doc-role">{site.role}</p>
        <p>{work.lead}</p>
        <ul className="readme-tags">
          {work.focus.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="doc-actions">
          {work.resume.url ? (
            <a className="readme-btn" href={work.resume.url} target="_blank" rel="noopener noreferrer">
              Download the PDF
            </a>
          ) : (
            <>
              <p className="doc-note">{work.resume.placeholder}</p>
              <a className="readme-btn" href={`mailto:${site.email}?subject=Resume%20request`}>
                Email for the resume
              </a>
            </>
          )}
          <a className="readme-btn is-ghost" href={links.linkedin.url} target="_blank" rel="noopener noreferrer">
            LinkedIn <ExternalIcon width={14} height={14} />
          </a>
          <button
            type="button"
            className="readme-btn is-ghost"
            onClick={() => {
              onClose()
              navigate(sectionById.work.path, { replace: true })
            }}
          >
            Open the full work section
          </button>
        </div>
      </div>
    </div>
  )
}

const glyph = (children: ReactNode) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const FileGlyph = () => glyph(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>)
const GlobeGlyph = () => glyph(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>)
const LockGlyph = () => glyph(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>)
