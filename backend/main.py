"""AEGIS AI API. Run:  uvicorn main:app --reload --port 8000"""
import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import demo_scenario as demo
from aegis_lp import Config, solve

app = FastAPI(title="AEGIS AI Layer 2 API", version="1.0.0")
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


class District(BaseModel):
    name: str
    state: str = ""
    severity: Literal["Low", "Medium", "High", "Critical"]
    p: float = Field(ge=0, le=1)
    population: float = Field(gt=0)
    pct_flooded: float = Field(ge=0, le=100)
    lat: float
    lon: float


class Depot(BaseModel):
    name: str
    lat: float
    lon: float
    weight: float = Field(1.0, gt=0)


class Resource(BaseModel):
    id: str
    name: str
    rate: float = Field(gt=0)
    pool: float = Field(ge=0)
    crit_min_pct: float = Field(50, ge=0, le=100)
    priority_weight: float = Field(1.0, gt=0)


class Settings(BaseModel):
    pool_scale: float = Field(1.0, gt=0, le=50)
    road_factor: float = 1.3
    speed_kmph: float = 35
    lambda_travel_frac: float = 0.5
    shortfall_mult: float = 10
    noncritical_min_frac: float = 0.5


class SolveRequest(BaseModel):
    districts: list[District] = Field(min_length=1, max_length=200)
    depots: list[Depot] = Field(min_length=1, max_length=100)
    resources: list[Resource] = Field(min_length=1, max_length=20)
    settings: Settings = Settings()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/demo")
def get_demo():
    """The paper's scenario in the shape /api/solve expects."""
    return {"districts": demo.DISTRICTS, "depots": demo.DEPOTS, "resources": demo.RESOURCES}


@app.post("/api/solve")
def post_solve(req: SolveRequest):
    try:
        return solve(
            [d.model_dump() for d in req.districts],
            [d.model_dump() for d in req.depots],
            [r.model_dump() for r in req.resources],
            Config(**req.settings.model_dump()),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
