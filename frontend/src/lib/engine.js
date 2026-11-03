// Browser allocation engine. Mirrors backend/aegis_lp.py so the page works without a server.
// The "optimised" rule here is a fast fair-share + priority fill that matches the LP when all
// resources are weighted equally; the server runs the real HiGHS linear programme.
export const NONCRIT = 0.5, ROAD = 1.3, SPEED = 35
export const SEVW = { Low: 1, Medium: 2, High: 3, Critical: 4 }
export const sum = (a) => a.reduce((s, v) => s + v, 0)

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(6.283185307 * r())

export function hav(a, b, c, d) {
  const p = Math.PI / 180
  const x = Math.sin(((c - a) * p) / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(((d - b) * p) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}

export const prep = (rows, thr) =>
  rows.filter((d) => d.flag && d.p >= thr).map((d) => ({ ...d, aff: (d.pop * d.pct * d.p) / 100, sw: SEVW[d.sev] || 1 }))

export const etaMat = (F, DEP) =>
  DEP.map((d) => F.map((x) => { const km = hav(d.lat, d.lon, x.lat, x.lon) * ROAD; return { km, eta: km / SPEED } }))

export function allocate(F, RES, mode, mult) {
  const K = RES.length
  const poolPe = RES.map((r) => (r.pool * mult) / r.rate)
  const sumAff = sum(F.map((d) => d.aff)) || 1
  const G = F.map((d) => RES.map((r, k) => (d.sev === 'Critical' ? r.crit : NONCRIT) * Math.min(d.aff, (poolPe[k] * d.aff) / sumAff)))
  let A
  if (mode === 'opt') {
    A = G.map((r) => r.slice())
    const ord = F.map((_, i) => i).sort((a, b) => F[b].sw * F[b].p - F[a].sw * F[a].p)
    for (let k = 0; k < K; k++) {
      let rem = poolPe[k] - sum(A.map((r) => r[k]))
      for (const i of ord) { const g = Math.min(F[i].aff - A[i][k], Math.max(rem, 0)); A[i][k] += g; rem -= g }
    }
  } else {
    A = F.map(() => new Array(K).fill(0))
    const ord = F.map((_, i) => i).sort((a, b) => F[b].sw * F[b].p * F[b].aff - F[a].sw * F[a].p * F[a].aff)
    for (let k = 0; k < K; k++) {
      let rem = poolPe[k]
      for (const i of ord) { const g = Math.min(F[i].aff, rem); A[i][k] = g; rem -= g }
    }
  }
  return { A, G, poolPe }
}

export function dispatchPlan(F, al, mode, E, DEP, RES) {
  const K = RES.length, N = F.length, D = DEP.length
  const tw = sum(DEP.map((d) => d.w))
  const st = DEP.map((d) => al.poolPe.map((p) => (p * d.w) / tw))
  const out = []
  const push = (d, i, k, pe) => { if (pe > 1e-6) out.push({ d, i, k, pe, units: pe * RES[k].rate, km: E[d][i].km, eta: E[d][i].eta }) }
  if (mode === 'opt') {
    for (let k = 0; k < K; k++) {
      const need = F.map((_, i) => al.A[i][k]), edges = []
      for (let d = 0; d < D; d++) for (let i = 0; i < N; i++) edges.push([d, i, E[d][i].eta])
      edges.sort((a, b) => a[2] - b[2])
      for (const [d, i] of edges) { const g = Math.min(need[i], st[d][k]); if (g > 1e-9) { need[i] -= g; st[d][k] -= g; push(d, i, k, g) } }
    }
  } else {
    const ord = F.map((_, i) => i).sort((a, b) => F[b].sw * F[b].p * F[b].aff - F[a].sw * F[a].p * F[a].aff)
    for (const i of ord) for (let k = 0; k < K; k++) {
      let need = al.A[i][k]
      const near = DEP.map((_, d) => d).sort((a, b) => E[a][i].eta - E[b][i].eta)
      for (const d of near) { if (need <= 1e-9) break; const g = Math.min(need, st[d][k]); if (g > 0) { need -= g; st[d][k] -= g; push(d, i, k, g) } }
    }
  }
  return out
}

export function metrics(F, al, disp, RES) {
  const K = RES.length, aff = sum(F.map((d) => d.aff)) || 1
  const cov = F.map((d, i) => RES.map((_, k) => Math.min(1, al.A[i][k] / d.aff)))
  const dc = cov.map((r) => sum(r) / K)
  const util = sum(RES.map((_, k) => (sum(al.A.map((a) => a[k])) / al.poolPe[k]) * 100)) / K
  const below = F.map((d, i) => RES.some((_, k) => cov[i][k] < al.G[i][k] / d.aff - 1e-6))
  const wt = sum(disp.map((x) => x.pe)) || 1
  return {
    cov, dc, util,
    popCov: (sum(F.map((d, i) => d.aff * dc[i])) / aff) * 100,
    critBelow: F.filter((d, i) => d.sev === 'Critical' && below[i]).length,
    belowMin: below.filter(Boolean).length,
    zero: dc.filter((v) => v < 0.01).length,
    resp: sum(disp.map((x) => x.pe * x.eta)) / wt,
  }
}

// Re-run the plan with noisy probabilities to see how robust each district's coverage is.
export function stress(base, RES, sigma, mult, n) {
  const res = base.map(() => []), tot = [], rng = mulberry32(7)
  for (let t = 0; t < n; t++) {
    const zc = gauss(rng)
    const F = base.map((d) => {
      const z = 0.6 * zc + 0.8 * gauss(rng)
      const p = Math.min(0.999, Math.max(0.001, d.p * Math.exp(sigma * z - (sigma * sigma) / 2)))
      return { ...d, p, aff: (d.pop * d.pct * p) / 100 }
    })
    const al = allocate(F, RES, 'opt', mult)
    F.forEach((d, i) => res[i].push(sum(al.A[i].map((a) => Math.min(1, a / d.aff))) / RES.length))
    tot.push(sum(F.map((d) => d.aff)))
  }
  const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))] }
  return { d: res.map((a) => ({ p10: q(a, 0.1), p50: q(a, 0.5), p90: q(a, 0.9) })), tot: { p10: q(tot, 0.1), p50: q(tot, 0.5), p90: q(tot, 0.9) } }
}

