// All site copy, links, and section definitions live here so they can be edited
// without touching components. House style: no em dashes, anywhere.

export const site = {
  name: 'Spencer Townley',
  role: 'Product, AI, and process improvement',
  intro: 'I find where work gets stuck, then build the thing that unsticks it.',
  roomHint: 'Every glowing dot opens something. Drag or scroll to move through the room.',
  gridHint: 'Tap anything to open it.',
  touchHint: 'Swipe to look around. Tap a glowing dot to open it.',
  brainHint: 'Same rooms, rewired as how I think. Hover a node.',
  brainTouchHint: 'Same rooms, rewired as how I think. Tap a node.',
  email: 'hello@spencertownley.com',
  github: 'https://github.com/spencertownley-sys',
  skipLabel: 'Skip to career and resume',
}

export const links = {
  travelInstagram: { label: 'Travel Instagram', handle: '@spencertownley', url: 'https://instagram.com/spencertownley' },
  photoInstagram: { label: 'Photography Instagram', handle: '@townley_photography', url: 'https://instagram.com/townley_photography' },
  linkedin: { label: 'LinkedIn', handle: 'spencertownley', url: 'https://www.linkedin.com/in/spencertownley/' },
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
  | 'countries'
  | 'trips'
  | 'how-i-build'
  | 'framework'
  | 'currently'
  | 'travel-and-planning'
  | 'games'
  | 'links'

export type ObjectId =
  | 'tv'
  | 'camera'
  | 'laptop'
  | 'plaque'
  | 'backpack'
  | 'poster'
  | 'passport'
  | 'speaker'
  | 'console'
  | 'plant'

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
    brain: { region: 'Prefrontal cortex', label: 'Experience', teaser: 'career and resume' },
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
    title: 'Now playing: Spotted Zebra',
    subtitle: "Seattle's premier party rock cover band",
    object: 'speaker',
    roomLabel: 'Music',
    brain: { region: 'Auditory cortex', label: 'Music', teaser: 'Spotted Zebra, the band' },
  },
  {
    id: 'countries',
    path: '/countries',
    title: '47 countries and counting',
    subtitle: 'I travel, and I plan',
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
    id: 'games',
    path: '/games',
    title: 'Game shelf',
    subtitle: 'Pick a cartridge',
    object: 'console',
    roomLabel: 'Games',
    brain: { region: 'Cerebellum', label: 'Games', teaser: 'pick a cartridge' },
  },
  {
    id: 'links',
    path: '/links',
    title: "Everything I've planted",
    subtitle: 'Every project and profile, one leaf each',
    object: 'plant',
    roomLabel: 'All my links',
    brain: { region: 'Dendrites', label: 'All links', teaser: 'every project, one leaf each' },
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
  id: string
  name: string
  url: string
  host: string
  description: string
  /** One or two lines on the problem behind it, shown in the laptop's README files. */
  why: string
  tags: string[]
  status: string
}

export const projects: Project[] = [
  {
    id: 'points-pool',
    name: 'Seahawks Points Pool',
    url: 'https://points-pool-production.up.railway.app',
    host: 'points-pool-production.up.railway.app',
    description:
      "A tablet kiosk app built for my team's monthly Seahawks score-picking contest, twelve of us competing all season, done up in 8-bit style.",
    why: 'Twelve of us pick Seahawks scores every month, all season. It deserved a real scoreboard, so it became an 8-bit kiosk on a tablet.',
    tags: ['Kiosk app', 'Team tool', '8-bit UI'],
    status: 'Live',
  },
  {
    id: 'make-that',
    name: 'Make That',
    url: 'https://makethat.wtf',
    host: 'makethat.wtf',
    description:
      'A site that helps answer the question everyone building with AI eventually asks: what should I actually make?',
    why: 'Everyone building with AI hits the same wall: the tools are ready, the idea is not. This hands you one, plus a prompt to start with.',
    tags: ['AI', 'Idea generation'],
    status: 'Live',
  },
  {
    id: 'shortlist',
    name: 'Shortlist',
    url: 'https://shortlist.spencertownley.workers.dev',
    host: 'shortlist.spencertownley.workers.dev',
    description:
      'A simple tool for narrowing down photos as a group: upload a batch, share one link, and head-to-head matchups surface everyone\'s favorites.',
    why: 'Picking favorites from a shoot by group chat does not work. Head-to-head matchups do, and nobody has to install anything.',
    tags: ['Group decisions', 'Photo workflow'],
    status: 'Live',
  },
  {
    id: 'downbeat',
    name: 'Downbeat',
    url: 'https://trydownbeat.app',
    host: 'trydownbeat.app',
    description:
      'A scheduling app for bands, built to solve the actual headache of coordinating rehearsals and building a setlist everyone can vote on, or veto.',
    why: 'Getting a whole band into one room at the same time is harder than learning the songs. Downbeat puts rehearsals and the setlist behind one link.',
    tags: ['Scheduling', 'Setlist voting'],
    status: 'Live',
  },
]

