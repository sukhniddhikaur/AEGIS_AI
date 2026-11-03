import React, { useState } from 'react'
import { fmt, f1 } from '../lib/format.js'

export default function DispatchTable({ model, RES, DEP, dispatch, hasNb, dsrc, onDsrc, onSelect }) {
  const [f, setF] = useState({ dep: '', dis: '', res: '', q: '' })
  const [sortKey, setSortKey] = useState('eta')
  const [csv, setCsv] = useState('')
  const [copied, setCopied] = useState(false)
  const base = dispatch.map((x) => ({ ...x, dep: DEP[x.d].name, dis: model.F[x.i].name, res: RES[x.k].name }))
  const q = f.q.toLowerCase()
  const rows = base.filter((x) => (!f.dep || x.dep === f.dep) && (!f.dis || x.dis === f.dis) && (!f.res || x.res === f.res) && (!q || (x.dep + x.dis + x.res).toLowerCase().includes(q)))
    .sort((a, b) => (sortKey === 'eta' ? a.eta - b.eta : sortKey === 'units' ? b.units - a.units : String(a[sortKey]).localeCompare(String(b[sortKey]))))
  const opts = (k) => [...new Set(base.map((x) => x[k]))].sort()
  const Sel = ({ k, label }) => (
    <label>{label}<select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">All</option>{opts(k).map((o) => <option key={o}>{o}</option>)}</select></label>)
  const copy = () => {
    const t = 'Depot,District,Resource,Units,Distance_km,ETA_h\n' + rows.map((x) => [x.dep, x.dis, x.res, Math.round(x.units), Math.round(x.km), x.eta.toFixed(1)].map((v) => (/,/.test(v) ? `"${v}"` : v)).join(',')).join('\n')
    setCsv(t)
    navigator.clipboard?.writeText(t).then(() => setCopied(true)).catch(() => setCopied(false))
  }
  return (
    <>
      <div className="filters">
        <Sel k="dep" label="Depot" /><Sel k="dis" label="District" /><Sel k="res" label="Resource" />
        <input type="search" placeholder="Search" aria-label="Search dispatch" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        {hasNb && <div className="seg" role="group" aria-label="Dispatch source" style={{ minWidth: 210 }}>
          <button type="button" aria-pressed={dsrc !== 'nb'} onClick={() => onDsrc('calc')}>Computed</button>
          <button type="button" aria-pressed={dsrc === 'nb'} onClick={() => onDsrc('nb')}>Notebook</button></div>}
        <button className="btn" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy as CSV'}</button>
      </div>
      <div className="tw"><table>
        <thead><tr>{[['dep', 'Depot'], ['dis', 'District'], ['res', 'Resource']].map(([k, t]) => <th key={k} onClick={() => setSortKey(k)}>{t}</th>)}
          <th className="n" onClick={() => setSortKey('units')}>Units</th><th className="n">Distance km</th><th className="n" onClick={() => setSortKey('eta')}>ETA h</th></tr></thead>
        <tbody>{rows.slice(0, 300).map((x, n) => (
          <tr key={n} className="click" onClick={() => onSelect(x.i)}><td>{x.dep}</td><td>{x.dis}</td><td>{x.res}</td><td className="n">{fmt(x.units)}</td><td className="n">{fmt(x.km)}</td>
            <td className="n" style={{ color: x.eta > 48 ? 'var(--crit)' : x.eta > 24 ? 'var(--high)' : 'inherit' }}>{f1(x.eta)}</td></tr>))}</tbody>
      </table></div>
      <div className="pb note">{rows.length} movements · ETA over 48 h is red, over 24 h is amber. Click a header to sort.
        {csv && !copied && <pre className="csv">{csv}</pre>}</div>
    </>
  )
}
