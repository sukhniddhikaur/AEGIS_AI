import React, { useState } from 'react'
import { VIEWS, project } from '../lib/data.js'
import { INDIA_RINGS } from '../lib/indiaBoundary.js'
import { sum } from '../lib/engine.js'
import { fmt, f2, sevVar } from '../lib/format.js'

const outlinePath = INDIA_RINGS.map((r) => 'M' + r.map(([lo, la]) => project(lo, la).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')

export default function SchematicMap({ model, DEP, dispatch, sel, onSelect, view }) {
  const [tip, setTip] = useState(null)
  const { F, use } = model
  const vb = VIEWS[view], s = vb[2] / 580
  const flows = dispatch.filter((x) => x.i === sel)
  const byDepot = {}
  flows.forEach((x) => { byDepot[x.d] = (byDepot[x.d] || 0) + x.pe })
  const totalPe = sum(Object.values(byDepot)) || 1
  const cur = F[sel]

  const move = (e, content) => {
    const b = e.currentTarget.closest('.mapwrap').getBoundingClientRect()
    let x = e.clientX - b.left + 12
    if (x > b.width - 190) x -= 200
    setTip({ x, y: e.clientY - b.top + 12, content })
  }

  return (
    <div className="mapwrap" onMouseLeave={() => setTip(null)}>
        <svg className="map" viewBox={vb.join(' ')} role="img" aria-label="Flagged districts and relief depots">
          {[70, 75, 80, 85, 90, 95].map((lon) => { const [x] = project(lon, 0); return (
            <g key={lon}><line x1={x} y1="0" x2={x} y2="640" stroke="var(--grid)" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
              <text x={x + 3} y={vb[1] + vb[3] - 5 * s} fontSize={10 * s}>{lon}°E</text></g>) })}
          {[10, 15, 20, 25, 30, 35].map((lat) => { const [, y] = project(0, lat); return (
            <g key={lat}><line x1="0" y1={y} x2="580" y2={y} stroke="var(--grid)" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
              <text x={vb[0] + 4 * s} y={y - 3} fontSize={10 * s}>{lat}°N</text></g>) })}
          <path d={outlinePath} fill="var(--land)" stroke="var(--mute)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />

          {cur && Object.keys(byDepot).map((d) => {
            const a = project(DEP[d].lon, DEP[d].lat), b = project(cur.lon, cur.lat)
            return <line key={d} className="flow" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--accent)"
              strokeWidth={1 + (byDepot[d] / totalPe) * 8} vectorEffect="non-scaling-stroke" opacity=".75" />
          })}

          {DEP.map((d, i) => { const [x, y] = project(d.lon, d.lat), h = 4.6 * s, active = !!byDepot[i]
            return (
              <g key={d.id || i}>
                <rect x={x - h} y={y - h} width={2 * h} height={2 * h} fill={active ? 'var(--accent)' : 'var(--ink)'} opacity={active ? 1 : 0.7} tabIndex={0}
                  aria-label={d.name} onMouseMove={(e) => move(e, <><b>{d.name}</b><br />{d.type} depot</>)} />
                {(view !== 'all' || active) && <text x={x + 7 * s} y={y + 3 * s} fontSize={9.5 * s}>{d.name.replace(' (placeholder)', '')}</text>}
              </g>) })}

          {F.map((d, i) => { const [x, y] = project(d.lon, d.lat), r = (4 + Math.sqrt(d.aff) / 30) * s * (view === 'all' ? 1 : 1.2), on = i === sel
            return (
              <g key={d.name + i}>
                {d.sev === 'Critical' && <circle className="pulse" cx={x} cy={y} r={r} fill="none" stroke="var(--crit)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
                <circle cx={x} cy={y} r={r} fill={sevVar(d.sev)} fillOpacity=".72" stroke={on ? 'var(--ink)' : sevVar(d.sev)} strokeWidth={on ? 2.5 : 1}
                  vectorEffect="non-scaling-stroke" tabIndex={0} role="button" aria-label={`${d.name}, ${d.sev}`} style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i) } }}
                  onMouseMove={(e) => move(e, <><b>{d.name}</b>, {d.state}<br />{d.sev} · P {f2(d.p)}<br />{fmt(d.aff)} affected · {Math.round(use.m.dc[i] * 100)}% served</>)} />
                {(view !== 'all' || on || d.sev === 'Critical') && <text x={x + r + 3 * s} y={y + 3 * s} fontSize={10.5 * s} style={{ fill: 'var(--ink)', fontWeight: 600 }}>{d.name}</text>}
              </g>) })}
        </svg>
        {tip && <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>}
      </div>
  )
}
