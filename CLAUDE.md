# Spencer Townley Portfolio, Build Brief

Site: spencertownley.com (domain already purchased through Cloudflare)
Deploy target: Railway, from the start. No other platform involved.

This file consolidates the product spec, design direction, and content plan into one brief. Everything referenced in `assets/` was generated already and is ready to use.

## What this site is

A personal portfolio that proves Spencer's product, AI, and process-improvement experience to recruiters, while also showcasing his photography, videography, YouTube presence, music, trip-planning craft, and social links. Two toggleable experiences: an illustrated "Room" and a sci-fi "Brain."

## Audiences, in priority order
1. Recruiters and hiring managers evaluating him for product management, strategy, AI, or process-improvement roles. This is the primary audience the build should optimize for.
2. Photography and videography prospects and referrals.
3. General personal network, creative collaborators, YouTube-adjacent contacts.

Not prioritized: podcast listeners (no featured section for the podcast), trip-planning leads (personality first, lead generation is a side effect, not the goal).

## Suggested stack
Nothing about this project needs a 3D engine or a database. It's a 2D illustrated scene with layered, individually interactive objects, so:
- React with Vite and TypeScript.
- Framer Motion (or a comparably lightweight animation library) for hover states, idle ambient motion, and the Room-to-Brain transition.
- A small canvas layer specifically for the Brain mode's pixel-dissolve hover effect and the cursor's light trail. This is the one place actual canvas work is worth it; everything else is DOM and SVG.
- Howler.js or plain HTML5 audio for the ambient sound bed and the mute control.
- No backend, no database, no user accounts. All content is static.
- Deploy on Railway. This is not a constraint imposed by any platform, it's just the right amount of infrastructure for what this is.

## Landing behavior
- The visitor lands directly inside the Room. No slow establishing shot or intro animation.
- A visible "skip to resume and case studies" link is always present and always works, independent of whether anyone interacts with the Room at all.
- A toggle sits top-center and switches the whole experience between Room and Brain modes.
- Sound plays by default in both modes, with an obvious, always-reachable mute control.

## Room mode: objects, assets, and destinations

All object art is in `assets/`, as SVG, transparent background, ready to place and style individually. Each one needs its own hover state (a slight lift and/or wiggle) and click target.

| Object | Asset file | Opens |
|---|---|---|
| TV | `assets/tv.svg` | Videography |
| Camera | `assets/camera.svg` | Photography (portraits, landscapes, wildlife) |
| Open laptop | `assets/laptop.svg` | AI and product side-projects |
| Silver play-button plaque | `assets/play-button-plaque.svg` | YouTube channel |
| Backpack | `assets/backpack.svg` | Corporate career story and resume |
| Travel poster | `assets/travel-poster.svg` | Countries-visited map |
| Passport and journal | `assets/passport-journal.svg` | Trip-planning example itinerary |
| Guitar | `assets/guitar.svg` | Music (Spotted Zebra Music) |
| Small Bluetooth speaker | `assets/bt-speaker.svg` | Links directly to Spotted Zebra Music's Instagram and YouTube |

A small persistent icon tray (not a Room object) holds: travel Instagram, photography Instagram, and GitHub.

Idle state: small ambient loops (a subtle sway, a blink, slow parallax), just enough that it doesn't read as a static image.

## Brain mode

Asset: `assets/brain.svg`, a digital wireframe brain rendered as glowing line drawings, generated directly on its final near-black background (`#05070A`), so it should be placed as-is rather than re-colored or re-backgrounded.

Behavior: the same underlying sections as the Room, reframed as a "how I think" experience, plus a small number of brain-only nodes (see Content below). Labels for each node branch off the brain in a technical/monospace typeface. Hovering a node dissolves its label and connecting line into pixels via the canvas layer, then it reassembles on hover-out. The cursor trails a soft light as it moves, most visible here. The toggle returns to Room at any time, with a short transition rather than a hard cut.

## Design spec

**Room palette**: warm cream background (`#F4EFE4`), accent colors already baked into the object art (terracotta red `#D6543F`, forest green `#3F7D4E`, mustard `#D9A441`, sky blue `#5FB4D9`, warm brown `#8B5E3C`). Keep any new UI chrome (buttons, panels) inside this same family.

**Brain palette**: near-black (`#05070A`), two glow colors only, electric blue (`#3DDCFF`) and mint green (`#3DFFB0`). Restraint to two colors is what reads as premium here, don't add a third.

**Typography**: a rounded, friendly sans for the Room (Poppins, Quicksand, or Nunito), a technical monospace or geometric sans for Brain labels (Space Mono, JetBrains Mono, or Orbitron for headers).

**Responsive behavior**: full free-roam scene on desktop and tablet. On mobile, the same objects as a simple scrollable grid, not the loose-scatter layout, which doesn't work on touch and small viewports. Brain mode becomes a stacked list of labeled nodes on mobile, keeping the hover-dissolve effect on tap.

**House style rule, apply everywhere including all site copy**: no em dashes, anywhere.

