// All site copy, links, and section definitions live here so they can be edited
// without touching components. House style: no em dashes, anywhere.

export const site = {
  name: 'Spencer Townley',
  role: 'Product, AI, and process improvement',
  intro: 'I find where work gets stuck, then build the thing that unsticks it.',
  roomHint: 'Everything in this room opens something.',
  gridHint: 'Tap anything to open it.',
  brainHint: 'Same rooms, rewired as how I think. Hover a node.',
  brainTouchHint: 'Same rooms, rewired as how I think. Tap a node.',
  email: 'hello@spencertownley.com',
  github: 'https://github.com/spencertownley-sys',
  skipLabel: 'Skip to resume and case studies',
}

export const links = {
  travelInstagram: { label: 'Travel Instagram', handle: '@spencertownley', url: 'https://instagram.com/spencertownley' },
  photoInstagram: { label: 'Photography Instagram', handle: '@townley_photography', url: 'https://instagram.com/townley_photography' },
  github: { label: 'GitHub', handle: 'spencertownley-sys', url: 'https://github.com/spencertownley-sys' },
  youtube: { label: 'YouTube', handle: '@spencertownley', url: 'https://youtube.com/@spencertownley' },
  photoSite: { label: 'Townley Photography', handle: 'townleyphotography.com', url: 'https://townleyphotography.com' },
  photoJournal: { label: 'Photography journal', handle: 'townleyphotography.com/journal', url: 'https://townleyphotography.com/journal/' },
  videoSite: { label: 'Video portfolio', handle: 'townleyphotography.com/video', url: 'https://townleyphotography.com/video/' },
  bandInstagram: { label: 'Spotted Zebra on Instagram', handle: '@spottedzebramusic', url: 'https://instagram.com/spottedzebramusic' },
  bandYoutube: { label: 'Spotted Zebra on YouTube', handle: '@SpottedZebraMusic', url: 'https://youtube.com/@SpottedZebraMusic' },
} as const

/* ------------------------------------------------------------------ */
/* Sections: every Room object and Brain node opens one of these.      */
/* ------------------------------------------------------------------ */

export type SectionId =
  | 'work'
  | 'projects'
  | 'photography'
  | 'video'
  | 'youtube'
  | 'music'
  | 'listen'
  | 'countries'
  | 'trips'
  | 'how-i-build'
  | 'framework'
  | 'currently'
  | 'travel-and-planning'

export type ObjectId =
  | 'tv'
  | 'camera'
  | 'laptop'
  | 'plaque'
  | 'backpack'
  | 'poster'
  | 'passport'
  | 'guitar'
  | 'speaker'

export interface Section {
  id: SectionId
  path: string
  title: string
  /** Short line under the title in the panel header. */
  subtitle: string
  /** Room object that opens this section (brain-only sections have none). */
  object?: ObjectId
  /** Tag shown when hovering the Room object. */
  roomLabel?: string
  /** Compact sections render as a small link sheet instead of a full panel. */
  compact?: boolean
  brain: {
    region: string
    label: string
    teaser: string
    only?: boolean
  }
}

