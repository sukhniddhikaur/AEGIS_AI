import React, { useEffect, useMemo, useState } from 'react'
import { DEMO, RES0, DEP0, POOLS } from './lib/data.js'
import { compute, prep } from './lib/engine.js'
import { readFiles, rowsFromLayer1, datesOf } from './lib/csv.js'
import { health, solveOnServer } from './lib/api.js'
import { fmt, f1 } from './lib/format.js'
import Sidebar from './components/Sidebar.jsx'
import MapView from './components/MapView.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import AllocTable from './components/AllocTable.jsx'
import DispatchTable from './components/DispatchTable.jsx'
import Compare from './components/Compare.jsx'
import ModelTab from './components/ModelTab.jsx'
import DataTab from './components/DataTab.jsx'

const TABS = [['alloc', 'Allocation plan'], ['disp', 'Dispatch'], ['cmp', 'Optimised vs greedy'], ['model', 'Forecast model'], ['data', 'Data']]

export default function App() {
  const [s, setS] = useState({ pool: 2, thr: 0.1, sig: 0.2, method: 'opt', solver: 'browser' })
  const set = (p) => setS((o) => ({ ...o, ...p }))
  const [src, setSrc] = useState({ rows: DEMO, total: 30, RES: RES0, DEP: DEP0, l1: null, geo: null, nb: null, dates: [], date: null, msg: '', has: {} })
  const [view, setView] = useState('all')
  const [tab, setTab] = useState('alloc')
  const [sel, setSel] = useState(0)
  const [dsrc, setDsrc] = useState('calc')
  const [server, setServer] = useState(null)
  const [api, setApi] = useState('off')

  const mult = POOLS[s.pool]
  const F = useMemo(() => prep(src.rows, s.thr), [src.rows, s.thr])
  const key = useMemo(() => JSON.stringify([mult, F.map((d) => [d.name, d.p, d.aff]), src.RES.map((r) => r.pool), src.DEP.length]), [mult, F, src.RES, src.DEP])

  // Ask the FastAPI backend for the exact LP whenever inputs change and Server LP is selected.
  useEffect(() => {
    if (s.solver !== 'server' || !F.length) { setApi('off'); return }
    let live = true
    setApi('loading')
    const t = setTimeout(async () => {
      try { await health(); const res = await solveOnServer(F, src.DEP, src.RES, mult); if (live) { setServer({ key, res }); setApi('ok') } }
      catch { if (live) { setServer(null); setApi('err') } }
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [s.solver, key])

  const model = useMemo(() => compute({ rows: src.rows, RES: src.RES, DEP: src.DEP, thr: s.thr, mult, method: s.method, sig: s.sig, server: s.solver === 'server' && server && server.key === key ? server.res : null }),
    [src, s, mult, server, key])

  useEffect(() => { if (sel >= model.F.length) setSel(model.rank[0] || 0) }, [model])
  useEffect(() => { setSel(model.rank[0] || 0) }, [src.rows])

  const dispatch = useMemo(() => {
    if (dsrc === 'nb' && src.nb) return src.nb.map((r) => {
      const d = src.DEP.findIndex((x) => x.name === r.Depot), i = model.F.findIndex((x) => x.name === r.District), k = src.RES.findIndex((x) => x.name === r.Resource)
      return d < 0 || i < 0 || k < 0 ? null : { d, i, k, units: +r.Units, pe: +r.Units / src.RES[k].rate, km: +r.Distance_km, eta: +r.ETA_h }
    }).filter(Boolean)
    return model.use.d
  }, [dsrc, src, model])

  const toggleTheme = () => {
    const r = document.documentElement
    const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches
    r.dataset.theme = dark ? 'light' : 'dark'
  }

  const onFiles = async (files) => {
    const got = await readFiles(files)
    setSrc((o) => {
      const n = { ...o, has: { ...o.has } }
      if (got.res) { n.RES = got.res; n.has.resources = 1 }
      if (got.dep) { n.DEP = got.dep; n.has.depots = 1 }
      if (got.geo) { n.geo = { ...(o.geo || {}), ...got.geo }; n.has.geo = 1 }
      if (got.nb) { n.nb = got.nb; n.has.nb = 1 }
      if (got.l1) { n.l1 = got.l1; n.has.layer1 = 1; n.dates = datesOf(got.l1); n.date = n.dates.length ? n.dates[n.dates.length - 1] : null }
      if (n.l1) Object.assign(n, rowsFromLayer1(n.l1, n.date, n.geo))
      return n
    })
    if (got.nb) setDsrc('nb')
  }
  const onDate = (d) => setSrc((o) => ({ ...o, date: d, ...rowsFromLayer1(o.l1, d, o.geo) }))
  const reset = () => { setSrc({ rows: DEMO, total: 30, RES: RES0, DEP: DEP0, l1: null, geo: null, nb: null, dates: [], date: null, msg: '', has: {} }); setDsrc('calc') }

  const { use, mO, mG, totAff, need, mc } = model
  const m = use.m, crit = model.F.filter((d) => d.sev === 'Critical').length
  const faster = mG.resp > 0 ? (1 - mO.resp / mG.resp) * 100 : 0
  const Kpi = ({ a, b, c, cls }) => <div className="kpi"><small>{a}</small><strong className={cls}>{b}</strong><em>{c}</em></div>

  return (
    <div className="app">
      <Sidebar s={s} set={set} api={api} dates={src.dates} date={src.date} onDate={onDate} onTheme={toggleTheme} onData={() => { setTab('data'); document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth' }) }} />
      <main className="content">
        <div className="bar">
          <div className="alert" role="status">
            {model.F.length ? <><b>{model.F.length} of {src.total} districts need relief</b>
              <span>{fmt(totAff)} people estimated affected · {crit} Critical · pool covers {f1(Math.min(100, 100 / need))}% of demand{need > 1 ? ` · full cover needs about ${f1(need)}× the pool` : ''}</span></>
              : <><b>No district meets the probability threshold</b><span>Lower the minimum flood probability.</span></>}
          </div>
        </div>
        <div className="kpis">
          <Kpi a="Districts flagged" b={`${model.F.length} / ${src.total}`} c={src.date || 'forecast for next day'} />
          <Kpi a="People affected" b={fmt(totAff)} c={`p10–p90: ${fmt(mc.tot.p10)} – ${fmt(mc.tot.p90)}`} />
          <Kpi a="Population covered" b={f1(m.popCov) + '%'} c={m.util >= 99.5 ? 'pool fully used' : f1(m.util) + '% of pool used'} />
          <Kpi a="Avg response" b={f1(m.resp) + ' h'} cls={s.method === 'opt' && faster > 0 ? 'good' : ''} c={s.method === 'opt' ? `greedy ${f1(mG.resp)} h · ${f1(faster)}% faster` : `optimised ${f1(mO.resp)} h`} />
          <Kpi a="Districts with no service" b={m.zero} cls={m.zero ? 'bad' : 'good'} c={`Critical below minimum: ${m.critBelow}`} />
        </div>

        <div className="row2">
          <MapView model={model} DEP={src.DEP} dispatch={dispatch} sel={sel} onSelect={setSel} view={view} onView={setView} />
          <DetailPanel model={model} RES={src.RES} DEP={src.DEP} dispatch={dispatch} sel={sel} sigma={s.sig} method={s.method} />
        </div>

        <section className="panel">
          <div className="tabs" role="tablist" id="tabs">
            {TABS.map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t}</button>)}
          </div>
          {tab === 'alloc' && <AllocTable model={model} RES={src.RES} sel={sel} onSelect={setSel} />}
          {tab === 'disp' && <DispatchTable model={model} RES={src.RES} DEP={src.DEP} dispatch={dispatch} hasNb={!!src.nb} dsrc={dsrc} onDsrc={setDsrc} onSelect={setSel} />}
          {tab === 'cmp' && <Compare model={model} RES={src.RES} DEP={src.DEP} poolIdx={s.pool} solver={s.solver} />}
          {tab === 'model' && <ModelTab />}
          {tab === 'data' && <DataTab src={src.has} msg={src.msg} onFiles={onFiles} onReset={reset} />}
        </section>
        <p className="foot">Flooded-area %, depot stock, depot locations and demand rates are planning assumptions. On the 2025 test year the forecast catches 44.7% of flood days at 25.5% precision (ROC-AUC 0.926). Use this for decision support, not as an operational warning.</p>
      </main>
    </div>
  )
}
