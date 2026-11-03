import { GEO, RES0 } from './data.js'

export function parseCSV(t) {
  const rows = []; let r = [], c = '', q = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++ } else q = false } else c += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { r.push(c); c = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; if (r.length > 1 || r[0] !== '') rows.push(r); r = [] }
    else c += ch
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r) }
  const h = (rows.shift() || []).map((s) => s.trim())
  return rows.map((a) => Object.fromEntries(h.map((k, i) => [k, (a[i] || '').trim()])))
}

const keyOf = (s, d) => String(s).trim().toLowerCase() + '|' + String(d).trim().toLowerCase()

// Sort uploaded CSVs by their columns into the sources the app understands.
export async function readFiles(files) {
  const out = {}
  for (const f of files) {
    const r = parseCSV(await f.text())
    if (!r.length) continue
    const c = Object.keys(r[0]), has = (x) => c.includes(x)
    if (has('Flood_Probability')) out.l1 = r
    else if (has('Resource_ID') && has('Total_Pool'))
      out.res = RES0.map((b) => { const x = r.find((y) => y.Resource_ID === b.id)
        return x ? { ...b, name: x.Resource_Name || b.name, pool: +x.Total_Pool || b.pool, crit: (+x.Min_Guarantee_Critical_Pct || b.crit * 100) / 100, w: +x.Priority_Weight || 1 } : { ...b } })
    else if (has('Depot_ID') && has('Latitude'))
      out.dep = r.map((x) => ({ id: x.Depot_ID, name: x.Depot_Name, lat: +x.Latitude, lon: +x.Longitude, w: /ndrf/i.test(x.Depot_Type) ? 2 : 1, type: x.Depot_Type }))
    else if (has('Latitude') && has('District')) {
      out.geo = out.geo || {}
      r.forEach((x) => { out.geo[keyOf(x.State || '', x.District)] = [+x.Latitude, +x.Longitude]; out.geo[keyOf('', x.District)] = [+x.Latitude, +x.Longitude] })
    } else if (has('Depot') && has('ETA_h') && has('Resource')) out.nb = r
  }
  return out
}

export const datesOf = (l1) => [...new Set(l1.map((x) => (x.Date_Time || '').slice(0, 10)).filter(Boolean))].sort()

export function rowsFromLayer1(l1, date, geoUp) {
  const rows = date ? l1.filter((r) => (r.Date_Time || '').slice(0, 10) === date) : l1
  const miss = []
  const out = rows.map((r) => {
    const st = (r.State || '').trim(), nm = (r.District || '').trim()
    const g = (geoUp && (geoUp[keyOf(st, nm)] || geoUp[keyOf('', nm)])) || GEO[keyOf(st, nm)]
    if (!g) { miss.push(nm); return null }
    const p = +r.Flood_Probability
    return { name: nm, state: st, sev: r.Severity || 'Medium', p, pop: +r.Population || 0, pct: +r.Percent_Flooded_Area || 15, lat: g[0], lon: g[1],
      flag: 'Flood_Occurred' in r && r.Flood_Occurred !== '' ? (+r.Flood_Occurred === 1 ? 1 : 0) : p >= 0.5 ? 1 : 0 }
  }).filter(Boolean)
  return { rows: out, total: rows.length, msg: `Layer 1 loaded: ${out.length} districts.` + (miss.length ? ` No coordinates for ${miss.join(', ')}. Add districts_geo.csv.` : '') }
}
