// Builds src/assets/room/window-mask.webp from the room photo and depth map.
// R: open sky, G: foliage, B: window glass (lamp, laptop and frame cut out). See src/room/windowLife.ts.
// Run from the repo root with sharp available: npm i --no-save sharp && node assets/room/window-life/make-window-mask.mjs
// Rerun it whenever the room photo changes; the pane rectangles below are measured on the 3840 px photo.
import sharp from 'sharp';
const WIN = { x: 1440, y: 60, w: 1080, h: 900 };
const S = 2; // source px per mask texel
const MW = WIN.w / S, MH = WIN.h / S;
const { data, info } = await sharp('src/assets/room/room-3840.webp').raw().toBuffer({ resolveWithObject: true });
const { data: dd, info: di } = await sharp('src/assets/room/depth.png').raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]] };
const depthAt = (x, y) => dd[(Math.min(di.height - 1, Math.round(y / 3)) * di.width + Math.min(di.width - 1, Math.round(x / 3))) * di.channels];
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) };
const panes = [[1479, 100, 1849, 516], [1880, 100, 2484, 516], [1479, 542, 1849, 950], [1880, 542, 2484, 950]];
const glassAt = (x, y) => {
  let g = 0;
  for (const [a, b, c, d] of panes) g = Math.max(g, Math.min(ss(a + 1, a + 5, x), ss(c - 1, c - 5, x), ss(b + 1, b + 5, y), ss(d - 1, d - 5, y)));
  if (g === 0) return 0;
  // anything near the camera (lamp, laptop, plant, books) is in front of the glass
  let near = 0;
  for (let dy = -9; dy <= 9; dy += 3) for (let dx = -9; dx <= 9; dx += 3) near = Math.max(near, depthAt(x + dx, y + dy));
  return g * ss(24, 16, near);
};
const R = new Float32Array(MW * MH), G = new Float32Array(MW * MH), B = new Float32Array(MW * MH);
for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) {
  const x = WIN.x + mx * S + 1, y = WIN.y + my * S + 1;
  let fol = 0, lum = 0;
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
    const [r, g, b] = px(x + dx - 1, y + dy - 1); const l = 0.3 * r + 0.59 * g + 0.11 * b;
    fol += Math.max(ss(175, 145, l), ss(38, 60, r - b) * ss(205, 188, l)) / (S * S); lum += l / (S * S);
  }
  const gl = glassAt(x, y);
  const i = my * MW + mx;
  B[i] = gl; G[i] = gl * fol; R[i] = gl * (1 - fol) * ss(195, 212, lum) * ss(700, 560, y);
}
// soften: box blur passes
const blur = (A, r, n) => { let a = A; for (let k = 0; k < n; k++) { const o = new Float32Array(a.length); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { let s = 0, c = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < MW) { s += a[y * MW + xx]; c++ } } o[y * MW + x] = s / c } const o2 = new Float32Array(a.length); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { let s = 0, c = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < MH) { s += o[yy * MW + x]; c++ } } o2[y * MW + x] = s / c } a = o2 } return a };
// sky: erode away from foliage a little (min filter) before blurring, so clouds never sit on branches
const erode = (A, r) => { const o = new Float32Array(A.length); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { let m = 1; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < MW && yy < MH) m = Math.min(m, A[yy * MW + xx]) } o[y * MW + x] = m } return o };
const Rb = blur(erode(R, 3), 2, 2), Gb = blur(G, 1, 2);
const out = Buffer.alloc(MW * MH * 3);
for (let i = 0; i < MW * MH; i++) { out[i * 3] = Math.round(Rb[i] * 255); out[i * 3 + 1] = Math.round(Gb[i] * 255); out[i * 3 + 2] = Math.round(B[i] * 255) }
await sharp(out, { raw: { width: MW, height: MH, channels: 3 } }).webp({ lossless: true }).toFile('src/assets/room/window-mask.webp');