export const sections: Section[] = [
  {
    id: 'work',
    path: '/work',
    title: 'Career and resume',
    subtitle: 'Product, strategy, AI, and process improvement',
    object: 'backpack',
    roomLabel: 'Career + resume',
    brain: { region: 'Prefrontal cortex', label: 'Experience', teaser: 'career, resume, case studies' },
  },
  {
    id: 'projects',
    path: '/projects',
    title: 'Side projects, shipped',
    subtitle: 'AI and product work, built on my own time',
    object: 'laptop',
    roomLabel: 'AI + product projects',
    brain: { region: 'Parietal lobe', label: 'Side projects', teaser: 'four live builds, AI throughout' },
  },
  {
    id: 'photography',
    path: '/photography',
    title: 'Photography',
    subtitle: 'Portraits, landscapes, wildlife',
    object: 'camera',
    roomLabel: 'Photography',
    brain: { region: 'Visual cortex', label: 'Photography', teaser: 'portraits, landscapes, wildlife' },
  },
  {
    id: 'video',
    path: '/video',
    title: 'Videography',
    subtitle: 'Same eye, moving pictures',
    object: 'tv',
    roomLabel: 'Videography',
    brain: { region: 'Area V5 / motion', label: 'Videography', teaser: 'reels and client films' },
  },
  {
    id: 'youtube',
    path: '/youtube',
    title: 'YouTube',
    subtitle: 'youtube.com/@spencertownley',
    object: 'plaque',
    roomLabel: 'YouTube',
    brain: { region: "Broca's area", label: 'YouTube', teaser: 'the channel' },
  },
  {
    id: 'music',
    path: '/music',
    title: 'Spotted Zebra Music',
    subtitle: 'The band, and the loudest hobby I have',
    object: 'guitar',
    roomLabel: 'Music',
    brain: { region: 'Auditory cortex', label: 'Music', teaser: 'Spotted Zebra Music' },
  },
  {
    id: 'listen',
    path: '/listen',
    title: 'Spotted Zebra, on air',
    subtitle: 'Straight to the band',
    object: 'speaker',
    roomLabel: 'Band links',
    compact: true,
    brain: { region: 'Brainstem relay', label: 'Band links', teaser: 'Instagram and YouTube' },
  },
  {
    id: 'countries',
    path: '/countries',
    title: '47 countries and counting',
    subtitle: 'Where I have been, so far',
    object: 'poster',
    roomLabel: 'Countries visited',
    brain: { region: 'Hippocampus', label: 'Countries visited', teaser: 'spatial memory: 47 countries' },
  },
  {
    id: 'trips',
    path: '/trips',
    title: 'Trip planning',
    subtitle: 'How I put an itinerary together',
    object: 'passport',
    roomLabel: 'Trip planning',
    brain: { region: 'Frontal pole', label: 'Trip planning', teaser: 'an example itinerary' },
  },
  {
    id: 'how-i-build',
    path: '/thinking/how-i-build',
    title: 'How I build',
    subtitle: 'The pattern across the side projects',
    brain: { region: 'Motor cortex', label: 'How I build', teaser: 'days, not slide decks', only: true },
  },
  {
    id: 'framework',
    path: '/thinking/framework',
    title: 'A framework I keep coming back to',
    subtitle: 'Reserved slot',
    brain: { region: 'Association cortex', label: 'A framework', teaser: 'the one I keep coming back to', only: true },
  },
  {
    id: 'currently',
    path: '/thinking/currently',
    title: 'Currently obsessed with',
    subtitle: 'Whatever is pulling focus right now',
    brain: { region: 'Reward circuit', label: 'Currently obsessed', teaser: 'what has my attention', only: true },
  },
  {
    id: 'travel-and-planning',
    path: '/thinking/travel-and-planning',
    title: 'Why travel changes how I plan',
    subtitle: 'Where the hobby and the day job meet',
    brain: { region: 'Corpus callosum', label: 'Travel x planning', teaser: 'the bridge between the two', only: true },
  },
]

export const sectionById = Object.fromEntries(sections.map((s) => [s.id, s])) as Record<SectionId, Section>

export function sectionForPath(path: string): Section | undefined {
  const clean = path.replace(/\/+$/, '') || '/'
  return sections.find((s) => s.path === clean)
}

/* ------------------------------------------------------------------ */
/* Section content                                                     */
/* ------------------------------------------------------------------ */

export interface Project {
  name: string
  url: string
  host: string
  description: string
  tags: string[]
  status: string
}

export const projects: Project[] = [
  {
    name: 'Seahawks Points Pool',
    url: 'https://points-pool-production.up.railway.app',
    host: 'points-pool-production.up.railway.app',
    description:
      "A tablet kiosk app built for my team's monthly Seahawks score-picking contest, twelve of us competing all season, done up in 8-bit style.",
    tags: ['Kiosk app', 'Team tool', '8-bit UI'],
    status: 'Live',
  },
  {
    name: 'Make That',
    url: 'https://makethat.wtf',
    host: 'makethat.wtf',
    description:
      'A site that helps answer the question everyone building with AI eventually asks: what should I actually make?',
    tags: ['AI', 'Idea generation'],
    status: 'Live',
  },
  {
    name: 'Shortlist',
    url: 'https://shortlist.spencertownley.workers.dev',
    host: 'shortlist.spencertownley.workers.dev',
    description:
      'A simple tool for narrowing down photos as a group: upload a batch, share one link, and head-to-head matchups surface everyone\'s favorites.',
    tags: ['Group decisions', 'Photo workflow'],
    status: 'Live',
  },
  {
    name: 'Downbeat',
    url: 'https://trydownbeat.app',
    host: 'trydownbeat.app',
    description:
      'A scheduling app for bands, built to solve the actual headache of coordinating rehearsals and building a setlist everyone can vote on, or veto.',
    tags: ['Scheduling', 'Built for my band'],
    status: 'Live',
  },
]

export const projectsCopy = {
  lead:
    'Things I have built on my own time, each one because a real problem kept bugging me. AI does a lot of the heavy lifting; the problems are all real, and so are the people using them.',
  howLink: 'The pattern behind all four',
}

