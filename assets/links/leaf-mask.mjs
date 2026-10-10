// Builds src/assets/links/garden-{wide,tall}-mask.webp: a soft alpha mask of the big leaves
// (vines removed), so the links page can lift each leaf off the wall on hover. See src/links/.
// Run from the repo root with sharp available (npm i --no-save sharp), on the full-size picture:
//   node assets/links/leaf-mask.mjs garden-wide.png 1920 src/assets/links/garden-wide-mask.webp 7
//   node assets/links/leaf-mask.mjs garden-tall.png 1080 src/assets/links/garden-tall-mask.webp 7
import sharp from 'sharp'
const [file, W, out, rad] = [process.argv[2], +process.argv[3], process.argv[4], +process.argv[5]]
const { data, info } = await sharp(file).resize(W).raw().toBuffer({ resolveWithObject: true })
const w = info.width, h = info.height, ch = info.channels
let m = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) {
  const r = data[i * ch], g = data[i * ch + 1], b = data[i * ch + 2]
  m[i] = g - r > -17 && g - b > 22 ? 1 : 0
}
// separable-ish box morphology with a disc
const morph = (src, rr, dil) => {
  const o = new Uint8Array(w * h)
  const offs = []
  for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy <= rr * rr) offs.push([dx, dy])
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = dil ? 0 : 1
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy
      const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx]
      if (dil ? s : !s) { v = dil ? 1 : 0; break }
    }
    o[y * w + x] = v
  }
  return o
}
m = morph(morph(m, 5, true), 5, false) // close the yellow streaks
// fill holes: anything the outside cannot reach is inside a leaf
{
  const out = new Uint8Array(w * h), st = []
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1)
  while (st.length) { const j = st.pop(); if (out[j] || m[j]) continue; out[j] = 1; const x = j % w
    if (x > 0) st.push(j - 1); if (x < w - 1) st.push(j + 1); if (j >= w) st.push(j - w); if (j < w * (h - 1)) st.push(j + w) }
  for (let i = 0; i < w * h; i++) m[i] = out[i] ? 0 : 1
}
m = morph(morph(m, rad, false), rad + 1, true) // open: drop the vines, keep the leaves
m = morph(morph(m, 11, true), 11, false) // close again: fill the bites the palest streaks left
const a = Buffer.alloc(w * h * 4)
for (let i = 0; i < w * h; i++) { a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = 255; a[i * 4 + 3] = m[i] * 255 }
await sharp(a, { raw: { width: w, height: h, channels: 4 } }).blur(1.2).webp({ lossless: true }).toFile(out)
console.log(out, w, h)
