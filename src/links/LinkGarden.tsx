// All my links: the pothos on the shelf opens a wall of vines where every leaf is a link.
// In the Room the camera flies to the plant and the wall fades in as it lands; in the
// Brain (and the list view) it simply fades in. Tags are placed around the leaves on
// the fly, so nothing overlaps at any screen size.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, usePresence } from "framer-motion";
import { linkGarden, sectionById, type Leaf } from "../content/site";
import { ambience } from "../lib/audio";
import { useReducedMotion } from "../lib/hooks";
import type { Mode } from "../lib/router";
import { zoomTrack } from "../room/zoom";
import { contentBounds, tallArt, wideArt, type GardenArt } from "./leaves";

interface Props {
  compact: boolean;
  /** True when the Room camera is flying in to the plant. */
  camera: boolean;
  mode: Mode;
  onClose: () => void;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const section = sectionById.links;
const FOCUSABLE = "a[href], button:not([disabled])";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const cssPx = (name: string, fallback: number) => {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(v) ? v : fallback;
};

/** Leaves narrower than this get hard to read and to tap; below it the wall scrolls instead. */
const MIN_LEAF = 40;

/**
 * Where the picture goes: as large as covers the screen, but never so large that a leaf
 * or the title card ends up under the top or bottom bar or off the side. Where it no
 * longer covers the screen, the wall colour fills in and the picture's edges feather.
 * On a very short screen (a phone on its side) that would shrink the leaves too far, so
 * they keep a readable size and the wall scrolls; `height` is then the scroll height.
 */
function fitArt(
  art: GardenArt,
  w: number,
  h: number,
  compact: boolean,
): Box & { height: number; scroll: boolean } {
  // on phones the Back button sits above the leaves rather than beside them
  const top = cssPx("--bar-h", 68) + (compact ? 54 : 6);
  const bottom = cssPx("--foot-h", 64) + 6;
  const side = 10;
  const b = contentBounds(art);
  const cover = Math.max(w / art.w, h / art.h);
  const fitW = (w - side * 2) / ((b.x1 - b.x0) * art.w);
  const fitH = (h - top - bottom) / ((b.y1 - b.y0) * art.h);
  let s = Math.min(cover, fitW, fitH);
  const scroll = s * art.leaf.w * art.w < MIN_LEAF && fitW > fitH;
  if (scroll) s = Math.min(fitW, MIN_LEAF / (art.leaf.w * art.w));
  const iw = art.w * s;
  const ih = art.h * s;
  // center the content in the free space, then keep the picture covering what it can
  let x = w / 2 - ((b.x0 + b.x1) / 2) * iw;
  x = Math.min(Math.max(x, Math.min(0, w - iw)), Math.max(0, w - iw));
  if (scroll) {
    const y = top - b.y0 * ih;
    return {
      x,
      y,
      w: iw,
      h: ih,
      height: Math.max(h, y + b.y1 * ih + bottom),
      scroll,
    };
  }
  let y = top + (h - top - bottom) / 2 - ((b.y0 + b.y1) / 2) * ih;
  y = Math.min(Math.max(y, Math.min(0, h - ih)), Math.max(0, h - ih));
  return { x, y, w: iw, h: ih, height: h, scroll };
}

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Puts each tag beside its leaf: tries the sides and corners, keeps the spot that covers
 * the fewest leaves, tags, and the title, and stays on screen. Two passes, so early tags
 * can move once the later ones are down.
 */
function placeTags(
  leaves: Box[],
  sizes: { w: number; h: number }[],
  avoid: Box[],
  safe: Box,
  outward: (-1 | 0 | 1)[],
) {
  const gap = 6;
  const spots: Box[] = leaves.map((l, i) => ({
    x: l.x + l.w + gap,
    y: l.y,
    ...sizes[i],
  }));
  const candidates = (l: Box, s: { w: number; h: number }) => {
    const cx = l.x + l.w / 2;
    const cy = l.y + l.h / 2;
    return [
      { x: l.x + l.w + gap, y: cy - s.h / 2 },
      { x: l.x - gap - s.w, y: cy - s.h / 2 },
      { x: cx - s.w / 2, y: l.y + l.h + gap / 2 },
      { x: cx - s.w / 2, y: l.y - gap / 2 - s.h },
      { x: l.x + l.w * 0.7, y: l.y + l.h * 0.8 },
      { x: l.x + l.w * 0.3 - s.w, y: l.y + l.h * 0.8 },
      { x: l.x + l.w * 0.7, y: l.y + l.h * 0.2 - s.h },
      { x: l.x + l.w * 0.3 - s.w, y: l.y + l.h * 0.2 - s.h },
    ].map((p) => ({ ...p, ...s }));
  };
  for (let pass = 0; pass < 2; pass++) {
    leaves.forEach((leaf, i) => {
      let best = spots[i];
      let bestCost = Infinity;
      candidates(leaf, sizes[i]).forEach((c, k) => {
        const area = c.w * c.h;
        const inside = overlap(c, safe);
        let cost = (area - inside) * 50 + k * 4;
        // keep a vine's tags on its own side, so the two vines' tags never mingle
        const dir = Math.sign(c.x + c.w / 2 - (leaf.x + leaf.w / 2));
        if (outward[i] && dir === -outward[i]) cost += 900;
        leaves.forEach((l, j) => (cost += overlap(c, l) * (j === i ? 3 : 8)));
        spots.forEach((t, j) => {
          if (j !== i && (pass > 0 || j < i)) cost += overlap(c, t) * 12;
        });
        avoid.forEach((a) => (cost += overlap(c, a) * 12));
        if (cost < bestCost) {
          bestCost = cost;
          best = c;
        }
      });
      spots[i] = best;
    });
  }
  return spots;
}

export function LinkGarden({ compact, camera, mode, onClose }: Props) {
  const reduced = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();
  const [view, setView] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  const [merged, setMerged] = useState(false);
  const [pic, setPic] = useState<string | null>(null);
  const [tagSpots, setTagSpots] = useState<Box[] | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const loadedAt = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);

