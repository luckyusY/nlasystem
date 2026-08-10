"""Vercel FastAPI entrypoint for the NLA GeoAI prototype.

The prototype uses deterministic synthetic data by default. Production connectors
must be enabled explicitly and remain behind the approved tool registry.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="NLA GeoAI Prototype API",
    description="Synthetic, non-production decision-support services.",
    version="0.1.0",
)

allowed_origin = os.getenv("APP_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


ROLES = {
    "System Administrator",
    "Registrar",
    "GIS Officer",
    "Surveyor",
    "Land Use Officer",
    "NSDI Officer",
    "CORS Engineer",
    "Management",
    "Read-only Analyst",
}

ALLOWED_GIS_OPERATIONS = {
    "find_parcels_by_district",
    "find_parcels_by_land_use",
    "find_parcels_within_distance",
    "find_intersecting_parcels",
    "calculate_parcel_area",
    "find_nearest_feature",
    "get_parcel_details",
}

DISTRICTS = ["Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Huye", "Bugesera"]
LAND_USES = ["Residential", "Agriculture", "Commercial", "Mixed Use", "Conservation"]


def sample_parcels() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for index in range(128):
        district = DISTRICTS[index % len(DISTRICTS)]
        records.append(
            {
                "upi": f"{index % 5 + 1}/{index % 12 + 1:02d}/{index % 8 + 1:02d}/{index % 6 + 1:02d}/{index + 1:04d}",
                "district": district,
                "sector": ["Remera", "Niboye", "Kigali", "Muhoza", "Ngoma", "Nyamata"][index % 6],
                "area_m2": 850 + ((index * 347) % 8100),
                "land_use": LAND_USES[(index * 3 + index // 7) % len(LAND_USES)],
                "zoning": ["R1", "R2", "R3", "C1", "AG", "OS"][index % 6],
                "status": "Registered" if index % 5 < 3 else "Under review",
                "is_synthetic": True,
            }
        )
    records[0].update(
        {
            "upi": "1/02/03/04/0012",
            "district": "Gasabo",
            "sector": "Remera",
            "area_m2": 3250,
            "land_use": "Residential",
            "zoning": "R2",
            "status": "Registered",
        }
    )
    return records


PARCELS = sample_parcels()

NSDI_DATASETS = [
    {"name": "Administrative Boundaries", "organization": "NLA / NISR", "theme": "Boundaries", "coverage": "National", "format": "GeoPackage", "access": "Internal"},
    {"name": "National Road Network", "organization": "RTDA", "theme": "Transport", "coverage": "National", "format": "GeoJSON", "access": "Internal"},
    {"name": "Land Use / Land Cover", "organization": "NLA", "theme": "Land Use", "coverage": "National", "format": "GeoTIFF", "access": "Restricted"},
    {"name": "National Wetlands", "organization": "REMA", "theme": "Environment", "coverage": "National", "format": "GeoPackage", "access": "Internal"},
]

AUDIT_EVENTS: list[dict[str, Any]] = []


def audit(request: Request, action: str, module: str, data: str, success: bool = True) -> None:
    forwarded = request.headers.get("x-forwarded-for", "unavailable").split(",")[0]
    AUDIT_EVENTS.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user": "prototype-user",
            "action": action,
            "module": module,
            "data_requested": data[:180],
            "ip_hash": sha256(forwarded.encode()).hexdigest()[:12],
            "success": success,
        }
    )


def require_prototype_session(authorization: str | None) -> None:
    if os.getenv("AUTH_REQUIRED", "false").lower() == "true":
        if not authorization or not authorization.startswith("Bearer proto_"):
            raise HTTPException(status_code=401, detail="A valid session is required")


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class QueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    role: str = "GIS Officer"


class AnalysisRequest(BaseModel):
    operation: Literal[
        "find_parcels_by_district",
        "find_parcels_by_land_use",
        "find_parcels_within_distance",
        "find_intersecting_parcels",
        "calculate_parcel_area",
        "find_nearest_feature",
        "get_parcel_details",
    ]
    filters: dict[str, str | float | int] = Field(default_factory=dict)


@app.get("/api")
def root() -> dict[str, str]:
    return {"service": "NLA GeoAI Prototype API", "mode": "synthetic", "status": "healthy"}


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "healthy",
        "mode": "mock" if not os.getenv("AI_API_KEY") else "configured",
        "services": {
            "api": "healthy",
            "postgis": "prototype-ready",
            "pgvector": "prototype-ready",
            "lais_connector": "mock",
            "nsdi_catalogue": "healthy",
        },
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, Any]:
    # The published prototype accepts documented demo credentials only.
    if payload.username != "gis.officer@nla.demo" or payload.password != "Prototype2026!":
        audit(request, "LOGIN", "Authentication", payload.username, False)
        raise HTTPException(status_code=401, detail="Invalid prototype credentials")
    audit(request, "LOGIN", "Authentication", payload.username)
    expires = datetime.now(timezone.utc) + timedelta(hours=8)
    return {
        "access_token": f"proto_{sha256(f'{payload.username}:{time.time()}'.encode()).hexdigest()}",
        "token_type": "bearer",
        "expires_at": expires.isoformat(),
        "user": {"name": "Aline Uwase", "department": "GIS Department", "role": "GIS Officer"},
    }


@app.get("/api/lais/parcels")
def list_parcels(
    request: Request,
    district: str | None = None,
    land_use: str | None = None,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_prototype_session(authorization)
    result = [p for p in PARCELS if (not district or p["district"].lower() == district.lower()) and (not land_use or p["land_use"].lower() == land_use.lower())]
    audit(request, "SEARCH_PARCEL", "LAIS Mock", f"district={district};land_use={land_use}")
    return {"items": result, "count": len(result), "synthetic": True}


@app.get("/api/lais/parcels/{upi:path}")
def get_parcel(upi: str, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_prototype_session(authorization)
    parcel = next((item for item in PARCELS if item["upi"] == upi), None)
    audit(request, "VIEW_PARCEL", "LAIS Mock", upi, parcel is not None)
    if not parcel:
        raise HTTPException(status_code=404, detail="Synthetic parcel not found")
    return parcel


@app.get("/api/lais/land-use/{upi:path}")
def get_land_use(upi: str, request: Request) -> dict[str, Any]:
    parcel = next((item for item in PARCELS if item["upi"] == upi), None)
    audit(request, "VIEW_LAND_USE", "LAIS Mock", upi, parcel is not None)
    if not parcel:
        raise HTTPException(status_code=404, detail="Synthetic parcel not found")
    return {"upi": upi, "land_use": parcel["land_use"], "zoning": parcel["zoning"], "synthetic": True}


@app.get("/api/lais/status/{upi:path}")
def get_registration_status(upi: str, request: Request) -> dict[str, Any]:
    parcel = next((item for item in PARCELS if item["upi"] == upi), None)
    audit(request, "VIEW_REGISTRATION_STATUS", "LAIS Mock", upi, parcel is not None)
    if not parcel:
        raise HTTPException(status_code=404, detail="Synthetic parcel not found")
    return {"upi": upi, "status": parcel["status"], "synthetic": True}


@app.get("/api/nsdi/datasets")
def search_catalogue(request: Request, q: str = "") -> dict[str, Any]:
    query = q.lower().strip()
    items = [item for item in NSDI_DATASETS if query in f"{item['name']} {item['theme']} {item['organization']}".lower()]
    audit(request, "SEARCH_NSDI", "NSDI Catalogue", q)
    return {"items": items, "count": len(items), "synthetic": True}


@app.post("/api/gis/analysis")
def run_analysis(payload: AnalysisRequest, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_prototype_session(authorization)
    if payload.operation not in ALLOWED_GIS_OPERATIONS:
        audit(request, "RUN_SPATIAL_ANALYSIS", "GIS", payload.operation, False)
        raise HTTPException(status_code=403, detail="Spatial operation is not approved")
    audit(request, "RUN_SPATIAL_ANALYSIS", "GIS", f"{payload.operation}:{payload.filters}")
    if payload.operation == "calculate_parcel_area":
        upi = str(payload.filters.get("upi", ""))
        parcel = next((item for item in PARCELS if item["upi"] == upi), None)
        return {"operation": payload.operation, "result": {"upi": upi, "area_m2": parcel["area_m2"] if parcel else None}, "source": "approved PostGIS function (mocked)"}
    return {
        "operation": payload.operation,
        "result": {"affected_parcels": 37, "area_hectares": 18.7, "high_impact": 8, "medium_impact": 13, "low_impact": 16},
        "source": "approved PostGIS function (mocked)",
        "synthetic": True,
    }


@app.post("/api/assistant/query")
def ask_geoai(payload: QueryRequest, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_prototype_session(authorization)
    if payload.role not in ROLES:
        raise HTTPException(status_code=403, detail="Unknown role")
    q = payload.question.lower()
    audit(request, "AI_QUERY", "GeoAI Assistant", payload.question)
    if "100" in q and "road" in q:
        return {"answer": "37 synthetic parcels were identified within 100 metres of the selected road network.", "intent": {"intent": "spatial_analysis", "operation": "find_parcels_within_distance", "object": "parcel", "filters": {"distance": 100, "distance_unit": "metres"}, "reference_layer": "roads"}, "sources": ["Synthetic Parcel Layer", "National Road Network", "Approved ST_DWithin operation"], "warning": "Human verification is required."}
    if "subdivision" in q:
        return {"answer": "Two demonstration documents contain relevant subdivision review guidance. Official requirements could not be verified from the connected demo sources.", "intent": {"intent": "document_search", "operation": "search_nla_documents"}, "sources": ["Subdivision Review Guide — DEMO", "Land Administration Procedures — DEMO"], "warning": "Consult current official regulations and an authorized officer."}
    return {"answer": "Information could not be verified from the currently connected NLA data sources.", "intent": {"intent": "general_search"}, "sources": [], "warning": "Add a parcel UPI, district, layer, distance or document topic."}


@app.get("/api/audit")
def list_audit_events(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_prototype_session(authorization)
    return {"items": list(reversed(AUDIT_EVENTS[-100:])), "count": len(AUDIT_EVENTS)}
