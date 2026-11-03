import React, { useState } from 'react'
import { fmt, f2 } from '../lib/format.js'

export default function AllocTable({ model, RES, sel, onSelect }) {
  const [key, setKey] = useState('sev')
  const { F, use } = model, m = use.m
  const ord = F.map((_, i) => i).sort((a, b) => F[b].sw - F[a].sw || F[b].p - F[a].p)
  if (key === 'aff') ord.sort((a, b) => F[b].aff - F[a].aff)
  if (key === 'p') ord.sort((a, b) => F[b].p - F[a].p)
  if (key === 'name') ord.sort((a, b) => F[a].name.localeCompare(F[b].name))
  const H = ({ k, t, c }) => <th className={c} onClick={() => setKey(k)} title="Sort">{t}</th>
  return (
    <>
      <div className="tw"><table>
        <thead><tr><H k="name" t="District" /><th>State</th><H k="sev" t="Severity" /><H k="p" t="P(flood)" c="n" /><H k="aff" t="Affected" c="n" />
          {RES.map((r) => <th key={r.id} className="hm" title={r.name}>{r.name.split(' ')[0]}</th>)}<th className="n">Avg</th></tr></thead>
        <tbody>{ord.map((i) => { const d = F[i]; return (
          <tr key={d.name + i} className={`click ${i === sel ? 'sel' : ''}`} onClick={() => onSelect(i)}>
            <td><b>{d.name}</b></td><td>{d.state}</td><td><span className={`chip ${d.sev}`}>{d.sev}</span></td>
            <td className="n">{f2(d.p)}</td><td className="n">{fmt(d.aff)}</td>
            {m.cov[i].map((c, k) => <td key={k} className="hm" style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(c * 70)}%, transparent)` }}>{Math.round(c * 100)}%</td>)}
            <td className="n">{Math.round(m.dc[i] * 100)}%</td></tr>) })}</tbody>
      </table></div>
      <div className="pb note">Cells show the share of each district's estimated demand met. Click a row to open it on the map.</div>
    </>
  )
}
