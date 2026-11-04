import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { INDIA_RINGS } from '../lib/indiaBoundary.js'
import { sum } from '../lib/engine.js'
import { fmt, f2 } from '../lib/format.js'

const BOUNDS = { all: [[5.5, 67.5], [37.8, 98]], ne: [[22, 88], [29.8, 97.5]], south: [[7, 72], [14, 80.5]] }
const SEV = { Critical: '#ff4d5a', High: '#ff9a2e', Medium: '#f5d02b', Low: '#46d28f' }
// Esri World Imagery has no political boundaries drawn on it, so the only border shown is the
// official Indian outline we overlay ourselves.
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ATTR = 'Imagery © Esri, Maxar, Earthstar Geographics and the GIS User Community · Outline: DataMeet'

export default function SatelliteMap({ model, DEP, dispatch, sel, onSelect, view, onFail }) {
  const el = useRef(null), map = useRef(null), group = useRef(null)
  const cb = useRef({ onSelect, onFail }); cb.current = { onSelect, onFail }

  useEffect(() => {
    const m = L.map(el.current, { zoomSnap: 0.25, minZoom: 3, worldCopyJump: false })
    map.current = m
    let loaded = false, errors = 0
    const tl = L.tileLayer(TILES, { maxZoom: 12, attribution: ATTR })
    tl.on('tileload', () => { loaded = true })
    tl.on('tileerror', () => { errors++; if (!loaded && errors >= 4) cb.current.onFail() })
    tl.addTo(m)
    const rings = INDIA_RINGS.map((r) => r.map(([lo, la]) => [la, lo]))
    L.polygon(rings, { color: '#0a1a2a', weight: 4.5, opacity: 0.55, fill: false, interactive: false }).addTo(m)
    L.polygon(rings, { color: '#ffffff', weight: 1.6, opacity: 0.95, fill: false, interactive: false }).addTo(m)
    group.current = L.layerGroup().addTo(m)
    m.fitBounds(BOUNDS.all)
    setTimeout(() => m.invalidateSize(), 50)
    return () => { m.remove(); map.current = null }
  }, [])

  useEffect(() => { map.current && map.current.fitBounds(BOUNDS[view]) }, [view])

  useEffect(() => {
    const g = group.current
    if (!g) return
    g.clearLayers()
    const { F, use } = model
    const cur = F[sel]
    const byDepot = {}
    dispatch.filter((x) => x.i === sel).forEach((x) => { byDepot[x.d] = (byDepot[x.d] || 0) + x.pe })
    const tot = sum(Object.values(byDepot)) || 1
    if (cur) Object.keys(byDepot).forEach((d) => {
      L.polyline([[DEP[d].lat, DEP[d].lon], [cur.lat, cur.lon]], { color: '#7fd6ff', weight: 2 + (byDepot[d] / tot) * 7, opacity: 0.9, dashArray: '7 7', className: 'flow', interactive: false }).addTo(g)
    })
    DEP.forEach((d, i) => {
      const active = !!byDepot[i]
      const icon = L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        html: `<div style="width:12px;height:12px;background:${active ? '#7fd6ff' : '#ffffff'};border:2px solid #0a1a2a;box-shadow:0 0 0 1px #fff8"></div>` })
      L.marker([d.lat, d.lon], { icon, keyboard: false }).bindTooltip(`<b>${d.name}</b><br>${d.type} depot`, { direction: 'top' }).addTo(g)
    })
    F.forEach((d, i) => {
      const r = (5 + Math.sqrt(d.aff) / 30) * 1.2, on = i === sel
      const c = L.circleMarker([d.lat, d.lon], { radius: r, color: on ? '#ffffff' : '#0a1a2a', weight: on ? 3 : 1.5, fillColor: SEV[d.sev] || SEV.Low, fillOpacity: 0.8 })
      c.bindTooltip(`<b>${d.name}</b>, ${d.state}<br>${d.sev} · P ${f2(d.p)}<br>${fmt(d.aff)} affected · ${Math.round(use.m.dc[i] * 100)}% served`, { direction: 'top' })
      c.on('click', () => cb.current.onSelect(i))
      c.addTo(g)
      if (on || d.sev === 'Critical') c.bindTooltip(d.name, { permanent: true, direction: 'right', offset: [r, 0], className: 'sat-label' })
    })
  }, [model, dispatch, sel, DEP])

  return <div ref={el} style={{ height: 'min(78vh, 640px)', width: '100%', background: '#0b131d' }} role="application" aria-label="Aerial map of flagged districts and relief depots" />
}