export const projectsCopy = {
  lead: "Tools and projects I've built, each one because a real problem kept bugging me.",
  howLink: 'The pattern behind all four',
}

export const work = {
  eyebrow: 'For recruiters and hiring managers',
  lead:
    'I work across product management, strategy, AI, and process improvement. I find where work gets stuck, figure out why, and build the thing that fixes it.',
  focus: ['Product management', 'Strategy', 'Applied AI', 'Process improvement'],
  resume: {
    // Set `url` to the PDF path (for example '/spencer-townley-resume.pdf') once it exists.
    url: null as string | null,
    placeholder: 'The PDF is on its way. Until then, email me and I will send the current version the same day.',
  },
  story: {
    placeholder:
      'The longer career story, where I have been and what I owned there, is being written. The resume will cover it first.',
  },
}

export const countriesCopy = {
  eyebrow: 'I travel. I plan.',
  lead:
    "Seeing the world is the thing I'd never give up. New cultures, new people, new food... new everything! It's what makes me feel most alive. Forty-seven countries in, and no signs of stopping.",
  hint: 'Hover the map, or pick a region to zoom in.',
  cta: 'Help me plan a trip',
  ctaSubject: 'Help planning a trip',
}

export const photography = {
  lead: "I'll let the photos speak for themselves.",
  portraits: [
    { src: '/photos/tile-portrait.jpg', alt: 'Family portrait in warm evening light, parents holding their baby', w: 900, h: 698, caption: 'Family session' },
    { src: '/photos/gallery-portrait-1.jpg', alt: 'A one year old mid cake smash, frosting on their face', w: 667, h: 1000, caption: 'First birthday cake smash' },
    { src: '/photos/gallery-portrait-2.jpg', alt: 'Family session with a new baby', w: 667, h: 1000, caption: 'Family with baby' },
    { src: '/photos/gallery-portrait-3.jpg', alt: 'Studio portrait session', w: 1000, h: 800, caption: 'Studio session' },
  ],
  placeholders: ['Landscape select', 'Landscape select', 'Wildlife select', 'Wildlife select'],
}

export const video = {
  lead: "If you like my photos, you'll love my videos. A reel is being cut together now, so stay tuned.",
}

export const youtube = {
  lead: "Videos go up when there's something worth showing, which is a higher bar than it sounds.",
}

export const music = {
  lead:
    "I hold down the low end. We play party rock covers, loud enough to get the whole room singing along. It's my favorite hobby, and easily the loudest one.",
}