// Turn a /api/solve response into the same shapes the browser engine produces.
export function fromServer(F, RES, srv, base) {
  const A = srv.optimised.per_district.map((row) => row.map((u, k) => u / RES[k].rate))
  const d = srv.optimised.dispatch.map((r) => ({ d: r.depot, i: r.district, k: r.resource, pe: r.pe, units: r.units, km: r.km, eta: r.eta_h }))
  return { al: { A, G: base.G, poolPe: base.poolPe }, d }
}

export function compute({ rows, RES, DEP, thr, mult, method, sig, server }) {
  const F = prep(rows, thr)
  const E = etaMat(F, DEP)
  let alO = allocate(F, RES, 'opt', mult), dO = dispatchPlan(F, alO, 'opt', E, DEP, RES)
  if (server && F.length) { const s = fromServer(F, RES, server, alO); alO = s.al; dO = s.d }
  const alG = allocate(F, RES, 'greedy', mult), dG = dispatchPlan(F, alG, 'greedy', E, DEP, RES)
  const mO = metrics(F, alO, dO, RES), mG = metrics(F, alG, dG, RES)
  const use = method === 'opt' ? { al: alO, d: dO, m: mO } : { al: alG, d: dG, m: mG }
  const totAff = sum(F.map((d) => d.aff))
  const need = Math.max(...RES.map((r) => (totAff * r.rate) / r.pool), 0)
  const mc = F.length ? stress(F, RES, sig, mult, 300) : { d: [], tot: { p10: 0, p50: 0, p90: 0 } }
  const rank = F.map((_, i) => i).sort((a, b) => F[b].sw * F[b].p - F[a].sw * F[a].p)
  return { F, E, mult, alO, alG, dO, dG, mO, mG, use, need, mc, rank, totAff }
}
