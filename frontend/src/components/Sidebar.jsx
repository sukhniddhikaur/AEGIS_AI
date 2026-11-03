import React from 'react'
import { POOLS } from '../lib/data.js'
import { f2 } from '../lib/format.js'

export default function Sidebar({ s, set, api, dates, date, onDate, onTheme, onData }) {
  const statusText = { off: 'Not connected', loading: 'Solving…', ok: 'Solved by FastAPI + HiGHS', err: 'Server unreachable, using browser engine' }[api] || ''
  return (
    <aside className="side">
      <div className="brand"><b>AEGIS<i> AI</i></b><p>Flood forecast to relief dispatch</p></div>

      <div className="group">
        <h4>Scenario</h4>
        <div className="ctl">
          <div className="l"><span>Forecast date</span></div>
          <select aria-label="Forecast date" style={{ width: '100%' }} disabled={dates.length < 2} value={date || ''} onChange={(e) => onDate(e.target.value)}>
            {dates.length > 1 ? dates.slice().reverse().map((d) => <option key={d}>{d}</option>) : <option>{date || '30 May 2025 (paper)'}</option>}
          </select>
        </div>
        <div className="ctl">
          <div className="l"><span>Relief pool size</span><b>{POOLS[s.pool]}×</b></div>
          <input type="range" min="0" max={POOLS.length - 1} step="1" value={s.pool} onChange={(e) => set({ pool: +e.target.value })} aria-label="Relief pool multiplier" />
          <small>Multiplies every resource pool. 1× is the paper's base pool.</small>
        </div>
        <div className="ctl">
          <div className="l"><span>Minimum flood probability</span><b>{f2(s.thr)}</b></div>
          <input type="range" min="0" max="0.8" step="0.01" value={s.thr} onChange={(e) => set({ thr: +e.target.value })} aria-label="Minimum flood probability" />
          <small>Districts below this are dropped from dispatch.</small>
        </div>
        <div className="ctl">
          <div className="l"><span>Forecast error (stress test)</span><b>±{Math.round(s.sig * 100)}%</b></div>
          <input type="range" min="0" max="0.6" step="0.05" value={s.sig} onChange={(e) => set({ sig: +e.target.value })} aria-label="Forecast error spread" />
          <small>Re-runs the plan 300 times with noisy probabilities.</small>
        </div>
      </div>

      <div className="group">
        <h4>Method</h4>
        <div className="ctl">
          <div className="seg" role="group" aria-label="Allocation method">
            <button type="button" aria-pressed={s.method === 'opt'} onClick={() => set({ method: 'opt' })}>Optimised</button>
            <button type="button" aria-pressed={s.method === 'greedy'} onClick={() => set({ method: 'greedy' })}>Greedy</button>
          </div>
          <small>{s.method === 'opt' ? 'Guarantees first, then highest severity × probability per unit, nearest depot first.' : 'Serves the highest-priority district fully before the next. Baseline from the paper.'}</small>
        </div>
        <div className="ctl">
          <div className="l"><span>Solver</span></div>
          <div className="seg" role="group" aria-label="Solver">
            <button type="button" aria-pressed={s.solver === 'browser'} onClick={() => set({ solver: 'browser' })}>Browser</button>
            <button type="button" aria-pressed={s.solver === 'server'} onClick={() => set({ solver: 'server' })}>Server LP</button>
          </div>
          <small className={`status ${api}`} style={{ marginTop: 6 }}><i />{s.solver === 'server' ? statusText : 'Fast approximation of the LP, runs offline'}</small>
        </div>
      </div>

      <div className="group" style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={onData}>Load your CSVs</button>
        <button className="btn" type="button" onClick={onTheme} aria-label="Toggle light or dark theme">Theme</button>
      </div>
    </aside>
  )
}