## Content, section by section

**AI and career**
- Personal projects, confirmed and live:
  - Seahawks Points Pool, points-pool-production.up.railway.app
  - Make That, makethat.wtf
  - Shortlist, shortlist.spencertownley.workers.dev
  - Downbeat, trydownbeat.app
- One-line descriptions, drafted and pending Spencer's confirmation or edit (use as-is if nothing else is provided):
  - Seahawks Points Pool: "A tablet kiosk app built for my team's monthly Seahawks score-picking contest, twelve of us competing all season, done up in 8-bit style."
  - Make That: "A site that helps answer the question everyone building with AI eventually asks: what should I actually make?"
  - Shortlist: "A simple tool for narrowing down photos as a group: upload a batch, share one link, and head-to-head matchups surface everyone's favorites."
  - Downbeat: "A scheduling app for bands, built to solve the actual headache of coordinating rehearsals and building a setlist everyone can vote on, or veto."
- GitHub: github.com/spencertownley-sys, linked in this panel near the project cards.
- Resume: not yet provided. Use a clearly marked placeholder card until Spencer supplies the actual PDF.
- A placeholder card noting more (Princess-based) case studies are coming.
- AI is a proof point running through the work shown, not the dominant visual theme of the site.

**Photography**
- Select portraits (already sourced from the live site, use directly): a first-birthday cake smash session, a family-with-baby session, a studio session, plus the flagship portrait tile, all at townleyphotography.com/images/gallery-portrait-1.jpg, gallery-portrait-2.jpg, gallery-portrait-3.jpg, and tile-portrait.jpg.
- Landscape and wildlife selects: not yet provided, use placeholders.
- Link out to townleyphotography.com for the full portfolio.
- Photography Instagram: instagram.com/townley_photography.
- Photography blog: townleyphotography.com/journal/.

**Videography**
Its own section, separate from photography. Selects or a reel not yet provided, use a placeholder. Link out to townleyphotography.com/video/.

**YouTube**
Channel link: youtube.com/@spencertownley.

**Music**
Spotted Zebra Music, one of Spencer's major hobbies. Instagram: instagram.com/spottedzebramusic. YouTube: youtube.com/@SpottedZebraMusic. Worth a line connecting this panel to Downbeat, since Spencer built that scheduling app to solve a real problem his own band had.

**Trip planning**
One complete example itinerary, not yet provided, use a placeholder. Travel Instagram: instagram.com/spencertownley.

**Countries-visited map**
47 countries: USA, Canada, Mexico, Dominican Republic, The Bahamas, Jamaica, St. Vincent, Italy, Vatican City, Croatia, Greece, Turkey, Spain, Germany, Ireland, Bosnia & Herzegovina, Switzerland, Denmark, Norway, Sweden, The Netherlands, Austria, Hungary, France, Monaco, Egypt, Morocco, Japan, Iceland, Thailand, Cambodia, Vietnam, Panama, Costa Rica, Aruba, Colombia, Singapore, Laos, Philippines, S Korea, S Africa, Namibia, Botswana, Zimbabwe, Hong Kong, Curacao, Malaysia.

**Social (icon tray)**
Travel Instagram, photography Instagram, GitHub. YouTube stays as its own Room object rather than duplicating in the tray. The band's links live behind the guitar and speaker, not here either.

**Contact**
hello@spencertownley.com. Cloudflare Email Routing still needs to be set up on Spencer's end so it actually forwards somewhere, the address itself is fine to put on the site regardless.

**Headshot / hero photo**
A self-portrait in a vehicle side mirror on safari, holding a camera lens. Not included in this asset package as a file, ask Spencer for it directly if the build needs it placed somewhere.

**Brain-only nodes**
Still placeholders, concept not locked by Spencer yet. Use two to four of these as a starting point, expect them to be replaced:
- "How I build": the pattern across the side-projects, an idea becomes a real working thing in days, not a slide deck.
- "A framework I keep coming back to": empty slot, needs Spencer's real content.
- "Currently obsessed with": whatever's pulling focus right now, meant to be easy to update later.
- "Why travel changes how I plan": the bridge between the itinerary-building hobby and the same instinct showing up in process-improvement work.

## Explicitly out of scope
- No login, accounts, or dynamic backend data.
- No AI generation running inside the site itself.
- No Silver and Sable branding or palette, that project is inactive and unrelated.
- Princess-specific case studies are a placeholder only.
- The podcast is not a featured section.

## Success criteria
- A recruiter using the skip link reaches the resume and case-study proof points in one click, no exploration required.
- Every Room object and its Brain-mode counterpart open the same underlying content.
- The mode toggle and mute control are always visible and respond instantly.
- The site is fully usable on desktop and degrades gracefully, not brokenly, on mobile.

