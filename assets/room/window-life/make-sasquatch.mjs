// Draws the sasquatch walk cycle (facing right) as an atlas of 16 frames, 64 x 64 px each,
// feet at (32, 60): src/assets/room/sasquatch.webp. See src/room/windowLife.ts.
// Run from the repo root with sharp available: npm i --no-save sharp && node assets/room/window-life/make-sasquatch.mjs
import sharp from 'sharp';
const N = 16, F = 64, K = 4; // frames, frame size, supersample
const TAU = Math.PI * 2;
const pt = (o, len, ang) => [o[0] + len * Math.sin(ang), o[1] + len * Math.cos(ang)];
const f2 = (p) => `${(p[0] * K).toFixed(1)},${(p[1] * K).toFixed(1)}`;
const limb = (pts, widths, color) => {
  // tapered limb: one round-capped stroke per segment
  let s = '';
  for (let i = 0; i < pts.length - 1; i++) s += `<path d="M${f2(pts[i])} L${f2(pts[i + 1])}" stroke="${color}" stroke-width="${widths[i] * K}" stroke-linecap="round" fill="none"/>`;
  return s;
};
const NEAR = '#6e4b33', FAR = '#533826', BODY = '#664530', RIM = '#94704f';
const G = 60; // ground line
function frame(p) {
  const legs = [0, 0.5].map((o) => {
    const q = (p + o) % 1;
    const a = 0.42 * Math.sin(TAU * q);
    const swing = Math.max(0, Math.cos(TAU * q));
    const k = 0.2 + 0.8 * swing * swing;
    return { a, k, swing };
  });
  // leg geometry relative to the hip, to find how high the hip rides
  const TH = 10.5, SH = 10.5;
  const depth = legs.map(({ a, k }) => TH * Math.cos(a) + SH * Math.cos(a - k));
  const hipY = G - 2 - Math.max(...depth);
  const hip = [30, hipY];
  const lean = 0.3 + 0.025 * Math.sin(TAU * p * 2);
  const sh = pt(hip, 16.5, Math.PI + lean); // shoulders, hunched forward
  const legPts = (L) => {
    const knee = pt(hip, TH, L.a);
    const ankle = pt(knee, SH, L.a - L.k);
    const toe = pt(ankle, 5.5, Math.PI / 2 + 0.15 - L.swing * 0.5);
    return [hip, knee, ankle, toe];
  };
  const arms = [0.5, 0].map((o) => {
    const q = (p + o) % 1;
    const s = -0.62 * Math.sin(TAU * q) + 0.1;
    const e = 0.15 + 0.35 * Math.max(0, s);
    const elbow = pt(sh, 12.5, s);
    const wrist = pt(elbow, 12.5, s + e);
    const hand = pt(wrist, 3.4, s + e + 0.25);
    return [sh, elbow, wrist, hand];
  });
  // torso: a heavy wedge from broad shoulders to hips, with the head set low and forward
  const back = [sh[0] - 7.6, sh[1] + 2.2], chest = [sh[0] + 6.4, sh[1] + 3.2], belly = [hip[0] + 6, hip[1] - 4], rump = [hip[0] - 5.6, hip[1] + 1.8];
  const head = [sh[0] + 3.4, sh[1] - 3.4];
  const torso = `<path d="M${f2(back)} C${f2([back[0] - 1.8, back[1] + 8])} ${f2([rump[0] - 1.5, rump[1] - 7])} ${f2(rump)} C${f2([rump[0] + 2, rump[1] + 3.5])} ${f2([belly[0] + 1, belly[1] + 5])} ${f2(belly)} C${f2([belly[0] + 1.8, belly[1] - 6])} ${f2([chest[0] + 1.5, chest[1] + 4])} ${f2(chest)} C${f2([chest[0] - 1, chest[1] - 4])} ${f2([back[0] + 4, back[1] - 5.5])} ${f2(back)} Z" fill="${BODY}"/>`;
  // shaggy tufts along the back, rump and arms, so the edge reads as fur
  const tuft = (q, ang, len, w, c) => { const tip = pt(q, len, ang); return `<path d="M${f2([q[0] - w * Math.cos(ang), q[1] + w * Math.sin(ang)])} L${f2(tip)} L${f2([q[0] + w * Math.cos(ang), q[1] - w * Math.sin(ang)])} Z" fill="${c}"/>` };
  let fur = '';
  for (let i = 0; i < 5; i++) { const t = i / 4; fur += tuft([back[0] - 0.8 + t * (rump[0] - back[0] + 1.2), back[1] + 1 + t * (rump[1] - back[1] - 3)], -Math.PI / 2 - 0.5 - 0.15 * t, 2.2, 1.1, BODY) }
  const headSvg = `<ellipse cx="${head[0] * K}" cy="${head[1] * K}" rx="${4.1 * K}" ry="${4.4 * K}" fill="${BODY}"/>` +
    `<path d="M${f2([head[0] - 3.8, head[1] + 0.5])} Q${f2([head[0] - 3.2, head[1] - 6.2])} ${f2([head[0] + 0.2, head[1] - 5.6])} Q${f2([head[0] + 2.6, head[1] - 4.6])} ${f2([head[0] + 3, head[1] - 2])} Z" fill="${BODY}"/>` +
    // light catching the top of the head and shoulders
    `<path d="M${f2([head[0] - 3.4, head[1] - 2.5])} Q${f2([head[0] - 2, head[1] - 5.8])} ${f2([head[0] + 1.5, head[1] - 4.6])}" stroke="${RIM}" stroke-width="${1.1 * K}" fill="none" stroke-linecap="round"/>` +
    `<path d="M${f2([back[0] + 0.5, back[1] - 0.5])} Q${f2([sh[0] - 2, sh[1] - 2.5])} ${f2([head[0] - 3, head[1] + 2.5])}" stroke="${RIM}" stroke-width="${1.2 * K}" fill="none" stroke-linecap="round"/>`;
  const [nearLeg, farLeg] = legs.map(legPts);
  const [nearArm, farArm] = arms;
  const shift = (pts, dx) => pts.map((q) => [q[0] + dx, q[1]]);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${F * K}" height="${F * K}">`;
  s += limb(shift(farArm, -1.2), [5.8, 4.8, 4], FAR);
  s += limb(shift(farLeg, -1), [7.6, 5.6, 3.2], FAR);
  s += fur + torso + headSvg;
  s += limb(nearLeg, [8, 5.8, 3.3], NEAR);
  s += limb(nearArm, [6.2, 5, 4.2], NEAR);
  // hair hanging off the back of the near arm
  s += tuft([(nearArm[0][0] + nearArm[1][0]) / 2 - 2.2, (nearArm[0][1] + nearArm[1][1]) / 2], -Math.PI / 2 - 0.4, 2, 1.2, NEAR) + tuft([(nearArm[1][0] + nearArm[2][0]) / 2 - 1.8, (nearArm[1][1] + nearArm[2][1]) / 2], -Math.PI / 2 - 0.3, 1.8, 1.1, NEAR);
  s += '</svg>';
  return s;
}
const frames = [];
for (let i = 0; i < N; i++) {
  const png = await sharp(Buffer.from(frame(i / N))).resize(F, F).blur(0.9).png().toBuffer();
  frames.push(png);
}
await sharp({ create: { width: F * N, height: F, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(frames.map((b, i) => ({ input: b, left: i * F, top: 0 }))).webp({ lossless: true }).toFile('src/assets/room/sasquatch.webp');