  const art = view.w < view.h ? tallArt : wideArt;
  const img = fitArt(art, view.w, view.h, compact);
  const list: Leaf[] = linkGarden.leaves.filter((l) => art.spots[l.id]);
  const leafBoxes: Box[] = list.map((l) => {
    const [sx, sy] = art.spots[l.id];
    const lw = art.leaf.w * img.w;
    const lh = art.leaf.h * img.h;
    return {
      x: img.x + sx * img.w - lw / 2,
      y: img.y + sy * img.h - lh / 2,
      w: lw,
      h: lh,
    };
  });
  const t = art.title;
  const titleBox: Box = {
    x: img.x + t.x * img.w,
    y: img.y + t.y * img.h,
    w: t.w * img.w,
    h: t.h * img.h,
  };
  // where the picture stops short of the screen, its edges fade into the wall colour
  const feather = {
    x: img.x > 0.5 || img.x + img.w < view.w - 0.5,
    y: img.y > 0.5 || img.y + img.h < img.height - 0.5,
  };

  useEffect(() => {
    const onResize = () =>
      setView({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    root.current?.focus({ preventScroll: true });
    return () => {
      const el = returnFocus.current;
      if (el && document.contains(el)) el.focus({ preventScroll: true });
    };
  }, []);

  // Lay the tags out around the leaves whenever the picture moves or the fonts settle.
  const layoutKey = `${art === wideArt ? "w" : "t"}:${view.w}x${view.h}:${compact}`;
  useLayoutEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const sizes = list.map((_, i) => {
        const el = tagRefs.current[i];
        return { w: el?.offsetWidth ?? 120, h: el?.offsetHeight ?? 34 };
      });
      const avoid = [titleBox];
      const b = back.current?.getBoundingClientRect();
      if (b)
        avoid.push({
          x: b.left - 6,
          y: b.top - 6,
          w: b.width + 12,
          h: b.height + 12,
        });
      const top = cssPx("--bar-h", 68);
      const safe = {
        x: 6,
        y: top + 2,
        w: view.w - 12,
        h: img.height - top - cssPx("--foot-h", 64) - 4,
      };
      // the tall picture has a vine on each side: the left one's tags go left
      const outward = list.map((l): -1 | 0 | 1 =>
        art === tallArt && art.spots[l.id][0] < 0.5 ? -1 : 0,
      );
      setTagSpots(placeTags(leafBoxes, sizes, avoid, safe, outward));
    };
    run();
    void document.fonts?.ready.then(run);
    return () => {
      cancelled = true;
    };
    // the boxes are derived from layoutKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  // The fade, one frame at a time: it rides the camera on the way in and out of the
  // room, and simply fades without it (the Brain, the list view, reduced motion).
  const live = useRef({ tracking: camera && !reduced });
  useEffect(() => {
    live.current = { tracking: camera && !reduced };
  });
  useEffect(() => {
    let raf = 0;
    let done = false;
    const since = performance.now();
    const tick = (now: number) => {
      const el = scene.current;
      const { tracking } = live.current;
      const loaded = loadedAt.current;
      const fade = loaded ? Math.min(1, (now - loaded) / 220) : 0;
      let op: number;
      let grow = 0;
      if (tracking) {
        const p = zoomTrack.progress;
        op = Math.min(
          isPresent ? smooth(0.5, 0.97, p) : smooth(0.55, 0.95, p),
          fade,
        );
        grow = 1 - smooth(0.45, 1, p);
      } else {
        op = isPresent ? fade : Math.max(0, 1 - (now - since) / 200);
      }
      // never hang on the way out, whatever the camera is doing
      if (!isPresent)
        op = Math.min(op, 1 - Math.max(0, now - since - 900) / 200);
      if (el) {
        el.style.opacity = op.toFixed(3);
        // a touch of zoom as it fades in, so it reads as getting closer to the plant
        el.style.transform =
          grow > 0.001 ? `scale(${(1 + grow * 0.06).toFixed(4)})` : "";
      }
      if (isPresent && !done && op >= 1) {
        done = true;
        setMerged(true);
        return;
      }
      if (!isPresent && op <= 0) {
        safeToRemove?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPresent, safeToRemove]);

  const leave = () => {
    ambience.sfx("close");
    onClose();
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !root.current) return;
    const els = Array.from(
      root.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === root.current)
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // the title card scales with its patch of wall
  const scale = Math.min(
    1.25,
    Math.max(
      0.62,
      Math.min(
        titleBox.w / (compact ? 170 : 300),
        titleBox.h / (compact ? 92 : 112),
      ),
    ),
  );

  return (
    <div
      ref={root}
      className={`garden ${compact ? "is-compact" : ""} ${merged ? "is-in" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="garden-title"
      tabIndex={-1}
      onKeyDown={trap}
    >
      <div
        ref={scene}
        className={`garden-scene ${img.scroll ? "is-scroll" : ""}`}
        style={{ opacity: 0 }}
      >
        <div className="garden-wall" style={{ height: img.height }}>
          <img
            className={`garden-art ${feather.x ? "feather-x" : ""} ${feather.y ? "feather-y" : ""} ${feather.x && feather.y ? "feather-xy" : ""}`}
            src={art.src}
            srcSet={art.srcSet}
            sizes={`${Math.round(img.w)}px`}
            alt=""
            draggable={false}
            onLoad={(e) => {
              loadedAt.current ||= performance.now();
              setPic(e.currentTarget.currentSrc || e.currentTarget.src);
            }}
            ref={(el) => {
              if (el?.complete && el.naturalWidth && !loadedAt.current) {
                loadedAt.current = performance.now();
                setPic(el.currentSrc || el.src);
              }
            }}
            style={{ left: img.x, top: img.y, width: img.w, height: img.h }}
          />

          <div
            className="garden-title"
            style={{
              left: titleBox.x,
              top: titleBox.y,
              width: titleBox.w,
              height: titleBox.h,
              ["--k" as string]: scale.toFixed(3),
            }}
          >
            <div className="garden-card">
              {!compact && (
                <p className="garden-eyebrow">{section.roomLabel}</p>
              )}
              <h2 id="garden-title">{section.title}</h2>
              <p className="garden-sub">
                {!compact && `${section.subtitle}. `}
                <span className="garden-hint">
                  {compact ? linkGarden.touchHint : linkGarden.hint}
                </span>
              </p>
            </div>
          </div>

          {list.map((leaf, i) => {
            const box = leafBoxes[i];
            const tag = tagSpots?.[i];
            const [sx, sy] = art.spots[leaf.id];
            // the lifted copy: a little bigger than the leaf, cut out of the same picture
            const pad = 0.14;
            const sw = box.w * (1 + pad * 2);
            const sh = box.h * (1 + pad * 2);
            const ox = img.x + sx * img.w - sw / 2;
            const oy = img.y + sy * img.h - sh / 2;
            const bg = `${(img.x - ox).toFixed(1)}px ${(img.y - oy).toFixed(1)}px`;
            const size = `${img.w.toFixed(1)}px ${img.h.toFixed(1)}px`;
            const external = !leaf.href.startsWith("/");
            return (
              <a
                key={leaf.id}
                className={`leaf-link group-${leaf.group}`}
                href={leaf.href}
                target={leaf.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={external ? "noopener noreferrer" : undefined}
                aria-label={`${leaf.name}, ${leaf.sub}${leaf.href.startsWith("mailto:") ? "" : " (opens in a new tab)"}`}
                style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                onClick={() => ambience.sfx("open")}
                onPointerEnter={(e) =>
                  e.pointerType === "mouse" && ambience.sfx("hover")
                }
              >
                {pic && (
                  <span
                    className="leaf-lift"
                    aria-hidden="true"
                    style={{
                      left: ox - box.x,
                      top: oy - box.y,
                      width: sw,
                      height: sh,
                      backgroundImage: `url("${pic}")`,
                      backgroundSize: size,
                      backgroundPosition: bg,
                      maskImage: `url("${art.mask}")`,
                      WebkitMaskImage: `url("${art.mask}")`,
                      maskSize: size,
                      WebkitMaskSize: size,
                      maskPosition: bg,
                      WebkitMaskPosition: bg,
                    }}
                  />
                )}
                <span
                  ref={(el) => void (tagRefs.current[i] = el)}
                  className="leaf-tag"
                  aria-hidden="true"
                  style={
                    tag
                      ? {
                          left: tag.x - box.x,
                          top: tag.y - box.y,
                          ["--d" as string]: `${(i * 0.035).toFixed(3)}s`,
                        }
                      : { left: 0, top: 0, visibility: "hidden" }
                  }
                >
                  <span className="leaf-name">{leaf.name}</span>
                  {!compact && <span className="leaf-sub">{leaf.sub}</span>}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      <motion.button
        ref={back}
        type="button"
        className="garden-back"
        onClick={leave}
        initial={{ opacity: 0 }}
        animate={{ opacity: merged ? 1 : 0 }}
        exit={{ opacity: 0 }}
      >
        <span aria-hidden="true">←</span>{" "}
        {mode === "brain" ? "Back to the brain" : "Back to the room"}
        {!compact && <kbd>Esc</kbd>}
      </motion.button>
    </div>
  );
}
