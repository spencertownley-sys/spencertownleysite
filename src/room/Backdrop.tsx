import { useState, type CSSProperties } from 'react'
import { useNow } from '../lib/hooks'

// Hand-drawn room pieces in the same flat, thick-outline style as the object art.
// Everything is in scene units; the wall and floor extend far past the scene so
// letterboxed viewports still read as one continuous room.

const INK = '#231C1A'
const SW = 6
const BLEED = 4000

export interface FurnitureSpec {
  width: number
  height: number
  floorY: number
  window: { x: number; y: number; w: number; h: number }
  clock: { cx: number; cy: number; r: number }
  plant: { x: number; top: number }
  shelf: { x: number; y: number; w: number }
  desk: { x: number; y: number; w: number }
  console: { x: number; y: number; w: number; h: number }
  rug: { cx: number; cy: number; rx: number; ry: number }
}

export const landscapeFurniture: FurnitureSpec = {
  width: 1600,
  height: 1000,
  floorY: 668,
  window: { x: 584, y: 104, w: 300, h: 250 },
  clock: { cx: 1004, cy: 196, r: 50 },
  plant: { x: 440, top: 0 },
  shelf: { x: 1132, y: 338, w: 404 },
  desk: { x: 540, y: 562, w: 590 },
  console: { x: 70, y: 712, w: 400, h: 118 },
  rug: { cx: 760, cy: 846, rx: 290, ry: 48 },
}

export const portraitFurniture: FurnitureSpec = {
  width: 1000,
  height: 1400,
  floorY: 930,
  window: { x: 350, y: 160, w: 270, h: 240 },
  clock: { cx: 740, cy: 236, r: 48 },
  plant: { x: 912, top: 10 },
  shelf: { x: 596, y: 594, w: 380 },
  desk: { x: 50, y: 832, w: 560 },
  console: { x: 44, y: 1184, w: 392, h: 112 },
  rug: { cx: 540, cy: 1334, rx: 380, ry: 52 },
}

function Clock({ cx, cy, r }: FurnitureSpec['clock']) {
  const now = useNow(15000)
  // Start the sweep at the real second, once; changing it later would make the hand jump.
  const [secondDelay] = useState(() => `-${new Date().getSeconds()}s`)
  const h = (now.getHours() % 12) + now.getMinutes() / 60
  const m = now.getMinutes() + now.getSeconds() / 60
  return (
    <g className="clock">
      <circle cx={cx} cy={cy} r={r} fill="#FBF7EE" stroke={INK} strokeWidth={SW} />
      <circle cx={cx} cy={cy} r={r - 11} fill="none" stroke="#E6DCC8" strokeWidth={3} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const r1 = r - 10
        const r2 = i % 3 === 0 ? r - 20 : r - 15
        return (
          <line
            key={i}
            x1={cx + Math.sin(a) * r1}
            y1={cy - Math.cos(a) * r1}
            x2={cx + Math.sin(a) * r2}
            y2={cy - Math.cos(a) * r2}
            stroke={INK}
            strokeWidth={i % 3 === 0 ? 4 : 2.5}
            strokeLinecap="round"
          />
        )
      })}
      <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.45} stroke={INK} strokeWidth={6} strokeLinecap="round" transform={`rotate(${h * 30} ${cx} ${cy})`} />
      <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.68} stroke={INK} strokeWidth={4} strokeLinecap="round" transform={`rotate(${m * 6} ${cx} ${cy})`} />
      <g className="clock-second" style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: secondDelay }}>
        <line x1={cx} y1={cy + 8} x2={cx} y2={cy - r * 0.74} stroke="#D6543F" strokeWidth={2.5} strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={5} fill="#D6543F" stroke={INK} strokeWidth={2} />
    </g>
  )
}

