"""AEGIS AI Layer 2 solver.

A direct port of the allocation code in notebooks/layer2_resource_allocation.ipynb
(sections 5-9): demand estimation, haversine ETA matrix, weighted-greedy baseline,
and the linear programme solved with SciPy HiGHS. Keeping it in one importable
module means the notebook, the API and the tests all use the same maths.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import lil_matrix

SEVERITY_WEIGHT = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}


@dataclass
class Config:
    road_factor: float = 1.30        # road distance ~ straight-line x 1.3
    speed_kmph: float = 35.0         # average convoy speed
    lambda_travel_frac: float = 0.5  # travel-time penalty strength
    shortfall_mult: float = 10.0     # penalty for missing a minimum guarantee
    noncritical_min_frac: float = 0.5
    pool_scale: float = 1.0


@dataclass
class Problem:
    """Everything the solver needs, as plain numpy arrays."""
    sev: np.ndarray            # (N,) severity weight 1..4
    is_critical: np.ndarray    # (N,) bool
    prob: np.ndarray           # (N,) calibrated flood probability
    affected: np.ndarray       # (N,) estimated people affected
    eta_h: np.ndarray          # (D, N) hours
    dist_km: np.ndarray        # (D, N) km
    stock_share: np.ndarray    # (D,) share of every pool held by each depot
    pool: np.ndarray           # (K,) pool in real units, already scaled
    rate: np.ndarray           # (K,) units needed per affected person
    w_res: np.ndarray          # (K,) resource priority weights
    crit_min: np.ndarray       # (K,) critical-district minimum guarantee, 0..1
    cfg: Config = field(default_factory=Config)

    @property
    def shape(self):
        return self.eta_h.shape[0], self.eta_h.shape[1], self.pool.shape[0]


def haversine(lat1, lon1, lat2, lon2):
    p = np.pi / 180
    a = (np.sin((lat2 - lat1) * p / 2) ** 2
         + np.cos(lat1 * p) * np.cos(lat2 * p) * np.sin((lon2 - lon1) * p / 2) ** 2)
    return 12742 * np.arcsin(np.sqrt(a))


def build_problem(districts, depots, resources, cfg: Config) -> Problem:
    """districts: dicts with severity, p, population, pct_flooded, lat, lon.
    depots: dicts with lat, lon, weight. resources: dicts with rate, pool,
    priority_weight, crit_min_pct."""
    prob = np.array([d["p"] for d in districts], float)
    pop = np.array([d["population"] for d in districts], float)
    pct = np.array([d["pct_flooded"] for d in districts], float)
    affected = pop * pct / 100.0 * prob

    dlat = np.array([d["lat"] for d in depots], float)[:, None]
    dlon = np.array([d["lon"] for d in depots], float)[:, None]
    xlat = np.array([d["lat"] for d in districts], float)[None, :]
    xlon = np.array([d["lon"] for d in districts], float)[None, :]
    dist_km = haversine(dlat, dlon, xlat, xlon) * cfg.road_factor
    w = np.array([d.get("weight", 1.0) for d in depots], float)

    return Problem(
        sev=np.array([SEVERITY_WEIGHT.get(d["severity"], 1) for d in districts], float),
        is_critical=np.array([d["severity"] == "Critical" for d in districts]),
        prob=prob,
        affected=affected,
        eta_h=dist_km / cfg.speed_kmph,
        dist_km=dist_km,
        stock_share=w / w.sum(),
        pool=np.array([r["pool"] for r in resources], float) * cfg.pool_scale,
        rate=np.array([r["rate"] for r in resources], float),
        w_res=np.array([r.get("priority_weight", 1.0) for r in resources], float),
        crit_min=np.array([r["crit_min_pct"] for r in resources], float) / 100.0,
        cfg=cfg,
    )


def stock(pb: Problem) -> np.ndarray:
    return np.outer(pb.stock_share, pb.pool)  # (D, K) real units


def guarantee_matrix(pb: Problem) -> np.ndarray:
    """Guaranteed minimum per district and resource, in people-equivalents."""
    aff = pb.affected
    pool_pe = pb.pool / pb.rate
    fair = np.minimum(aff[:, None], pool_pe[None, :] * aff[:, None] / aff.sum())
    frac = np.where(pb.is_critical[:, None], pb.crit_min[None, :], pb.cfg.noncritical_min_frac)
    return frac * fair


def greedy_allocate(pb: Problem) -> np.ndarray:
    D, N, K = pb.shape
    st = stock(pb)
    dem = pb.affected[:, None] * pb.rate[None, :]
    priority = pb.sev * pb.prob * pb.affected
    alloc = np.zeros((D, N, K))
    for i in np.argsort(-priority):
        for k in range(K):
            need = dem[i, k]
            for d in np.argsort(pb.eta_h[:, i]):
                if need <= 1e-9:
                    break
                give = min(need, st[d, k])
                alloc[d, i, k] += give
                st[d, k] -= give
                need -= give
    return alloc


def lp_allocate(pb: Problem):
    """Maximise value of covering people minus a travel-time penalty.

    Variables x[d,i,k] are in people-equivalents (units / rate) so every resource
    is on a comparable scale. Returns (alloc in real units, HiGHS status message).
    """
    D, N, K = pb.shape
    sev, prob, aff, eta = pb.sev, pb.prob, pb.affected, pb.eta_h
    G = guarantee_matrix(pb)
    min_gain = (pb.w_res.min() * sev * prob).min()
    lam = pb.cfg.lambda_travel_frac * min_gain / eta.max()
    stock_pe = stock(pb) / pb.rate[None, :]

    nx = D * N * K
    short_idx = {}
    for i in range(N):
        for k in range(K):
            if G[i, k] > 1e-9:
                short_idx[(i, k)] = nx + len(short_idx)
    nvar = nx + len(short_idx)
    xi = lambda d, i, k: (d * N + i) * K + k

    c = np.zeros(nvar)
    for d in range(D):
        for i in range(N):
            for k in range(K):
                c[xi(d, i, k)] = -(pb.w_res[k] * sev[i] * prob[i] - lam * eta[d, i])
    for (i, k), j in short_idx.items():
        c[j] = pb.cfg.shortfall_mult * sev[i]

    rows = D * K + N * K + len(short_idx)
    A = lil_matrix((rows, nvar))
    b = np.zeros(rows)
    r = 0
    for d in range(D):                       # depot stock
        for k in range(K):
            for i in range(N):
                A[r, xi(d, i, k)] = 1
            b[r] = stock_pe[d, k]
            r += 1
    for i in range(N):                       # never exceed demand
        for k in range(K):
            for d in range(D):
                A[r, xi(d, i, k)] = 1
            b[r] = aff[i]
            r += 1
    for (i, k), j in short_idx.items():      # soft minimum guarantee
        for d in range(D):
            A[r, xi(d, i, k)] = -1
        A[r, j] = -1
        b[r] = -G[i, k]
        r += 1

    res = linprog(c, A_ub=A.tocsr(), b_ub=b, bounds=(0, None), method="highs")
    if res.x is None:
        raise RuntimeError(f"LP failed: {res.message}")
    y = res.x[:nx].reshape(D, N, K)
    return y * pb.rate[None, None, :], res.message


def evaluate(pb: Problem, alloc: np.ndarray) -> dict:
    D, N, K = pb.shape
    dem = pb.affected[:, None] * pb.rate[None, :]
    given = alloc.sum(axis=0)
    cov = np.divide(given, dem, out=np.zeros_like(given), where=dem > 0).clip(0, 1)
    dist_cov = (cov * pb.w_res).sum(axis=1) / pb.w_res.sum()
    pop_cov = (pb.affected * dist_cov).sum() / pb.affected.sum() * 100
    util = given.sum(axis=0) / pb.pool * 100
    g_frac = guarantee_matrix(pb) / pb.affected[:, None]
    min_ok = cov >= g_frac - 1e-6
    weights = alloc / pb.rate[None, None, :]
    resp = (weights * pb.eta_h[:, :, None]).sum() / max(weights.sum(), 1e-9)
    return {
        "population_coverage_pct": round(float(pop_cov), 1),
        "avg_utilisation_pct": round(float(util.mean()), 1),
        "critical_below_minimum": int((pb.is_critical & ~min_ok.all(axis=1)).sum()),
        "flooded_below_minimum": int((~min_ok.all(axis=1)).sum()),
        "districts_zero_service": int((dist_cov < 0.01).sum()),
        "avg_response_h": round(float(resp), 1),
    }


def dispatch_rows(pb: Problem, alloc: np.ndarray, min_units: float = 0.5):
    D, N, K = pb.shape
    rows = []
    for d in range(D):
        for i in range(N):
            for k in range(K):
                u = alloc[d, i, k]
                if u > min_units:
                    rows.append({
                        "depot": d, "district": i, "resource": k,
                        "units": round(float(u), 2),
                        "pe": float(u / pb.rate[k]),
                        "km": round(float(pb.dist_km[d, i]), 1),
                        "eta_h": round(float(pb.eta_h[d, i]), 2),
                    })
    return rows


def solve(districts, depots, resources, cfg: Config | None = None) -> dict:
    cfg = cfg or Config()
    pb = build_problem(districts, depots, resources, cfg)
    lp, status = lp_allocate(pb)
    gr = greedy_allocate(pb)
    return {
        "lp_status": status,
        "optimised": {
            "per_district": lp.sum(axis=0).tolist(),   # (N, K) real units
            "dispatch": dispatch_rows(pb, lp),
            "metrics": evaluate(pb, lp),
        },
        "greedy": {
            "per_district": gr.sum(axis=0).tolist(),
            "dispatch": dispatch_rows(pb, gr),
            "metrics": evaluate(pb, gr),
        },
    }
