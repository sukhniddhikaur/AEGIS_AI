import React from 'react'
import { fmt, f1, f2 } from '../lib/format.js'

export default function DetailPanel({ model, RES, DEP, dispatch, sel, sigma, method }) {
  const { F, use, mc, rank } = model
  if (!F.length) return <section className="panel"><div className="pb sub">No flagged districts. Lower the minimum flood probability.</div></section>
  const i = sel, d = F[i], m = use.m, al = use.al
  const r = rank.indexOf(i) + 1
  const q = mc.d[i] || { p10: 0, p50: 0, p90: 0 }
  const cv = m.dc[i]

  const sup = {}
  dispatch.filter((x) => x.i === i).forEach((x) => { const s = (sup[x.d] = sup[x.d] || { pe: 0, km: x.km, eta: x.eta }); s.pe += x.pe })
  const suppliers = Object.entries(sup).sort((a, b) => b[1].pe - a[1].pe).slice(0, 4)

  const why = cv >= 0.995
    ? `Full estimated demand is met. Severity × probability ranks ${d.name} number ${r} of ${F.length}, high enough that stock lasts until it is served.`
    : `Receives ${Math.round(cv * 100)}% of demand. ` + (method === 'opt'
      ? `This is its guaranteed fair share; the pool ran out before the priority fill reached it (rank ${r} of ${F.length}).`
      : `The greedy order served districts above it first and left this share (rank ${r} of ${F.length}).`)

  return (
    <section className="panel" aria-label="District detail">
      <div className="ph"><h2>District detail</h2><span className="sub">priority {r} of {F.length}</span></div>
      <div className="pb">
        <h3 className="dname">{d.name}</h3>
        <div className="sub">{d.state} · <span className={`chip ${d.sev}`}>{d.sev}</span>{' '}
          {d.p > 0.6 && <span className="chip warn" title="The calibrator saw few high-probability days in 2023–24">thin calibration above 0.6</span>}</div>
        <div className="stats">
          <div><small>Flood probability</small><b>{f2(d.p)}</b></div>
          <div><small>Population</small><b>{fmt(d.pop)}</b></div>
          <div><small>Affected (est.)</small><b>{fmt(d.aff)}</b></div>
        </div>
        {RES.map((rs, k) => {
          const dem = d.aff * rs.rate, got = al.A[i][k] * rs.rate, c = Math.min(1, al.A[i][k] / d.aff), g = al.G[i][k] / d.aff
          return (
            <div key={rs.id}>
              <div className="rrow">
                <span>{rs.name}</span>
                <div className="track" title="Marker = guaranteed minimum"><i style={{ width: `${c * 100}%` }} /><u style={{ left: `${g * 100}%` }} /></div>
                <span className="num">{Math.round(c * 100)}%</span>
              </div>
              <div className="sub" style={{ margin: '-2px 0 4px 108px', fontSize: 11.5 }}>{f1(got)} of {f1(dem)} {rs.unit}</div>
            </div>)
        })}
        <div className="why">{why}</div>

        <h3 className="h">If the forecast is off by ±{Math.round(sigma * 100)}%</h3>
        <div className="band" aria-hidden="true">
          <i style={{ left: `${q.p10 * 100}%`, width: `${Math.max(0.6, (q.p90 - q.p10) * 100)}%` }} /><u style={{ left: `${cv * 100}%` }} />
        </div>
        <div className="sub">Coverage would range {Math.round(q.p10 * 100)}–{Math.round(q.p90 * 100)}% (middle {Math.round(q.p50 * 100)}%). The black tick is the current plan.</div>

        <h3 className="h">Supplied from</h3>
        {suppliers.length ? suppliers.map(([di, v]) => (
          <div className="rrow" style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 70px' }} key={di}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DEP[di].name}</span>
            <span className="num">{fmt(v.km)} km</span><span className="num">{f1(v.eta)} h</span>
          </div>)) : <div className="sub">Nothing dispatched.</div>}
      </div>
    </section>
  )
}