function Window({ x, y, w, h }: FurnitureSpec['window']) {
  const mx = x + w / 2
  const my = y + h / 2
  return (
    <g className="window">
      <defs>
        <clipPath id="window-glass">
          <rect x={x + 14} y={y + 14} width={w - 28} height={h - 28} rx={6} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="#FBF7EE" stroke={INK} strokeWidth={SW} />
      <g clipPath="url(#window-glass)">
        <rect x={x} y={y} width={w} height={h} fill="#A9DAEF" />
        <circle cx={x + w * 0.74} cy={y + h * 0.3} r={26} fill="#F2C35B" stroke={INK} strokeWidth={4} />
        <g className="clouds" style={{ '--shift': `${-(w + 60)}px` } as CSSProperties}>
          {[0, 1].map((k) => (
            <g key={k} transform={`translate(${k * (w + 60)} 0)`}>
              <path
                d={`M ${x + 20} ${y + 88} q 10 -26 36 -18 q 14 -24 42 -10 q 26 -4 28 22 q 18 4 12 20 h -112 q -16 -4 -6 -14 z`}
                fill="#FFFDF7"
                stroke={INK}
                strokeWidth={3.5}
                strokeLinejoin="round"
              />
              <path
                d={`M ${x + 150} ${y + 150} q 8 -18 28 -12 q 12 -18 32 -6 q 20 0 18 18 h -74 q -10 -2 -4 0 z`}
                fill="#FFFDF7"
                stroke={INK}
                strokeWidth={3.5}
                strokeLinejoin="round"
              />
            </g>
          ))}
        </g>
        <path
          d={`M ${x} ${y + h * 0.78} q ${w * 0.22} -46 ${w * 0.45} -12 q ${w * 0.25} -52 ${w * 0.55} 4 V ${y + h} H ${x} z`}
          fill="#6FA565"
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path
          d={`M ${x} ${y + h * 0.9} q ${w * 0.3} -30 ${w * 0.6} -6 q ${w * 0.25} -14 ${w * 0.4} 0 V ${y + h} H ${x} z`}
          fill="#3F7D4E"
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </g>
      <line x1={mx} y1={y + 12} x2={mx} y2={y + h - 12} stroke={INK} strokeWidth={SW} />
      <line x1={x + 12} y1={my} x2={x + w - 12} y2={my} stroke={INK} strokeWidth={SW} />
      <rect x={x - 16} y={y + h - 4} width={w + 32} height={20} rx={6} fill="#EDE3CF" stroke={INK} strokeWidth={SW} />
    </g>
  )
}

function HangingPlant({ x, top }: FurnitureSpec['plant']) {
  const potY = top + 150
  return (
    <g className="plant" style={{ transformOrigin: `${x}px ${top - 200}px` }}>
      <line x1={x} y1={-BLEED} x2={x} y2={potY - 36} stroke={INK} strokeWidth={3} />
      <path d={`M ${x} ${potY - 38} L ${x - 30} ${potY + 2} M ${x} ${potY - 38} L ${x + 30} ${potY + 2}`} stroke={INK} strokeWidth={3} fill="none" />
      <g className="plant-vines">
        {[
          `M ${x - 22} ${potY + 30} q -26 50 -8 96 q 10 30 -6 70`,
          `M ${x + 20} ${potY + 30} q 28 44 10 88`,
          `M ${x} ${potY + 34} q -6 40 6 64`,
        ].map((d, i) => (
          <path key={i} d={d} stroke="#2F6B3F" strokeWidth={5} fill="none" strokeLinecap="round" />
        ))}
        {[
          [x - 38, potY + 70],
          [x - 30, potY + 118],
          [x - 34, potY + 160],
          [x - 22, potY + 198],
          [x + 34, potY + 64],
          [x + 36, potY + 104],
          [x + 6, potY + 84],
        ].map(([lx, ly], i) => (
          <ellipse
            key={i}
            cx={lx}
            cy={ly}
            rx={13}
            ry={8}
            fill={i % 2 ? '#3F7D4E' : '#5E9B55'}
            stroke={INK}
            strokeWidth={3}
            transform={`rotate(${i % 2 ? -35 : 30} ${lx} ${ly})`}
          />
        ))}
      </g>
      {[-34, -16, 2, 20, 34].map((dx, i) => (
        <ellipse
          key={i}
          cx={x + dx}
          cy={potY - 6 - (i % 2) * 8}
          rx={15}
          ry={9}
          fill={i % 2 ? '#3F7D4E' : '#5E9B55'}
          stroke={INK}
          strokeWidth={3}
          transform={`rotate(${dx} ${x + dx} ${potY - 6})`}
        />
      ))}
      <path
        d={`M ${x - 36} ${potY} h 72 l -8 42 q -2 8 -10 8 h -36 q -8 0 -10 -8 z`}
        fill="#D6543F"
        stroke={INK}
        strokeWidth={SW - 1}
        strokeLinejoin="round"
      />
      <rect x={x - 40} y={potY - 4} width={80} height={14} rx={5} fill="#C4452F" stroke={INK} strokeWidth={SW - 1} />
    </g>
  )
}

function Shelf({ x, y, w }: FurnitureSpec['shelf']) {
  return (
    <g>
      {[x + 50, x + w - 50].map((bx) => (
        <path key={bx} d={`M ${bx} ${y + 16} v 40 l 34 -40 z`} fill="#8B5E3C" stroke={INK} strokeWidth={SW - 1} strokeLinejoin="round" />
      ))}
      <rect x={x} y={y} width={w} height={20} rx={5} fill="#B9784A" stroke={INK} strokeWidth={SW} />
    </g>
  )
}

