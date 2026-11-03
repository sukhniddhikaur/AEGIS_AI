import React, { useState } from 'react'

export default function DataTab({ src, msg, onFiles, onReset }) {
  const [over, setOver] = useState(false)
  const Chip = ({ k, t }) => <span className={src[k] ? 'ok' : ''}>{src[k] ? '✓ ' : ''}{t}</span>
  return (
    <div className="pb">
      <div className={`drop ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]) }}>
        <b>Drop your notebook CSVs here</b>
        <div className="note" style={{ margin: '6px 0 10px' }}>layer1_output.csv, resources.csv, depots.csv, districts_geo.csv, layer2_dispatch_plan.csv. Several at once is fine. Files stay in your browser.</div>
        <input type="file" accept=".csv" multiple aria-label="Choose CSV files" onChange={(e) => onFiles([...e.target.files])} />
      </div>
      <div className="src"><Chip k="layer1" t="Layer 1 output" /><Chip k="resources" t="Resources" /><Chip k="depots" t="Depots" /><Chip k="geo" t="District coordinates" /><Chip k="nb" t="Notebook dispatch" /></div>
      <div className="note" style={{ marginTop: 10 }}>{msg || 'Showing the paper scenario (30 May 2025). A Layer 1 file with several dates adds a date picker. Districts missing coordinates are listed here.'}</div>
      <p><button className="btn" type="button" onClick={onReset}>Reset to paper scenario</button></p>
    </div>)
}