## Asset manifest
```
assets/tv.svg                  transparent, Videography
assets/camera.svg              transparent, Photography
assets/laptop.svg              transparent, AI and career
assets/play-button-plaque.svg  transparent, YouTube
assets/backpack.svg            transparent, Corporate career / resume
assets/travel-poster.svg       transparent, Countries-visited map
assets/passport-journal.svg    transparent, Trip planning
assets/guitar.svg              transparent, Music
assets/bt-speaker.svg          transparent, Music (social links out)
assets/brain.svg               opaque near-black background baked in, Brain mode hero graphic
assets/preview/contact-sheet-transparent-check.png   quick visual reference of all 10 assets together
```

## Known open items
- Resume PDF.
- Confirmation or edits on the four project one-liners and their status (built and live, actively used, etc.).
- Landscape and wildlife photography selects.
- Videography reel.
- The trip itinerary example and video Spencer said were coming later.
- A decision on the brain-only nodes.
- Any reaction to the proposed palette, once it's actually visible on screen.

None of these block starting the build. Use placeholders and keep going.

## Note on the abandoned Higgsfield scaffold
An earlier pass started this build on Higgsfield, at the subdomain `spencertownley`. That path is no longer being used, this brief supersedes it. The Higgsfield site still exists and is harmless to leave alone; there is no delete step required as part of this handoff.

## Implementation notes

Built from this brief as a React + Vite + TypeScript app. See `README.md` for commands and deploy steps.

- `src/content/site.ts`: every section, all copy and links, Brain node labels. Edit copy here, not in components. `src/content/countries.ts`: the 47 countries.
- `src/room/`: Room mode, now photoreal (Spencer asked to replace the cartoon room). `roomView.ts` renders one wide photo plus a depth map with a WebGL shader: it opens on the whole room for a couple of seconds (so visitors see everything is clickable), eases in, then drifts slowly; drag / scroll / arrow keys move it and the mouse steers gently. No dust or grain overlays (Spencer asked for them gone). The chair is a separate cut-out layer (`src/assets/room/chair.webp`) drawn at one depth over a chairless plate, because depth parallax smeared it. Hotspots and the window hover zone (a note about Washington, `washington` in site.ts) are projected with the same math. `RoomGrid.tsx` is the mobile grid (live room hero, photo tiles, the Washington note). The original illustrated SVGs in `assets/` are no longer used by the Room. Room and desktop images live in `src/assets/` and are imported, so they get content-hashed names (Spencer once saw a stale cached photo when they lived in `public/` under fixed names).
- `src/laptop/`: in Room mode `/projects` does not open a panel. The camera flies into the laptop screen and `LaptopDesktop.tsx` takes over: a desktop with a folder per project (README with the `why` line, tags, and a sandboxed live preview iframe), plus How I build.txt, Resume.pdf, GitHub, and Say hello. Esc closes a window, then steps back into the room; so does clicking the room around the laptop. The camera stops with the bezel and some of the room still in view, and the desktop is laid exactly over the screen (`src/laptop/screenBox.ts` is shared by the camera and the overlay). Inside it the pointer is a Mac-style arrow (`src/assets/cursor/`), with the system hand on links. The iframe origins are allowed by `frame-src` in `server.mjs`; add new project hosts there. Brain mode still uses the projects panel.
- `src/brain/`: Brain mode, now a procedural 3D brain in three.js (`brainGL.ts`, lazy loaded) styled after Spencer's reference: glowing sulci from a warped noise field, circuit traces, particles, HUD rings, light streaks, bloom. Rotates at 2 rpm (Spencer found 6, then 2.5, too fast); hovering a node stops the spin so it can be clicked. `nodes.ts` pins each node to a 3D direction on the brain, loosely matched to the region it is named after. Blue nodes also exist in the Room; violet nodes are Brain-only. Spencer's reference replaced mint with violet as the second glow color (still two colors only). Brain panels use a light blue card with dark text for legibility.
- `src/fx/fx.ts`: the one canvas layer (pixel dissolve / reassemble), disabled under `prefers-reduced-motion`. The cursor has no trail: Spencer found the trail styles tacky, so `src/fx/CursorGlow.tsx` draws one very soft glow right under the mouse (warm in the Room, blue in the Brain; colors in `base.css`).
- `src/lib/audio.ts`: generated ambient beds and UI sounds. Sound is on by default and starts on the first click, tap, or key press (browsers block audio before that). Mute persists in `localStorage`.
- `src/panels/`: the content panels, one component per section, reskinned per mode by CSS (`src/styles/panels.css`).
- Routes are real paths (`/work`, `/projects`, `/thinking/how-i-build`, ...) and `?mode=brain` selects Brain mode, so any panel in either mode can be linked directly. The skip link goes to `/work`.
- Layout switches to the mobile grid / stacked Brain list below 640px wide or 480px tall. Portrait tablets get a dedicated portrait Room layout and the stacked Brain list.
- Favicon: the ST monogram (`public/favicon.svg`); Spencer was shown the options in `assets/favicon-options/`.
- Placeholders are marked in the UI with a dashed "Coming soon" badge. Copy that was drafted rather than supplied: the site intro line, the career panel lead, section leads, the trip-planning skeleton, and the brain-only node text.
