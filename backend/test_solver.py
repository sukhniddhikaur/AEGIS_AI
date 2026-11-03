"""Run:  python -m pytest -q   (or just: python test_solver.py)"""
from aegis_lp import solve, Config
import demo_scenario as demo


def run(scale=1.0):
    return solve(demo.DISTRICTS, demo.DEPOTS, demo.RESOURCES, Config(pool_scale=scale))


def test_paper_scenario_coverage_and_guarantees():
    r = run()
    lp, gr = r["optimised"]["metrics"], r["greedy"]["metrics"]
    assert lp["population_coverage_pct"] == gr["population_coverage_pct"] == 40.3
    assert lp["critical_below_minimum"] == 0 and gr["critical_below_minimum"] == 1
    assert lp["districts_zero_service"] == 0 and gr["districts_zero_service"] == 7
    assert lp["avg_response_h"] < gr["avg_response_h"]


def test_big_pool_covers_everyone():
    r = run(5.0)
    assert r["optimised"]["metrics"]["population_coverage_pct"] == 100.0


if __name__ == "__main__":
    import json
    r = run()
    print(r["lp_status"])
    print(json.dumps({k: r[k]["metrics"] for k in ("optimised", "greedy")}, indent=1))
    for s in (0.5, 1, 2, 5, 10):
        m = run(s)
        print(s, m["optimised"]["metrics"]["population_coverage_pct"], m["optimised"]["metrics"]["avg_response_h"], m["greedy"]["metrics"]["avg_response_h"])
