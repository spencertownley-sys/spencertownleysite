import type { Crop } from './objects'

const ARTBOARD = 2048

/** Renders an object SVG cropped to its drawing, so layout math works on the visible art. */
export function ObjectArt({ src, crop, className }: { src: string; crop: Crop; className?: string }) {
  return (
    <span className={`object-art ${className ?? ''}`} style={{ aspectRatio: `${crop.w} / ${crop.h}` }}>
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        style={{
          width: `${(ARTBOARD / crop.w) * 100}%`,
          left: `${(-crop.x / crop.w) * 100}%`,
          top: `${(-crop.y / crop.h) * 100}%`,
        }}
      />
    </span>
  )
}
