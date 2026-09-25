# spencertownley.com

Personal portfolio for Spencer Townley. Two toggleable experiences over the same content: an illustrated **Room** and a sci-fi **Brain**. The full product brief lives in [`CLAUDE.md`](./CLAUDE.md).

## Stack

- React 19 + Vite + TypeScript
- Framer Motion for hover states, idle motion, and the Room/Brain transition
- One canvas layer (`src/fx/fx.ts`) for the Brain pixel dissolve and the cursor light trail
- Web Audio for the ambient sound beds (generated in code, no audio files)
- `d3-geo` + `world-atlas` for the countries map (lazy loaded)
- A dependency-free Node static server (`server.mjs`) for Railway

No backend, no database, no accounts.

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
| Add landscape / wildlife photos | Put files in `public/photos/`, extend `photography.portraits` or replace `photography.placeholders` |
| Use real ambient loops | Put files in `public/audio/` and set `audio.roomTrack` / `audio.brainTrack` |
| Add a country | Append to `countries` (the `atlas` name must match `world-atlas` 50m naming) |

## Deploy (Railway)

`railway.json` tells Railway to run `npm run build` and start `npm start`, with a health check on `/healthz`. The server sets long-lived caching for hashed assets, serves precompressed files, adds security headers, and falls back to `index.html` for app routes like `/work`.

1. Create a Railway service from this GitHub repo.
2. Under the service's **Settings > Networking**, generate a domain, then add `spencertownley.com` as a custom domain.
3. In Cloudflare DNS, add the CNAME record Railway shows for the custom domain.
4. Optional: point `www` at the same service; the server redirects `www` to the apex.

Email: `hello@spencertownley.com` is on the site; Cloudflare Email Routing still needs a destination address configured.
