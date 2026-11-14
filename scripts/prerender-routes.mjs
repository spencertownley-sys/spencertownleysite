// Writes dist/<path>/index.html for every section route: a copy of dist/index.html with that
// section's own title, description, canonical and Open Graph URL, plus its lead copy in the
// noscript block, so each page is distinct to crawlers and link previews before any script runs.
// The client router still takes over as usual. Runs after `vite build`, before precompress.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = join(root, 'dist')
const ORIGIN = 'https://spencertownley.com'

// site.ts has no imports, so it can be transpiled and loaded on its own.
const source = await readFile(join(root, 'src/content/site.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const content = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const leads = {
  work: content.work.lead,
  projects: content.projectsCopy.lead,
  photography: content.photography.lead,
  video: content.video.lead,
  youtube: content.youtube.lead,
  music: content.music.lead,
  countries: content.countriesCopy.lead,
  trips: content.trips.lead,
  games: content.games.lead,
  'how-i-build': content.howIBuild.lead,
  'travel-and-planning': content.travelAndPlanning.paragraphs[0],
  privacy: content.privacy?.lead,
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const html = await readFile(join(dist, 'index.html'), 'utf8')

// `value` replaces the text between capture groups 1 and 2 (or the whole match when there are none).
function swap(text, pattern, value) {
  if (!pattern.test(text)) throw new Error(`prerender: pattern not found in index.html: ${pattern}`)
  return text.replace(pattern, (m, a, b) => (typeof a === 'string' ? a + value + b : value))
}

let count = 0
for (const s of content.sections) {
  if (s.hidden) continue
  const title = `${s.title} | ${content.site.name}`
  const lead = leads[s.id] || s.subtitle
  const url = `${ORIGIN}${s.path}`
  let out = html
  out = swap(out, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  out = swap(out, /(<meta\s+name="description"\s+content=")[^"]*(")/, esc(lead))
  out = swap(out, /(<link rel="canonical" href=")[^"]*(")/, url)
  out = swap(out, /(<meta property="og:url" content=")[^"]*(")/, url)
  out = swap(out, /(<meta property="og:title" content=")[^"]*(")/, esc(title))
  out = swap(out, /(<meta property="og:description" content=")[^"]*(")/, esc(lead))
  out = swap(out, /(<h1>Spencer Townley<\/h1>)()/, `\n        <h2>${esc(s.title)}</h2>\n        <p>${esc(lead)}</p>`)
  const file = join(dist, s.path, 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, out)
  count++
}
console.log(`prerender: wrote ${count} route pages`)