export const work = {
  eyebrow: 'For recruiters and hiring managers',
  lead:
    'I work across product management, strategy, AI, and process improvement. The short version: I find where work gets stuck, figure out why, and build the thing that fixes it.',
  focus: ['Product management', 'Strategy', 'Applied AI', 'Process improvement'],
  resume: {
    // Set `url` to the PDF path (for example '/spencer-townley-resume.pdf') once it exists.
    url: null as string | null,
    placeholder: 'The PDF is on its way. Until then, email me and I will send the current version the same day.',
  },
  caseStudies: {
    placeholder:
      'More case studies, drawn from my work at Princess, are on the way. Each one will cover the problem, what I changed, and what it moved.',
  },
  story: {
    placeholder:
      'The longer career story, where I have been and what I owned there, is being written. The resume will cover it first.',
  },
}

export const countriesCopy = {
  lead: 'Forty-seven and counting. Hover the map, or pick a region to zoom in.',
}

export const photography = {
  lead:
    'I shoot as Townley Photography: mostly people, plus whatever the light is doing wherever I happen to be.',
  portraits: [
    { src: '/photos/tile-portrait.jpg', alt: 'Family portrait in warm evening light, parents holding their baby', w: 900, h: 698, caption: 'Family session' },
    { src: '/photos/gallery-portrait-1.jpg', alt: 'A one year old mid cake smash, frosting on their face', w: 667, h: 1000, caption: 'First birthday cake smash' },
    { src: '/photos/gallery-portrait-2.jpg', alt: 'Family session with a new baby', w: 667, h: 1000, caption: 'Family with baby' },
    { src: '/photos/gallery-portrait-3.jpg', alt: 'Studio portrait session', w: 1000, h: 800, caption: 'Studio session' },
  ],
  placeholders: ['Landscape select', 'Landscape select', 'Wildlife select', 'Wildlife select'],
}

export const video = {
  lead:
    'Video gets its own shelf. Same eye as the stills, just with a timeline. A reel is being cut; until then, the full video portfolio lives on Townley Photography.',
}

export const youtube = {
  lead:
    'The channel. Videos go up when there is something worth showing, which is a higher bar than it sounds.',
}

export const music = {
  lead:
    'Spotted Zebra Music is one of my biggest hobbies and easily the loudest. Rehearsals, setlists, the occasional show.',
  downbeat:
    'It is also where Downbeat came from. Getting a band into the same room at the same time is harder than learning the songs, so I built the app that fixes it, setlist votes and vetoes included.',
}

export const trips = {
  lead:
    'I plan trips the way I plan projects: figure out what actually matters, sequence it, and leave room for the good surprises.',
  placeholder:
    'A complete example itinerary is coming soon. Here is the shape each one takes.',
  skeleton: [
    { day: 'Before', title: 'The brief', note: 'Who is going, what they care about, what they would hate.' },
    { day: 'Day 1', title: 'Land and get oriented', note: 'Nothing ambitious. Walk, eat, sleep.' },
    { day: 'Days 2 to 4', title: 'The anchor', note: 'The one thing the whole trip is built around.' },
    { day: 'Day 5', title: 'Slack day', note: 'Deliberately empty. Something always needs it.' },
    { day: 'After', title: 'The debrief', note: 'What worked, what to change next time.' },
  ],
}

export const howIBuild = {
  lead: 'An idea becomes a real, working thing in days, not a slide deck.',
  steps: [
    { title: 'Start with a real annoyance', note: 'Mine, or one belonging to people I can actually talk to.' },
    { title: 'Build the smallest version that works', note: 'Working beats impressive. AI makes this part fast.' },
    { title: 'Put it in front of the people with the problem', note: 'The office, the band, the group chat.' },
    { title: 'Keep what they use', note: 'Cut the rest without getting sentimental about it.' },
  ],
  evidence: [
    { name: 'Seahawks Points Pool', note: 'Twelve coworkers, one season, one kiosk.' },
    { name: 'Downbeat', note: 'My own band, my own scheduling headache.' },
    { name: 'Shortlist', note: 'Picking photos as a group, without the group chat.' },
    { name: 'Make That', note: 'What should I actually make?' },
  ],
}

export const framework = {
  placeholder: 'Reserved. The framework goes here once it is written down properly.',
}

export const currently = {
  // Easy to update: edit this list.
  items: [] as { title: string; note: string }[],
  placeholder: 'This slot changes often. It is empty until the next obsession gets written down.',
}

export const travelAndPlanning = {
  paragraphs: [
    'Planning four countries in ten days is a process problem with better food. You map the dependencies (ferries, borders, opening hours), find the bottleneck, and build slack in where things usually go wrong.',
    'The same instinct shows up at work. Sequence it, stress test it, then leave room for the good surprises.',
  ],
}

export const audio = {
  // Optional: drop real loops in /public/audio and set these to use them instead
  // of the generated ambience, for example '/audio/room.mp3'.
  roomTrack: null as string | null,
  brainTrack: null as string | null,
}
