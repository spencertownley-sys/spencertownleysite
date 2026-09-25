import { useEffect, useMemo, useState } from 'react'
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry, MultiPoint } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { countries, type Country } from '../content/countries'

const W = 820
const H = 440

type View = 'World' | 'Americas' | 'Caribbean' | 'Europe' | 'Africa' | 'Asia'

// Lon/lat boxes for each zoom. Fitting to boxes, not to country shapes, avoids
// overseas territories (French Guiana, Svalbard, Alaska) blowing out the zoom.
const views: Record<View, [number, number, number, number]> = {
  World: [-170, -56, 179.9, 80],
  Americas: [-128, -2, -56, 60],
  Caribbean: [-88, 7, -59, 27],
  Europe: [-24, 35, 44, 70],
  Africa: [-19, -35, 52, 37],
  Asia: [94, -1, 146, 44],
}

function boxPoints([x0, y0, x1, y1]: [number, number, number, number]): MultiPoint {
  const pts: [number, number][] = []
  for (let i = 0; i <= 8; i++) {
    const x = x0 + ((x1 - x0) * i) / 8
    const y = y0 + ((y1 - y0) * i) / 8
    pts.push([x, y0], [x, y1], [x0, y], [x1, y])
  }
  return { type: 'MultiPoint', coordinates: pts }
}

type CountryProps = { name: string }

export default function CountriesMap() {
  const [topo, setTopo] = useState<Topology | null>(null)
  const [view, setView] = useState<View>('World')
  const [hover, setHover] = useState<Country | null>(null)

  useEffect(() => {
    let live = true
    import('world-atlas/countries-50m.json').then((m) => live && setTopo(m.default as unknown as Topology))
    return () => {
      live = false
    }
  }, [])

  const land = useMemo(() => {
    if (!topo) return null
    const fc = feature(topo, topo.objects.countries as GeometryCollection<CountryProps>) as FeatureCollection<Geometry, CountryProps>
    return fc.features.filter((f) => f.properties.name !== 'Antarctica')
  }, [topo])

  const byAtlas = useMemo(() => new Map(countries.map((c) => [c.atlas, c])), [])

  const { path, projection } = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [10, 10],
        [W - 10, H - 10],
      ],
      boxPoints(views[view]),
    )
    return { projection, path: geoPath(projection) }
  }, [view])

  const graticule = useMemo(() => path(geoGraticule10()) ?? '', [path])
  const zoom = view === 'World' ? 1 : 2.2

  return (
    <div className="map">
      <div className="map-views" role="group" aria-label="Map region">
        {(Object.keys(views) as View[]).map((v) => (
          <button key={v} type="button" className={v === view ? 'is-active' : ''} aria-pressed={v === view} onClick={() => setView(v)}>
            {v}
          </button>
        ))}
      </div>
      <div className="map-frame">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of the ${countries.length} countries visited`} key={view} className="map-svg">
          <rect className="map-ocean" x={0} y={0} width={W} height={H} />
          <path className="map-graticule" d={graticule} />
          {land?.map((f: Feature<Geometry, CountryProps>, i) => {
            const c = byAtlas.get(f.properties.name)
            return (
              <path
                key={`${f.properties.name}-${i}`}
                d={path(f) ?? ''}
                className={c ? 'map-country is-visited' : 'map-country'}
                onPointerEnter={c ? () => setHover(c) : undefined}
                onPointerLeave={c ? () => setHover(null) : undefined}
              >
                {c && <title>{c.name}</title>}
              </path>
            )
          })}
          {countries
            .filter((c) => c.small)
            .map((c) => {
              const p = projection([c.lon, c.lat])
              if (!p || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) return null
              return (
                <g key={c.name} className={`map-marker ${hover === c ? 'is-hover' : ''}`} onPointerEnter={() => setHover(c)} onPointerLeave={() => setHover(null)}>
                  <circle cx={p[0]} cy={p[1]} r={12 / Math.sqrt(zoom)} className="marker-hit" />
                  <circle cx={p[0]} cy={p[1]} r={view === 'World' ? 3.4 : 5} className="marker-dot" />
                  <title>{c.name}</title>
                </g>
              )
            })}
        </svg>
        {!land && <div className="map-loading">Loading map</div>}
      </div>
      <p className="map-readout" aria-live="polite">
        {hover ? (
          <>
            <strong>{hover.name}</strong> <span>{hover.region}</span>
          </>
        ) : (
          <span>{countries.length} countries. Hover one for its name.</span>
        )}
      </p>
    </div>
  )
}