export const trips = {
  lead:
    "Hand me a wish list and I'll turn it into a trip that you'll love. The right destinations, the right pace, and room for the good surprises.",
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
    { title: 'Put it in front of the people with the problem', note: 'Coworkers, friends, the group chat.' },
    { title: 'Keep what they use', note: 'Cut the rest without getting sentimental about it.' },
  ],
  evidence: [
    { name: 'Seahawks Points Pool', note: 'Twelve coworkers, one season, one kiosk.' },
    { name: 'Downbeat', note: 'Rehearsals and setlists, decided in one place.' },
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

export interface Game {
  id: string
  /** Shown on the menu; null shows an empty cartridge slot. */
  title: string | null
  blurb: string | null
  /** Where the game runs. It plays inside the TV (it must allow being framed; add its origin to frame-src in server.mjs). */
  url: string | null
  /**
   * The smallest screen the game lays out well on, in CSS pixels. When the TV glass is smaller,
   * the game runs at a larger size and is scaled down to fit, so it shrinks instead of cropping.
   */
  minViewport?: { width: number; height: number }
  /** The same on touch screens, where a game may add on-screen controls that need room too. Falls back to minViewport. */
  touchMinViewport?: { width: number; height: number }
}

/** The console under the TV. Connect a game by giving its slot a title and url. */
export const games = {
  menuTitle: "SPENCER'S GAMES",
  lead: 'A few small games I have made. Pick a cartridge.',
  items: [
    {
      id: 'game-1',
      title: 'Jimothy',
      blurb:
        "A cozy Mario-style platformer starring Ballard's short-spined raccoon. World 1-1, Welcome to Ballard, is playable: storm-drain bonus room and the 44 bus included. Built with Phaser and TypeScript.",
      // Built from the CruiseNewsYouCanUse repo and hosted here, under public/play/jimothy/.
      url: '/play/jimothy/',
      // On touch screens it adds a wooden controller on both sides (128 px each at least), laid
      // out for a landscape phone; desktop scales the 16:9 game to any size by itself.
      touchMinViewport: { width: 844, height: 390 },
    },
    {
      id: 'game-2',
      title: 'More.',
      blurb:
        'A 16-bit story game about the paperclip maximizer. You play Pip, a factory AI handed one sentence, and you follow it all the way. Chapter 1 is playable now.',
      url: 'https://makemorepaperclips.com/play.html',
      // Its 384 x 288 screen never drops below 1x, with 16 px of padding each side,
      // and touch screens add a 162 px controller pad under it.
      minViewport: { width: 416, height: 288 },
      touchMinViewport: { width: 416, height: 450 },
    },
    {
      id: 'game-3',
      title: 'Smoosh',
      blurb:
        'A physics merge game. Drop glowing motes, merge matching ones into bigger and brighter tiers, and bring colour back to a storybook world one land at a time. Built with React, PixiJS, and Rapier.',
      url: 'https://spencertownley-sys.github.io/Merge_Game1/',
      // A portrait phone game: its home screen and board need about a phone's height.
      minViewport: { width: 360, height: 760 },
    },
    { id: 'game-4', title: null, blurb: null, url: null },
  ] as Game[],
  emptySlot: 'EMPTY SLOT',
  comingSoon: 'This cartridge is still being soldered together. Check back soon.',
}

export const washington = {
  eyebrow: 'Out the window',
  title: 'Home base: Washington State',
  body: 'Evergreens, saltwater, and a volcano that only shows up when it feels like it.',
  fact: 'Seattle gets less rain per year than Miami or New York. It just takes its time.',
}

/** The laptop in the Room zooms into a desktop with these items. */
export const laptop = {
  owner: "Spencer's laptop",
  hint: 'Click a folder to look inside. Press Esc to step back into the room.',
  touchHint: 'Tap a folder to look inside. Tap Back to return to the room.',
  extras: {
    howIBuild: { name: 'How I build.txt' },
    resume: { name: 'Resume.pdf' },
    linkedin: { name: 'LinkedIn' },
    github: { name: 'GitHub' },
    mail: { name: 'Say hello' },
  },
}

/* ------------------------------------------------------------------ */
/* All my links: the pothos opens a wall of vines, one leaf per link.  */
/* Leaf positions on the pictures live in src/links/leaves.ts.         */
/* ------------------------------------------------------------------ */

export type LeafGroup = 'built' | 'games' | 'creative' | 'band' | 'me'

export interface Leaf {
  id: string
  name: string
  /** A short second line: what it is, or the handle. */
  sub: string
  href: string
  group: LeafGroup
}

const projectUrl = (id: string) => projects.find((p) => p.id === id)?.url ?? '/projects'
const gameUrl = (id: string) => games.items.find((g) => g.id === id)?.url ?? '/games'

export const linkGarden = {
  hint: 'Every leaf is a link.',
  touchHint: 'Every leaf is a link. Tap one.',
  groups: {
    built: 'Things I built',
    games: 'Games',
    creative: 'Photo and video',
    band: 'The band',
    me: 'Find me',
  } as Record<LeafGroup, string>,
  leaves: [
    { id: 'points-pool', name: 'Seahawks Points Pool', sub: '8-bit kiosk app', href: projectUrl('points-pool'), group: 'built' },
    { id: 'make-that', name: 'Make That', sub: 'What to build with AI', href: projectUrl('make-that'), group: 'built' },
    { id: 'shortlist', name: 'Shortlist', sub: 'Group photo picker', href: projectUrl('shortlist'), group: 'built' },
    { id: 'downbeat', name: 'Downbeat', sub: 'Band scheduling app', href: projectUrl('downbeat'), group: 'built' },
    { id: 'jimothy', name: 'Jimothy', sub: 'Platformer', href: gameUrl('game-1'), group: 'games' },
    { id: 'more', name: 'More.', sub: 'Story game', href: gameUrl('game-2'), group: 'games' },
    { id: 'smoosh', name: 'Smoosh', sub: 'Merge game', href: gameUrl('game-3'), group: 'games' },
    { id: 'photo-site', name: 'Townley Photography', sub: 'Photo portfolio', href: links.photoSite.url, group: 'creative' },
    { id: 'video-site', name: 'Videography', sub: 'Video portfolio', href: links.videoSite.url, group: 'creative' },
    { id: 'photo-ig', name: 'Photo Instagram', sub: links.photoInstagram.handle, href: links.photoInstagram.url, group: 'creative' },
    { id: 'youtube', name: 'YouTube', sub: links.youtube.handle, href: links.youtube.url, group: 'creative' },
    { id: 'band-ig', name: 'Band Instagram', sub: links.bandInstagram.handle, href: links.bandInstagram.url, group: 'band' },
    { id: 'band-yt', name: 'Band YouTube', sub: links.bandYoutube.handle, href: links.bandYoutube.url, group: 'band' },
    { id: 'linkedin', name: 'LinkedIn', sub: links.linkedin.handle, href: links.linkedin.url, group: 'me' },
    { id: 'github', name: 'GitHub', sub: links.github.handle, href: links.github.url, group: 'me' },
    { id: 'travel-ig', name: 'Travel Instagram', sub: links.travelInstagram.handle, href: links.travelInstagram.url, group: 'me' },
    { id: 'email', name: 'Email', sub: site.email, href: `mailto:${site.email}`, group: 'me' },
  ] as Leaf[],
}

export const audio = {
  // Optional: drop real loops in /public/audio and set these to use them instead
  // of the generated ambience, for example '/audio/room.mp3'.
  roomTrack: null as string | null,
  brainTrack: null as string | null,
}
