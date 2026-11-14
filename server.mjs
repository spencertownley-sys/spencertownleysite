// Minimal static server for Railway. Serves dist/ with precompressed assets,
// long-lived caching for hashed files, security headers, and SPA fallback.
// No dependencies on purpose.

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'dist')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.tmj': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

const SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    // live previews of the side projects on the laptop desktop, and the games on the TV
    // ('self' for the games hosted here, under /play/)
    "frame-src 'self' https://points-pool-production.up.railway.app https://makethat.wtf https://shortlist.spencertownley.workers.dev https://trydownbeat.app https://spencertownley-sys.github.io https://makemorepaperclips.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
}

// Games hosted on the site itself (public/play/<game>/, built elsewhere and copied in) play
// on the TV, so the site may frame them. Same rules otherwise.
const GAME_SECURITY = {
  ...SECURITY,
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': SECURITY['Content-Security-Policy'].replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
}

async function fileInfo(path) {
  try {
    const s = await stat(path)
    return s.isFile() ? s : null
  } catch {
    return null
  }
}

// Paths the app answers with a real page: '/' plus every <loc> in sitemap.xml.
// Anything else gets the same shell with a 404 status, so typos are not soft 404s.
const KNOWN = new Set(['/'])
try {
  const xml = await readFile(join(ROOT, 'sitemap.xml'), 'utf8')
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try {
      KNOWN.add(new URL(m[1]).pathname.replace(/\/+$/, '') || '/')
    } catch {
      // ignore a malformed entry
    }
  }
} catch (err) {
  console.error('sitemap.xml not readable; every app route will be treated as known', err)
  KNOWN.clear()
}

let indexCache = { mtime: 0, body: null }
async function index() {
  const path = join(ROOT, 'index.html')
  const { mtimeMs } = await stat(path)
  if (mtimeMs !== indexCache.mtime) indexCache = { mtime: mtimeMs, body: await readFile(path) }
  return indexCache.body
}

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host || ''
    if (host.startsWith('www.')) {
      res.writeHead(301, { Location: `https://${host.slice(4)}${req.url}`, ...SECURITY })
      return res.end()
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY })
      return res.end()
    }

    const url = new URL(req.url || '/', 'http://localhost')
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
      return res.end('ok')
    }

    let pathname
    try {
      pathname = decodeURIComponent(url.pathname)
    } catch {
      res.writeHead(400, SECURITY)
      return res.end()
    }
    let file = normalize(join(ROOT, pathname))
    if (file !== ROOT && !file.startsWith(ROOT + sep)) {
      res.writeHead(403, SECURITY)
      return res.end()
    }

    // a hosted game is a folder with its own index.html
    const game = pathname.startsWith('/play/')
    if (game && pathname.endsWith('/')) file = join(file, 'index.html')
    const info = pathname.endsWith('/') && !game ? null : await fileInfo(file)
    if (!info) {
      if (game && !extname(pathname) && !pathname.endsWith('/') && (await fileInfo(join(file, 'index.html')))) {
        // its relative asset paths need the trailing slash
        res.writeHead(301, { Location: `${url.pathname}/${url.search}`, ...GAME_SECURITY })
        return res.end()
      }
      if (extname(pathname)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY })
        return res.end('Not found')
      }
      // App route: let the client router handle it.
      const clean = pathname.replace(/\/+$/, '') || '/'
      const known = KNOWN.size === 0 || KNOWN.has(clean)
      // A section page prerendered at build time (its own title and canonical), else the shell.
      const page = known && clean !== '/' ? await fileInfo(join(ROOT, clean, 'index.html')) : null
      const body = page ? await readFile(join(ROOT, clean, 'index.html')) : await index()
      res.writeHead(known ? 200 : 404, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache', ...SECURITY })
      return res.end(req.method === 'HEAD' ? undefined : body)
    }

    const ext = extname(file).toLowerCase()
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      // Hashed build files never change. Everything else keeps its name across
      // deploys, so browsers must check back (a cheap 304 when nothing changed).
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      ETag: `"${info.size.toString(36)}-${info.mtimeMs.toString(36)}"`,
      'Last-Modified': info.mtime.toUTCString(),
      Vary: 'Accept-Encoding',
      ...(game ? GAME_SECURITY : SECURITY),
    }
    if (req.headers['if-none-match'] === headers.ETag) {
      res.writeHead(304, headers)
      return res.end()
    }

    let target = file
    let size = info.size
    const accept = String(req.headers['accept-encoding'] || '')
    for (const [enc, suffix] of [
      ['br', '.br'],
      ['gzip', '.gz'],
    ]) {
      if (!accept.includes(enc)) continue
      const alt = await fileInfo(file + suffix)
      if (alt) {
        target = file + suffix
        size = alt.size
        headers['Content-Encoding'] = enc
        break
      }
    }
    headers['Content-Length'] = size
    res.writeHead(200, headers)
    if (req.method === 'HEAD') return res.end()
    const stream = createReadStream(target)
    // A file can vanish between stat and read (a deploy); end this response, keep the server up.
    stream.on('error', (err) => {
      console.error(err)
      res.destroy(err)
    })
    stream.pipe(res)
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.writeHead(500, SECURITY)
    res.end()
  }
})

server.listen(PORT, HOST, () => {
  console.log(`spencertownley.com listening on http://${HOST}:${PORT}`)
})
