import type { MouseEvent, ReactNode } from 'react'
import { navigate } from '../lib/router'
import { ArrowIcon, ExternalIcon } from '../components/icons'

export function ExtLink({ href, children, icon, variant = 'solid' }: { href: string; children: ReactNode; icon?: ReactNode; variant?: 'solid' | 'ghost' }) {
  const external = /^https?:/.test(href)
  return (
    <a className={`btn btn-${variant}`} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {icon}
      <span>{children}</span>
      {external && <ExternalIcon className="btn-ext" width={15} height={15} />}
    </a>
  )
}

export function InLink({ to, children }: { to: string; children: ReactNode }) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to, { replace: true })
  }
  return (
    <a className="inlink" href={to} onClick={go}>
      <span>{children}</span>
      <ArrowIcon width={15} height={15} />
    </a>
  )
}

export function Soon({ children = 'Coming soon' }: { children?: ReactNode }) {
  return <span className="badge badge-soon">{children}</span>
}

export function Placeholder({ title, children, badge }: { title: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="placeholder">
      <div className="placeholder-head">
        <h3>{title}</h3>
        <Soon>{badge ?? 'Coming soon'}</Soon>
      </div>
      <p>{children}</p>
    </div>
  )
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="p-section">
      <div className="p-section-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
