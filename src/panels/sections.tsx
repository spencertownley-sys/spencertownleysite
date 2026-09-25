import { lazy, Suspense, type ReactNode } from 'react'
import {
  countriesCopy,
  currently,
  framework,
  howIBuild,
  links,
  music,
  photography,
  projects,
  projectsCopy,
  site,
  travelAndPlanning,
  trips,
  video,
  work,
  youtube,
  type SectionId,
} from '../content/site'
import { countries, regions } from '../content/countries'
import { CameraIcon, DocIcon, GithubIcon, InstagramIcon, MailIcon, YoutubeIcon } from '../components/icons'
import { ExtLink, InLink, Placeholder, Section, Soon } from './ui'

const CountriesMap = lazy(() => import('./CountriesMap'))

function Work() {
  return (
    <>
      <p className="eyebrow-line">{work.eyebrow}</p>
      <p className="lead">{work.lead}</p>
      <ul className="chips" aria-label="Focus areas">
        {work.focus.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <div className="card-grid">
        <article className="card resume-card">
          <div className="card-icon">
            <DocIcon />
          </div>
          <div className="card-head">
            <h3>Resume</h3>
            {!work.resume.url && <Soon>PDF coming soon</Soon>}
          </div>
          {work.resume.url ? (
            <ExtLink href={work.resume.url}>Download the PDF</ExtLink>
          ) : (
            <>
              <p>{work.resume.placeholder}</p>
              <ExtLink href={`mailto:${site.email}?subject=Resume%20request`} icon={<MailIcon width={17} height={17} />}>
                Email for the resume
              </ExtLink>
            </>
          )}
        </article>
        <article className="card">
          <div className="card-head">
            <h3>Case studies</h3>
            <Soon>In progress</Soon>
          </div>
          <p>{work.caseStudies.placeholder}</p>
        </article>
      </div>

      <Section title="Proof points, shipped" aside={<InLink to="/projects">All projects</InLink>}>
        <ul className="proof-list">
          {projects.map((p) => (
            <li key={p.name}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="proof-item">
                <span className="proof-name">{p.name}</span>
                <span className="proof-host">{p.host}</span>
                <span className="proof-desc">{p.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Placeholder title="The longer story">{work.story.placeholder}</Placeholder>

      <div className="btn-row">
        <ExtLink href={`mailto:${site.email}`} icon={<MailIcon width={17} height={17} />}>
          {site.email}
        </ExtLink>
        <ExtLink href={links.github.url} icon={<GithubIcon width={17} height={17} />} variant="ghost">
          GitHub
        </ExtLink>
      </div>
    </>
  )
}

function Projects() {
  return (
    <>
      <p className="lead">{projectsCopy.lead}</p>
      <div className="project-list">
        {projects.map((p, i) => (
          <article key={p.name} className="card project-card" style={{ ['--i' as string]: i }}>
            <div className="card-head">
              <h3>{p.name}</h3>
              <span className="badge badge-live">{p.status}</span>
            </div>
            <p>{p.description}</p>
            <ul className="chips small">
              {p.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <ExtLink href={p.url} variant="ghost">
              {p.host}
            </ExtLink>
          </article>
        ))}
      </div>
      <div className="github-strip">
        <GithubIcon width={22} height={22} />
        <p>
          Code and experiments live on GitHub at <strong>{links.github.handle}</strong>.
        </p>
        <ExtLink href={links.github.url}>Open GitHub</ExtLink>
      </div>
      <p className="aside-link">
        <InLink to="/thinking/how-i-build">{projectsCopy.howLink}</InLink>
      </p>
    </>
  )
}

function Photography() {
  return (
    <>
      <p className="lead">{photography.lead}</p>
      <Section title="Portraits">
        <div className="photo-grid">
          {photography.portraits.map((p) => (
            <figure key={p.src} className={p.w > p.h ? 'is-wide' : 'is-tall'}>
              <img src={p.src} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </Section>
      <Section title="Landscapes and wildlife" aside={<Soon>Selects coming soon</Soon>}>
        <div className="photo-placeholders">
          {photography.placeholders.map((label, i) => (
            <div key={i} className="photo-ph">
              <CameraIcon width={22} height={22} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Section>
      <div className="btn-row">
        <ExtLink href={links.photoSite.url}>Full portfolio</ExtLink>
        <ExtLink href={links.photoInstagram.url} icon={<InstagramIcon width={17} height={17} />} variant="ghost">
          {links.photoInstagram.handle}
        </ExtLink>
        <ExtLink href={links.photoJournal.url} variant="ghost">
          The journal
        </ExtLink>
      </div>
    </>
  )
}

function Video() {
  return (
    <>
      <p className="lead">{video.lead}</p>
      <div className="reel-frame">
        <div className="reel-screen">
          <span className="reel-play" aria-hidden="true" />
          <span className="reel-label">Reel coming soon</span>
        </div>
      </div>
      <div className="btn-row">
        <ExtLink href={links.videoSite.url}>Video portfolio</ExtLink>
      </div>
    </>
  )
}

function Youtube() {
  return (
    <>
      <p className="lead">{youtube.lead}</p>
      <a className="channel-card" href={links.youtube.url} target="_blank" rel="noopener noreferrer">
        <span className="channel-icon">
          <YoutubeIcon width={34} height={34} />
        </span>
        <span className="channel-text">
          <strong>{site.name}</strong>
          <span>{links.youtube.handle}</span>
        </span>
        <span className="btn btn-solid">Visit the channel</span>
      </a>
    </>
  )
}

function Music() {
  return (
    <>
      <p className="lead">{music.lead}</p>
      <div className="btn-row">
        <ExtLink href={links.bandInstagram.url} icon={<InstagramIcon width={17} height={17} />}>
          {links.bandInstagram.handle}
        </ExtLink>
        <ExtLink href={links.bandYoutube.url} icon={<YoutubeIcon width={17} height={17} />}>
          {links.bandYoutube.handle}
        </ExtLink>
      </div>
      <article className="card callout">
        <div className="card-head">
          <h3>Where Downbeat came from</h3>
        </div>
        <p>{music.downbeat}</p>
        <div className="btn-row">
          <ExtLink href="https://trydownbeat.app" variant="ghost">
            trydownbeat.app
          </ExtLink>
          <InLink to="/projects">All projects</InLink>
        </div>
      </article>
    </>
  )
}

function Listen() {
  return (
    <div className="listen">
      <p>Spotted Zebra Music, straight from the source.</p>
      <div className="listen-links">
        <ExtLink href={links.bandInstagram.url} icon={<InstagramIcon width={18} height={18} />}>
          Instagram
        </ExtLink>
        <ExtLink href={links.bandYoutube.url} icon={<YoutubeIcon width={18} height={18} />}>
          YouTube
        </ExtLink>
      </div>
      <InLink to="/music">More about the band</InLink>
    </div>
  )
}

function Countries() {
  return (
    <>
      <p className="lead">{countriesCopy.lead}</p>
      <Suspense fallback={<div className="map-loading">Loading map</div>}>
        <CountriesMap />
      </Suspense>
      <div className="region-list">
        {regions.map((r) => {
          const list = countries.filter((c) => c.region === r)
          return (
            <section key={r}>
              <h3>
                {r} <span className="count">{list.length}</span>
              </h3>
              <ul>
                {list.map((c) => (
                  <li key={c.name}>{c.name}</li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      <div className="btn-row">
        <ExtLink href={links.travelInstagram.url} icon={<InstagramIcon width={17} height={17} />} variant="ghost">
          Travel Instagram
        </ExtLink>
        <InLink to="/trips">How I plan a trip</InLink>
      </div>
    </>
  )
}

function Trips() {
  return (
    <>
      <p className="lead">{trips.lead}</p>
      <Placeholder title="Example itinerary" badge="Itinerary coming soon">
        {trips.placeholder}
      </Placeholder>
      <ol className="timeline">
        {trips.skeleton.map((s) => (
          <li key={s.day}>
            <span className="t-day">{s.day}</span>
            <span className="t-title">{s.title}</span>
            <span className="t-note">{s.note}</span>
          </li>
        ))}
      </ol>
      <div className="btn-row">
        <ExtLink href={links.travelInstagram.url} icon={<InstagramIcon width={17} height={17} />}>
          {links.travelInstagram.handle}
        </ExtLink>
        <InLink to="/countries">Countries visited</InLink>
        <InLink to="/thinking/travel-and-planning">Why travel changes how I plan</InLink>
      </div>
    </>
  )
}

function HowIBuild() {
  return (
    <>
      <p className="lead">{howIBuild.lead}</p>
      <ol className="steps">
        {howIBuild.steps.map((s, i) => (
          <li key={s.title}>
            <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="step-title">{s.title}</span>
            <span className="step-note">{s.note}</span>
          </li>
        ))}
      </ol>
      <Section title="The evidence" aside={<InLink to="/projects">See them</InLink>}>
        <ul className="evidence">
          {howIBuild.evidence.map((e) => (
            <li key={e.name}>
              <strong>{e.name}</strong> <span>{e.note}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

function Framework() {
  return <Placeholder title="Reserved slot">{framework.placeholder}</Placeholder>
}

function Currently() {
  if (!currently.items.length) return <Placeholder title="Nothing written down yet">{currently.placeholder}</Placeholder>
  return (
    <ul className="evidence">
      {currently.items.map((c) => (
        <li key={c.title}>
          <strong>{c.title}</strong> <span>{c.note}</span>
        </li>
      ))}
    </ul>
  )
}

function TravelAndPlanning() {
  return (
    <>
      {travelAndPlanning.paragraphs.map((p, i) => (
        <p key={i} className={i === 0 ? 'lead' : ''}>
          {p}
        </p>
      ))}
      <div className="btn-row">
        <InLink to="/trips">How I plan a trip</InLink>
        <InLink to="/work">The work side</InLink>
      </div>
    </>
  )
}

export const sectionContent: Record<SectionId, () => ReactNode> = {
  work: Work,
  projects: Projects,
  photography: Photography,
  video: Video,
  youtube: Youtube,
  music: Music,
  listen: Listen,
  countries: Countries,
  trips: Trips,
  'how-i-build': HowIBuild,
  framework: Framework,
  currently: Currently,
  'travel-and-planning': TravelAndPlanning,
}
