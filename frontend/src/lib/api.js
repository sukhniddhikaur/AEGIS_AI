const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function health() {
  const r = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(4000) })
  if (!r.ok) throw new Error('unhealthy')
  return true
}

export async function solveOnServer(F, DEP, RES, mult) {
  const body = {
    districts: F.map((d) => ({ name: d.name, state: d.state, severity: d.sev, p: d.p, population: d.pop, pct_flooded: d.pct, lat: d.lat, lon: d.lon })),
    depots: DEP.map((d) => ({ name: d.name, lat: d.lat, lon: d.lon, weight: d.w })),
    resources: RES.map((r) => ({ id: r.id, name: r.name, rate: r.rate, pool: r.pool, crit_min_pct: r.crit * 100, priority_weight: r.w || 1 })),
    settings: { pool_scale: mult },
  }
  const r = await fetch(BASE + '/api/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error((await r.text()).slice(0, 200))
  return r.json()
}
