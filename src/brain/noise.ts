// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT), ported to TypeScript.
// Used on the CPU to sculpt the brain's folds, so the glowing sulcus lines and
// the node anchors all come from the same field.

const mod289 = (x: number) => x - Math.floor(x * (1 / 289)) * 289
const permute = (x: number) => mod289((x * 34 + 1) * x)
const taylorInvSqrt = (r: number) => 1.79284291400159 - 0.85373472095314 * r

export function snoise(vx: number, vy: number, vz: number): number {
  const C1 = 1 / 6
  const C2 = 1 / 3

  const s = (vx + vy + vz) * C2
  let ix = Math.floor(vx + s)
  let iy = Math.floor(vy + s)
  let iz = Math.floor(vz + s)
  const t = (ix + iy + iz) * C1
  const x0x = vx - ix + t
  const x0y = vy - iy + t
  const x0z = vz - iz + t

  // g = step(x0.yzx, x0.xyz)
  const gx = x0x >= x0y ? 1 : 0
  const gy = x0y >= x0z ? 1 : 0
  const gz = x0z >= x0x ? 1 : 0
  const lx = 1 - gx
  const ly = 1 - gy
  const lz = 1 - gz
  // i1 = min(g.xyz, l.zxy), i2 = max(g.xyz, l.zxy)
  const i1x = Math.min(gx, lz)
  const i1y = Math.min(gy, lx)
  const i1z = Math.min(gz, ly)
  const i2x = Math.max(gx, lz)
  const i2y = Math.max(gy, lx)
  const i2z = Math.max(gz, ly)

  const x1x = x0x - i1x + C1
  const x1y = x0y - i1y + C1
  const x1z = x0z - i1z + C1
  const x2x = x0x - i2x + C2
  const x2y = x0y - i2y + C2
  const x2z = x0z - i2z + C2
  const x3x = x0x - 0.5
  const x3y = x0y - 0.5
  const x3z = x0z - 0.5

  ix = mod289(ix)
  iy = mod289(iy)
  iz = mod289(iz)

  const p = [0, i1z, i2z, 1].map((dz, k) => {
    const dy = [0, i1y, i2y, 1][k]
    const dx = [0, i1x, i2x, 1][k]
    return permute(permute(permute(iz + dz) + iy + dy) + ix + dx)
  })

  const nsx = 2 / 7
  const nsy = 0.5 / 7 - 1
  const nsz = 1 / 7

  const gxs: number[] = []
  const gys: number[] = []
  const gzs: number[] = []
  for (let k = 0; k < 4; k++) {
    const j = p[k] - 49 * Math.floor(p[k] * nsz * nsz)
    const x_ = Math.floor(j * nsz)
    const y_ = Math.floor(j - 7 * x_)
    let x = x_ * nsx + nsy
    let y = y_ * nsx + nsy
    const h = 1 - Math.abs(x) - Math.abs(y)
    const sx = Math.floor(x) * 2 + 1
    const sy = Math.floor(y) * 2 + 1
    const sh = h <= 0 ? -1 : 0
    x = x + sx * sh
    y = y + sy * sh
    const norm = taylorInvSqrt(x * x + y * y + h * h)
    gxs.push(x * norm)
    gys.push(y * norm)
    gzs.push(h * norm)
  }

  const xs = [
    [x0x, x0y, x0z],
    [x1x, x1y, x1z],
    [x2x, x2y, x2z],
    [x3x, x3y, x3z],
  ]
  let sum = 0
  for (let k = 0; k < 4; k++) {
    const [a, b, c] = xs[k]
    let m = Math.max(0.6 - (a * a + b * b + c * c), 0)
    m *= m
    sum += m * m * (gxs[k] * a + gys[k] * b + gzs[k] * c)
  }
  return 42 * sum
}
