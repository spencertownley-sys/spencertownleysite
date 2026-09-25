import { useSyncExternalStore, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { links, site } from '../content/site'
import { ambience } from '../lib/audio'
import { closeToScene, navigate, type Mode } from '../lib/router'
import { ArrowIcon, CameraIcon, GithubIcon, InstagramIcon, MailIcon, SoundOffIcon, SoundOnIcon } from './icons'

export function SkipLink({ compact, className = '' }: { compact?: boolean; className?: string }) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    ambience.sfx('open')
    // From inside another panel, swap panels rather than stacking history.
    navigate('/work', { replace: window.location.pathname !== '/' })
  }
  return (
    <a className={`skip-link ${className}`} href="/work" onClick={go} aria-label={site.skipLabel}>
      {!compact && <span className="skip-long">{site.skipLabel}</span>}
      <span className="skip-short">Resume + case studies</span>
      <ArrowIcon width={16} height={16} />
    </a>
  )
}

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const options: { id: Mode; label: string }[] = [
    { id: 'room', label: 'Room' },
    { id: 'brain', label: 'Brain' },
  ]
  return (
    <div className="mode-toggle" role="group" aria-label="Experience">
      {options.map((o) => (
        <button key={o.id} type="button" className={mode === o.id ? 'is-active' : ''} aria-pressed={mode === o.id} onClick={() => onChange(o.id)}>
          {mode === o.id && <motion.span layoutId="toggle-thumb" className="toggle-thumb" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <span className="toggle-label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function MuteButton() {
  const muted = useSyncExternalStore(ambience.subscribe, () => ambience.muted)
  return (
    <button
      type="button"
      className={`mute-button ${muted ? 'is-muted' : ''}`}
      aria-pressed={muted}
      aria-label={muted ? 'Sound is off. Turn sound on' : 'Sound is on. Mute'}
      title={muted ? 'Turn sound on' : 'Mute'}
      onClick={() => ambience.setMuted(!muted)}
    >
      {muted ? <SoundOffIcon /> : <SoundOnIcon />}
      <span className="mute-label">{muted ? 'Sound off' : 'Sound on'}</span>
      {!muted && (
        <span className="eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  )
}

export function TopBar({ mode, onMode, compact }: { mode: Mode; onMode: (m: Mode) => void; compact: boolean }) {
  return (
    <header className="top-bar">
      <div className="top-left">
        <a
          className="wordmark"
          href="/"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) return
            e.preventDefault()
            closeToScene()
          }}
        >
          <span className="wordmark-name">{site.name}</span>
          <span className="wordmark-role">{site.role}</span>
        </a>
        {!compact && <SkipLink className="skip-top" />}
      </div>
      <div className="top-center">
        <ModeToggle mode={mode} onChange={onMode} />
      </div>
      <div className="top-right">
        <MuteButton />
      </div>
    </header>
  )
}

export function IconTray() {
  const items = [
    { ...links.travelInstagram, icon: <InstagramIcon /> },
    { ...links.photoInstagram, icon: <CameraIcon /> },
    { ...links.github, icon: <GithubIcon /> },
  ]
  return (
    <nav className="icon-tray" aria-label="Social links">
      {items.map((it) => (
        <a key={it.url} href={it.url} target="_blank" rel="noopener noreferrer" className="tray-link" aria-label={`${it.label} (${it.handle})`} data-tip={it.label}>
          {it.icon}
        </a>
      ))}
    </nav>
  )
}

export function BottomBar({ compact, mode }: { compact: boolean; mode: Mode }) {
  return (
    <footer className="bottom-bar">
      {compact && <SkipLink compact />}
      <IconTray />
      {!compact && <SkipLink className="skip-bottom" />}
      {!compact && mode === 'room' && (
        <p className="room-intro">
          {site.intro} <span>{site.roomHint}</span>
        </p>
      )}
      {!compact && (
        <a className="contact-link" href={`mailto:${site.email}`}>
          <MailIcon width={18} height={18} />
          <span>{site.email}</span>
        </a>
      )}
    </footer>
  )
}