export function WallArt({ spec }: { spec: FurnitureSpec }) {
  const { width, height } = spec
  return (
    <svg className="backdrop" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="wallpaper" width="44" height="44" patternUnits="userSpaceOnUse">
          <circle cx="11" cy="11" r="2.2" fill="#E7DDCA" />
          <circle cx="33" cy="33" r="2.2" fill="#E7DDCA" />
        </pattern>
      </defs>
      <rect x={-BLEED} y={-BLEED} width={width + BLEED * 2} height={spec.floorY + BLEED} fill="#F4EFE4" />
      <rect x={-BLEED} y={-BLEED} width={width + BLEED * 2} height={spec.floorY + BLEED} fill="url(#wallpaper)" />
      <Window {...spec.window} />
      <Clock {...spec.clock} />
      <Shelf {...spec.shelf} />
      <HangingPlant {...spec.plant} />
    </svg>
  )
}

export function FloorArt({ spec }: { spec: FurnitureSpec }) {
  const { width, height, floorY, desk, console: con, rug } = spec
  const deskLegBottom = floorY + 44
  const planks = []
  for (let i = 0, y = floorY + 30; y < height + 600; i++, y += 46 + i * 6) {
    planks.push(<line key={`p${i}`} x1={-BLEED} y1={y} x2={width + BLEED} y2={y} stroke="#DDC395" strokeWidth={3} />)
    const span = width + 1400
    for (let k = 0; k < Math.ceil(span / 420); k++) {
      const jx = ((k * 457 + i * 211) % span) - 700
      planks.push(<line key={`j${i}-${k}`} x1={jx} y1={y} x2={jx} y2={y + 46 + i * 6} stroke="#DDC395" strokeWidth={3} />)
    }
  }
  return (
    <svg className="backdrop" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x={-BLEED} y={floorY} width={width + BLEED * 2} height={BLEED} fill="#E8D1A6" />
      {planks}
      <rect x={-BLEED} y={floorY - 26} width={width + BLEED * 2} height={30} fill="#FBF7EE" stroke={INK} strokeWidth={SW} />

      {/* rug */}
      <ellipse cx={rug.cx} cy={rug.cy + 8} rx={rug.rx} ry={rug.ry} fill="rgba(35,28,26,0.12)" />
      <ellipse cx={rug.cx} cy={rug.cy} rx={rug.rx} ry={rug.ry} fill="#5FB4D9" stroke={INK} strokeWidth={SW} />
      <ellipse cx={rug.cx} cy={rug.cy} rx={rug.rx - 26} ry={rug.ry - 12} fill="none" stroke="#F4EFE4" strokeWidth={6} strokeDasharray="2 16" strokeLinecap="round" />
      <ellipse cx={rug.cx} cy={rug.cy} rx={rug.rx - 60} ry={rug.ry - 24} fill="#4A9CC2" stroke={INK} strokeWidth={3} />

      {/* desk */}
      <ellipse cx={desk.x + desk.w / 2} cy={deskLegBottom + 4} rx={desk.w / 2} ry={12} fill="rgba(35,28,26,0.12)" />
      {[desk.x + 30, desk.x + desk.w - 52].map((lx) => (
        <rect key={lx} x={lx} y={desk.y + 20} width={22} height={deskLegBottom - desk.y - 20} rx={4} fill="#8B5E3C" stroke={INK} strokeWidth={SW - 1} />
      ))}
      <rect x={desk.x + desk.w - 230} y={desk.y + 20} width={190} height={62} rx={6} fill="#A06C45" stroke={INK} strokeWidth={SW - 1} />
      <rect x={desk.x + desk.w - 158} y={desk.y + 46} width={46} height={10} rx={5} fill="#D9A441" stroke={INK} strokeWidth={3} />
      <rect x={desk.x} y={desk.y} width={desk.w} height={26} rx={7} fill="#B9784A" stroke={INK} strokeWidth={SW} />

      {/* console */}
      <ellipse cx={con.x + con.w / 2} cy={con.y + con.h + 30} rx={con.w / 2 + 10} ry={14} fill="rgba(35,28,26,0.14)" />
      {[con.x + 34, con.x + con.w - 46].map((lx) => (
        <path key={lx} d={`M ${lx} ${con.y + con.h - 4} l 4 30 h 8 l 4 -30 z`} fill="#8B5E3C" stroke={INK} strokeWidth={SW - 2} strokeLinejoin="round" />
      ))}
      <rect x={con.x} y={con.y} width={con.w} height={con.h} rx={12} fill="#3F7D4E" stroke={INK} strokeWidth={SW} />
      <rect x={con.x + 18} y={con.y + 18} width={con.w / 2 - 27} height={con.h - 36} rx={8} fill="#4C8C5B" stroke={INK} strokeWidth={4} />
      <rect x={con.x + con.w / 2 + 9} y={con.y + 18} width={con.w / 2 - 27} height={con.h - 36} rx={8} fill="#4C8C5B" stroke={INK} strokeWidth={4} />
      <circle cx={con.x + con.w / 2 - 22} cy={con.y + con.h / 2} r={6} fill="#D9A441" stroke={INK} strokeWidth={3} />
      <circle cx={con.x + con.w / 2 + 22} cy={con.y + con.h / 2} r={6} fill="#D9A441" stroke={INK} strokeWidth={3} />
    </svg>
  )
}
