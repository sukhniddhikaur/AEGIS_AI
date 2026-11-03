"""The paper's 30 May 2025 scenario (Table 5) plus placeholder depots and planning-level pools."""

# name, state, severity, probability, population, estimated affected, lat, lon
_ROWS = [
    ("Silchar", "Assam", "Critical", 0.762, 229136, 34567, 24.8337, 92.7789),
    ("Guwahati", "Assam", "High", 0.633, 1116257, 108160, 26.1445, 91.7362),
    ("Dhemaji", "Assam", "High", 0.419, 686133, 39136, 27.48, 94.58),
    ("Barpeta", "Assam", "Medium", 0.419, 1693622, 120042, 26.32, 91.0),
    ("Ernakulam", "Kerala", "Medium", 0.419, 3282388, 249171, 9.98, 76.28),
    ("Lakhimpur", "Assam", "Medium", 0.343, 1042137, 30777, 27.24, 94.10),
    ("Alappuzha", "Kerala", "Medium", 0.292, 2127652, 120610, 9.49, 76.34),
    ("Wayanad", "Kerala", "Medium", 0.292, 817420, 19108, 11.69, 76.08),
    ("Idukki", "Kerala", "Low", 0.175, 1108974, 22162, 9.85, 76.97),
]

DISTRICTS = [
    {"name": n, "state": s, "severity": sev, "p": p, "population": pop,
     # Flooded-area % is not measured; it is backed out of the paper's estimate.
     "pct_flooded": aff / (pop * p) * 100, "lat": lat, "lon": lon}
    for n, s, sev, p, pop, aff, lat, lon in _ROWS
]

DEPOTS = [
    {"name": "NDRF Guwahati", "lat": 26.15, "lon": 91.67, "weight": 2, "type": "NDRF"},
    {"name": "NDRF Bihta", "lat": 25.56, "lon": 84.87, "weight": 2, "type": "NDRF"},
    {"name": "NDRF Pune", "lat": 18.52, "lon": 73.86, "weight": 2, "type": "NDRF"},
    {"name": "NDRF Arakkonam", "lat": 13.08, "lon": 79.67, "weight": 2, "type": "NDRF"},
    {"name": "NDRF Haringhata", "lat": 22.96, "lon": 88.53, "weight": 2, "type": "NDRF"},
    {"name": "NDRF Varanasi", "lat": 25.32, "lon": 82.97, "weight": 2, "type": "NDRF"},
    {"name": "State depot Assam (placeholder)", "lat": 26.14, "lon": 91.79, "weight": 1, "type": "State"},
    {"name": "State depot Kerala (placeholder)", "lat": 8.52, "lon": 76.94, "weight": 1, "type": "State"},
    {"name": "State depot Odisha (placeholder)", "lat": 20.30, "lon": 85.82, "weight": 1, "type": "State"},
    {"name": "State depot Bihar (placeholder)", "lat": 25.60, "lon": 85.14, "weight": 1, "type": "State"},
]

# Pool sized for about 300,000 affected people, as in the paper.
_BASE_PEOPLE = 300_000
_RES = [
    ("RES01", "Rescue teams", "teams", 1 / 25000, 50),
    ("RES02", "Rescue boats", "boats", 1 / 5000, 50),
    ("RES03", "Medical kits", "kits", 1 / 50, 60),
    ("RES04", "Food packets", "packets", 3, 70),
    ("RES05", "Drinking water", "litres", 45, 70),
    ("RES06", "Shelter slots", "slots", 0.3, 60),
]
RESOURCES = [
    {"id": i, "name": n, "unit": u, "rate": r, "pool": _BASE_PEOPLE * r,
     "crit_min_pct": c, "priority_weight": 1.0}
    for i, n, u, r, c in _RES
]
