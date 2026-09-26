# spencertownley.com

Personal portfolio for Spencer Townley. Two toggleable experiences over the same content: a photoreal **Room** you drift through and a rotating holographic **Brain**. The full product brief lives in [`CLAUDE.md`](./CLAUDE.md).

## Stack

- React 19 + Vite + TypeScript
- **Room**: a photoreal room photo plus a depth map, rendered by a small WebGL shader (`src/room/roomView.ts`). It opens on the whole room, eases in, then drifts slowly with real parallax. The chair is its own cut-out layer so it never smears. Hotspots and the window's hover note are projected with the same math. Clicking the laptop flies the camera into its screen, where a small desktop (`src/laptop/`) has a folder per project. Falls back to a panning image without WebGL.
- **Brain**: a procedural holographic brain in three.js (`src/brain/brainGL.ts`, lazy loaded) that rotates slowly (2 rpm, `RPM` in brainGL.ts). Nodes are pinned to 3D points on it and their labels follow every frame. Falls back to the flat brain artwork and a stacked list without WebGL.
- Framer Motion for UI motion and the Room/Brain transition
- One 2D canvas (`src/fx/fx.ts`) for the Brain pixel dissolve, and a very soft glow under the mouse (`src/fx/CursorGlow.tsx`, styled in `base.css`)
- Web Audio for the ambient sound beds (generated in code, no audio files)
- `d3-geo` + `world-atlas` for the countries map (lazy loaded)
- A dependency-free Node static server (`server.mjs`) for Railway

## Commands

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck, build to dist/, precompress (br + gz)
npm start          # serve dist/ on $PORT (defaults to 3000)
npm run lint
```

## Editing content

Almost everything a visitor reads is in [`src/content/site.ts`](./src/content/site.ts): copy, links, project cards, placeholders, and the Brain node labels. The countries list is in [`src/content/countries.ts`](./src/content/countries.ts). House style: no em dashes, anywhere.

Common updates:

| To do this | Change this |
|---|---|
| Add the resume PDF | Put it in `public/` and set `work.resume.url` (for example `'/spencer-townley-resume.pdf'`) |
| Fill "Currently obsessed with" | Add items to `currently.items` |
| Add a case study | Fill a slot in `work.caseStudies.items` (title, problem, change, result, optional `url`) |
| Connect a game | Give a slot in `games.items` a `title` and `url`, and add the game's origin to `frame-src` in `server.mjs` |
| Add writing or a book | Fill a slot in `writing.samples` or `writing.books` |
| Change the "open to" line | `site.openTo` and `site.openToWhere` |
| Add landscape / wildlife photos | Put files in `public/photos/`, extend `photography.portraits` or replace `photography.placeholders` |
| Use real ambient loops | Put files in `public/audio/` and set `audio.roomTrack` / `audio.brainTrack` |
| Add a country | Append to `countries` (the `atlas` name must match `world-atlas` 50m naming) |
| Swap the room photo | See "Room photo" below |

## Room photo

The room is an AI-generated photo (`assets/room/room-source.jpg`, 3840 x 2143) with a depth map estimated by Depth Anything V2. The chair is served as its own layer so it moves as one solid piece: `src/assets/room/chair.webp` is the chair cut out with alpha (matte in `assets/room/chair-matte.png`), and `room-{width}.webp` is the room with the chair painted out. `room-still-*.webp` is the complete photo for browsers without WebGL. Also in `src/assets/room/`: `depth.png` and a close-up crop per object in `crops/`. These are imported by `objects.ts` rather than served from `public/`, so each build gives them content-hashed names and a new photo can never hide behind a browser's cached copy of the old one. Hotspot positions (0..1 across the photo), their depth, the chair rectangle, the laptop screen, and the window zone are in `src/room/objects.ts`.

To use a different photo (for example a real photo of your own space), export the same set of files at the same names, update the spots and rectangles in `objects.ts`, and update `ROOM_PHOTO.aspect` if the proportions change. Without a separate foreground layer, drop `chair` from `ROOM_PHOTO`.

## Favicon

The icon is `public/favicon.svg` (the ST monogram), with `favicon-32.png` and `apple-touch-icon.png` (180 px) made from it. Other options, and a preview sheet at real tab sizes, are in `assets/favicon-options/`. To switch, copy the SVG you want over `public/favicon.svg`, regenerate the two PNGs from it, and bump the `?v=` on the icon links in `index.html` so browsers drop the old one.

## Deploy (Railway)

`railway.json` tells Railway to run `npm run build` and start `npm start`, with a health check on `/healthz`. The server sets long-lived caching for hashed assets, serves precompressed files, adds security headers, and falls back to `index.html` for app routes like `/work`.

The site runs in the Railway project `spencertownley-site`, service `web`, with `spencertownley.com` and `www.spencertownley.com` attached as custom domains. To connect the domain in Cloudflare:

1. In Railway, open the `web` service, then **Settings > Networking > Public Networking**. Each custom domain shows two records to add: a `CNAME` and a `TXT` (ownership check). Keep this tab open.
2. In Cloudflare, open `spencertownley.com`, then **DNS > Records**. Delete any existing `A`, `AAAA`, or `CNAME` records on `@` and `www` (parking or placeholder records).
3. Add the records Railway shows, exactly as shown:
   - `CNAME`, name `@`, target `gb9fv1ja.up.railway.app`, proxied (orange cloud). Cloudflare flattens it at the root automatically.
   - `CNAME`, name `www`, target `dgl0tow8.up.railway.app`, proxied.
   - The `TXT` record for each domain (name and value from Railway). The domain will not verify without it.
4. **SSL/TLS > Overview**: choose **Full**. Not Full (Strict), which does not work with Railway.
5. **SSL/TLS > Edge Certificates**: make sure **Universal SSL** is on.
6. Wait for Railway to show a green check (and "Cloudflare proxy detected") next to each domain. Usually minutes, occasionally longer.

The server redirects `www` to the apex, so no Cloudflare redirect rule is needed.

Email: `hello@spencertownley.com` is on the site; Cloudflare Email Routing still needs a destination address configured.
