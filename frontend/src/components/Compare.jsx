import React from 'react'
import { POOLS } from '../lib/data.js'
import { allocate, dispatchPlan, metrics } from '../lib/engine.js'
import { f1 } from '../lib/format.js'

function Bars({ label, a, g, max, unit }) {
  return (
    <div className="cmpb"><span>{label}</span>
      <div className="bw"><div className="b2 a" style={{ width: `${(a / max) * 100}%` }}><span>{f1(a)}{unit}</span></div>
        <div className="b2 g" style={{ width: `${(g / max) * 100}%` }}><span>{f1(g)}{unit}</span></div></div></div>)
}

function Sensitivity({ model, RES, DEP, poolIdx }) {
  const { F, E } = model
  const pts = POOLS.map((mu) => { const a = allocate(F, RES, 'opt', mu), b = allocate(F, RES, 'greedy', mu)
    return { mu, o: metrics(F, a, dispatchPlan(F, a, 'opt', E, DEP, RES), RES), g: metrics(F, b, dispatchPlan(F, b, 'greedy', E, DEP, RES), RES) } })
  const W = 520, H = 230, L = 44, R = 14, T = 14, B = 34
  const ymax = Math.max(1, ...pts.map((p) => Math.max(p.o.resp, p.g.resp))) * 1.12
  const X = (i) => L + (i * (W - L - R)) / (pts.length - 1), Y = (v) => T + (1 - v / ymax) * (H - T - B)
  const line = (k, col) => (<g>
    <polyline fill="none" stroke={col} strokeWidth="2.2" points={pts.map((p, i) => `${X(i)},${Y(p[k].resp)}`).join(' ')} />
    {pts.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p[k].resp)} r={i === poolIdx ? 5 : 3} fill={col} />)}</g>)
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 560 }} role="img" aria-label="Average response time by pool size, optimised versus greedy">
      {[0, 1, 2, 3, 4].map((t) => { const v = (ymax * t) / 4; return <g key={t}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" strokeWidth=".7" /><text x={L - 6} y={Y(v) + 3} fontSize="10" textAnchor="end">{Math.round(v)}</text></g> })}
      {pts.map((p, i) => <text key={i} x={X(i)} y={H - 14} fontSize="10" textAnchor="middle">{p.mu}×</text>)}
      {line('g', 'var(--c2)')}{line('o', 'var(--accent)')}
      <text x={L} y="10" fontSize="10">hours</text>
      <text x={W - R} y={Y(last.g.resp) - 8} fontSize="11" textAnchor="end" style={{ fill: 'var(--c2)' }}>Greedy</text>
      <text x={W - R} y={Y(last.o.resp) + 16} fontSize="11" textAnchor="end" style={{ fill: 'var(--accent)' }}>Optimised</text>
    </svg>)
}

export default function Compare({ model, RES, DEP, poolIdx, solver }) {
  const { mO: o, mG: g } = model, mx = Math.max(o.resp, g.resp, 1)
  const R = ({ a, b, c }) => <tr><td>{a}</td><td className="n">{b}</td><td className="n">{c}</td></tr>
  return (
    <div className="pb two">
      <div className="sec"><h3>Same pool, two methods</h3>
        <div className="note" style={{ marginBottom: 8 }}><i className="dot" style={{ background: 'var(--accent)' }} />Optimised <i className="dot" style={{ background: 'var(--c2)', marginLeft: 10 }} />Greedy</div>
        <Bars label="Avg response (h)" a={o.resp} g={g.resp} max={mx} unit=" h" />
        <table><thead><tr><th>Metric</th><th className="n">Optimised</th><th className="n">Greedy</th></tr></thead><tbody>
          <R a="Population covered" b={f1(o.popCov) + '%'} c={f1(g.popCov) + '%'} />
          <R a="Pool used" b={f1(o.util) + '%'} c={f1(g.util) + '%'} />
          <R a="Critical below minimum" b={o.critBelow} c={g.critBelow} />
          <R a="Flooded below minimum" b={o.belowMin} c={g.belowMin} />
          <R a="Districts with no service" b={o.zero} c={g.zero} />
          <R a="Avg response (h)" b={f1(o.resp)} c={f1(g.resp)} /></tbody></table>
        <p className="note">{solver === 'server'
          ? 'Optimised column is the HiGHS linear programme solved on the server. Greedy is the severity-weighted baseline.'
          : 'Optimised column uses the fast in-browser rule, which matches the linear programme on coverage and guarantees. Switch to Server LP for the exact solver.'}</p></div>
      <div className="sec"><h3>Response time as the pool grows</h3>
        <Sensitivity model={model} RES={RES} DEP={DEP} poolIdx={poolIdx} />
        <p className="note">The larger dot marks the current pool. Coverage is the same for both methods; the optimiser's gain is spread across districts and shorter trips.</p></div>
    </div>)
}
