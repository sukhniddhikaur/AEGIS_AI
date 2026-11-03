import React, { useState } from 'react'
import SatelliteMap from './SatelliteMap.jsx'
import SchematicMap from './SchematicMap.jsx'

const Seg = ({ items, value, onPick, label }) => (
  <div className="seg" role="group" aria-label={label} style={{ minWidth: 150 }}>
    {items.map(([k, t]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onPick(k)}>{t}</button>)}
  </div>)

export default function MapView(props) {
  const [mode, setMode] = useState('sat')
  const [failed, setFailed] = useState(false)
  const shown = failed ? 'svg' : mode
  return (
    <section className="panel" aria-label="Situation map">
      <div className="ph">
        <h2>Situation map</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Seg label="Map style" value={shown} onPick={(k) => { setFailed(false); setMode(k) }} items={[['sat', 'Aerial'], ['svg', 'Schematic']]} />
          <Seg label="Map view" value={props.view} onPick={props.onView} items={[['all', 'India'], ['ne', 'Northeast'], ['south', 'South']]} />
        </div>
      </div>
      {shown === 'sat' ? <SatelliteMap {...props} onFail={() => setFailed(true)} /> : <SchematicMap {...props} />}
      {failed && <div className="pb note" style={{ borderTop: '1px solid var(--line)' }}>Satellite imagery could not load (offline or blocked), so the schematic map is shown. Switch to Aerial to retry.</div>}
      <div className="legend">
        {[['Critical', 'crit'], ['High', 'high'], ['Medium', 'med'], ['Low', 'low']].map(([n, v]) => <span key={n}><i className="dot" style={{ background: `var(--${v})` }} />{n}</span>)}
        <span><i className="sq" />Depot</span>
        <span>Circle size = people affected · lines = dispatch to the selected district · boundary follows the official Indian depiction</span>
      </div>
    </section>
  )
}
