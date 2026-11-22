"""Restaurant Growth Intelligence API.

The API serves the JSON files in backend/snapshot:

- research.json    curated, bilingual research (profile, keywords, actions)
- site_check.json  written by `python -m backend.collect.site_check`

The dashboard bundles the same files at build time, so it still works when the
API is unreachable; the API simply provides the freshest copy.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

SNAPSHOT_DIR = Path(__file__).resolve().parent / "snapshot"

app = FastAPI(title="Restaurant Growth Intelligence API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5180", "http://127.0.0.1:5180"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def read_snapshot(name: str) -> dict[str, Any]:
    path = SNAPSHOT_DIR / f"{name}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"No {name} snapshot has been collected yet.")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "research_updated_on": read_snapshot("research")["updated_on"],
        "site_checked_at": read_snapshot("site_check")["checked_at"],
    }


@app.get("/api/profile")
def profile() -> dict[str, Any]:
    return read_snapshot("research")["profile"]


@app.get("/api/research")
def research() -> dict[str, Any]:
    return read_snapshot("research")


@app.get("/api/site-check")
def site_check() -> dict[str, Any]:
    return read_snapshot("site_check")


@app.get("/api/history")
def history() -> list[dict[str, Any]]:
    """One line per day: check counts plus the Google rating and review count."""
    path = SNAPSHOT_DIR / "site_check_history.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else []


# On Vercel, `app.frontend()` publishes the Vite build through its CDN while
# leaving the API routes above on FastAPI. Locally, keep API and Vite dev servers
# separate; the Vite proxy forwards `/api` requests to FastAPI.
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if DIST_DIR.is_dir() and hasattr(app, "frontend"):
    app.frontend("/", directory=str(DIST_DIR), fallback="index.html")
