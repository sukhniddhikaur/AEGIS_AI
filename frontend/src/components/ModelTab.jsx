import React from 'react'

const FI = [['River discharge', 0.33], ['Water level', 0.13], ['Daily rainfall', 0.11], ['Everything else, each', 0.01]]
const pr = (x, y) => [44 + x * 230, 176 - y * 160]

export default function ModelTab() {
  const a = pr(0.116, 0.92), b = pr(0.2555, 0.4471)
  const Row = ({ k, v }) => <tr><td>{k}</td><td className="n">{v}</td></tr>
  return (
    <div className="pb two">
      <div className="sec"><h3>Layer 1: next-day flood forecast</h3>
        <table><tbody>
          <Row k="Data" v="284,910 district-days · 30 districts · 2000–2025" />
          <Row k="Split" v="train 2000–22 · validation 2023–24 · test 2025" />
          <Row k="Model" v="XGBoost, class weight 48.3, isotonic calibration" />
          <Row k="Test ROC-AUC / PR-AUC" v="0.926 / 0.277" />
          <Row k="Test precision / recall" v="25.5% / 44.7% at threshold 0.89" />
          <Row k="Validation precision / recall" v="11.6% / 92.0% at threshold 0.5" />
          <Row k="Mean calibrated probability" v="0.024 (true rate 0.019)" /></tbody></table>
        <h3 style={{ marginTop: 16 }}>What drives the forecast</h3>
        {FI.map(([n, v]) => <div key={n} className="rrow" style={{ gridTemplateColumns: '150px minmax(0,1fr) 44px' }}><span>{n}</span><div className="track"><i style={{ width: `${(v / 0.33) * 100}%` }} /></div><span className="num">{v}</span></div>)}
        <p className="note">Current river conditions matter most, so live gauge data is the biggest upgrade to make.</p></div>
      <div className="sec"><h3>The recall problem</h3>
        <svg viewBox="0 0 300 220" style={{ width: '100%', height: 'auto', maxWidth: 360 }} role="img" aria-label="Precision and recall at two operating points">
          <line x1="44" y1="176" x2="274" y2="176" stroke="var(--grid)" /><line x1="44" y1="16" x2="44" y2="176" stroke="var(--grid)" />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><text x="40" y={176 - t * 160 + 3} fontSize="10" textAnchor="end">{t}</text><text x={44 + t * 230} y="190" fontSize="10" textAnchor="middle">{t}</text></g>)}
          <text x="159" y="208" fontSize="10.5" textAnchor="middle">Precision</text>
          <text x="10" y="96" fontSize="10.5" transform="rotate(-90 10 96)" textAnchor="middle">Recall</text>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--mute)" strokeDasharray="4 4" />
          <circle cx={a[0]} cy={a[1]} r="6" fill="var(--c2)" /><text x={a[0] + 10} y={a[1] + 3} fontSize="10.5" style={{ fill: 'var(--ink)' }}>Validation, 0.5</text>
          <circle cx={b[0]} cy={b[1]} r="6" fill="var(--accent)" /><text x={b[0] + 10} y={b[1] + 3} fontSize="10.5" style={{ fill: 'var(--ink)' }}>Test, 0.89</text></svg>
        <p className="note">Raising the threshold to 0.89 improves precision but misses more than half of flood days. Export the full precision-recall curve from Layer 1 to add a live threshold slider here.</p>
        <h3 style={{ marginTop: 14 }}>Known limits</h3>
        <p className="note">Flooded-area % is estimated, not measured. Depot stock and four state depots are placeholders. Travel time uses straight lines × 1.3 at 35 km/h. Forecast error has not yet been fed into allocation, which the stress test on this page begins to show.</p></div>
    </div>)
}
