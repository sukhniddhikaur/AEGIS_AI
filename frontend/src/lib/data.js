// The paper's 30 May 2025 scenario (Table 5). Flooded-area % is not measured in the dataset,
// so it is backed out of the paper's affected estimate: pct = affected / (population x probability).
const ROWS = [
  ['Silchar', 'Assam', 'Critical', 0.762, 229136, 34567, 24.8337, 92.7789],
  ['Guwahati', 'Assam', 'High', 0.633, 1116257, 108160, 26.1445, 91.7362],
  ['Dhemaji', 'Assam', 'High', 0.419, 686133, 39136, 27.48, 94.58],
  ['Barpeta', 'Assam', 'Medium', 0.419, 1693622, 120042, 26.32, 91.0],
  ['Ernakulam', 'Kerala', 'Medium', 0.419, 3282388, 249171, 9.98, 76.28],
  ['Lakhimpur', 'Assam', 'Medium', 0.343, 1042137, 30777, 27.24, 94.1],
  ['Alappuzha', 'Kerala', 'Medium', 0.292, 2127652, 120610, 9.49, 76.34],
  ['Wayanad', 'Kerala', 'Medium', 0.292, 817420, 19108, 11.69, 76.08],
  ['Idukki', 'Kerala', 'Low', 0.175, 1108974, 22162, 9.85, 76.97],
]
export const DEMO = ROWS.map(([name, state, sev, p, pop, aff, lat, lon]) => ({
  name, state, sev, p, pop, pct: (aff / (pop * p)) * 100, lat, lon, flag: 1,
}))

const RES_DEF = [
  ['RES01', 'Rescue teams', 'teams', 1 / 25000, 0.5],
  ['RES02', 'Rescue boats', 'boats', 1 / 5000, 0.5],
  ['RES03', 'Medical kits', 'kits', 1 / 50, 0.6],
  ['RES04', 'Food packets', 'packets', 3, 0.7],
  ['RES05', 'Drinking water', 'litres', 45, 0.7],
  ['RES06', 'Shelter slots', 'slots', 0.3, 0.6],
]
// Pool sized for about 300,000 affected people, as in the paper.
export const RES0 = RES_DEF.map(([id, name, unit, rate, crit]) => ({
  id, name, unit, rate, crit, w: 1, pool: 300000 * rate,
}))

export const DEP0 = [
  { id: 'D01', name: 'NDRF Guwahati', lat: 26.15, lon: 91.67, w: 2, type: 'NDRF' },
  { id: 'D02', name: 'NDRF Bihta', lat: 25.56, lon: 84.87, w: 2, type: 'NDRF' },
  { id: 'D03', name: 'NDRF Pune', lat: 18.52, lon: 73.86, w: 2, type: 'NDRF' },
  { id: 'D04', name: 'NDRF Arakkonam', lat: 13.08, lon: 79.67, w: 2, type: 'NDRF' },
  { id: 'D05', name: 'NDRF Haringhata', lat: 22.96, lon: 88.53, w: 2, type: 'NDRF' },
  { id: 'D06', name: 'NDRF Varanasi', lat: 25.32, lon: 82.97, w: 2, type: 'NDRF' },
  { id: 'D07', name: 'State depot Assam (placeholder)', lat: 26.14, lon: 91.79, w: 1, type: 'State' },
  { id: 'D08', name: 'State depot Kerala (placeholder)', lat: 8.52, lon: 76.94, w: 1, type: 'State' },
  { id: 'D09', name: 'State depot Odisha (placeholder)', lat: 20.3, lon: 85.82, w: 1, type: 'State' },
  { id: 'D10', name: 'State depot Bihar (placeholder)', lat: 25.6, lon: 85.14, w: 1, type: 'State' },
]

// District centres used when a Layer 1 CSV is loaded. Upload districts_geo.csv for the rest.
export const GEO = {
  'assam|guwahati': [26.1445, 91.7362], 'assam|silchar': [24.8333, 92.7789], 'assam|dhemaji': [27.48, 94.58],
  'assam|barpeta': [26.32, 91.0], 'assam|lakhimpur': [27.24, 94.1],
  'kerala|ernakulam': [9.98, 76.28], 'kerala|alappuzha': [9.49, 76.34], 'kerala|wayanad': [11.69, 76.08], 'kerala|idukki': [9.85, 76.97],
  'odisha|balasore': [21.4934, 86.9335], 'odisha|cuttack': [20.4625, 85.8828], 'odisha|kendrapara': [20.5013, 86.4222], 'odisha|puri': [19.8135, 85.8312],
  'tamil nadu|chennai': [13.0827, 80.2707], 'uttar pradesh|gorakhpur': [26.7606, 83.3732],
  'uttar pradesh|lakhimpur kheri': [27.9467, 80.7788], 'uttar pradesh|varanasi': [25.3176, 82.9739],
  'west bengal|malda': [25.0108, 88.1411], 'west bengal|murshidabad': [24.175, 88.28], 'west bengal|north 24 parganas': [22.6168, 88.4029],
  'jammu and kashmir|srinagar': [34.0837, 74.7973], 'gujarat|surat': [21.1702, 72.8311],
}


export const POOLS = [0.5, 0.75, 1, 1.5, 2, 3, 5, 10]
export const VIEWS = { all: [0, 0, 580, 640], ne: [380, 150, 190, 210], south: [60, 420, 190, 210] }
// lon/lat to map units (equirectangular, 20 units per degree of latitude)
export const project = (lon, lat) => [(lon - 67) * 18.7, (38 - lat) * 20]
