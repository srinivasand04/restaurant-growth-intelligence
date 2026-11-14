from __future__ import annotations

import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

if __package__:
    from .data import KEYWORDS, OBSERVATIONS, OPPORTUNITIES, PROFILE, RESEARCHED_ON, SOURCES
else:  # Vercel loads this service entrypoint as the top-level module `main`.
    from data import KEYWORDS, OBSERVATIONS, OPPORTUNITIES, PROFILE, RESEARCHED_ON, SOURCES

DEFAULT_DB_PATH = Path("/tmp/caratello.sqlite3") if os.getenv("VERCEL") else Path(__file__).parent / "caratello.sqlite3"
DB_PATH = Path(os.getenv("CARATELLO_DB", DEFAULT_DB_PATH))
app = FastAPI(title="Restaurant Growth Intelligence API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET"], allow_headers=["*"])


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def seed_database() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(connect()) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS research_items (kind TEXT NOT NULL, item_id TEXT NOT NULL, payload TEXT NOT NULL, researched_on TEXT NOT NULL, PRIMARY KEY(kind, item_id));
        """)
        rows = []
        rows.extend(("source", s["id"], s) for s in SOURCES)
        rows.extend(("observation", o["id"], o) for o in OBSERVATIONS)
        rows.extend(("opportunity", o["id"], o) for o in OPPORTUNITIES)
        rows.extend(("keyword", str(i), k) for i, k in enumerate(KEYWORDS))
        for kind, item_id, payload in rows:
            db.execute("INSERT OR IGNORE INTO research_items VALUES (?, ?, ?, ?)", (kind, item_id, json.dumps(payload), RESEARCHED_ON))
        db.commit()


@app.on_event("startup")
def startup() -> None:
    seed_database()


def read_items(kind: str) -> list[dict[str, Any]]:
    with closing(connect()) as db:
        rows = db.execute("SELECT payload FROM research_items WHERE kind = ? ORDER BY item_id", (kind,)).fetchall()
    return [json.loads(row["payload"]) for row in rows]


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "researched_on": RESEARCHED_ON}


@app.get("/api/profile")
def profile() -> dict[str, Any]:
    return PROFILE


@app.get("/api/research")
def research() -> dict[str, Any]:
    observations = pd.DataFrame(read_items("observation"))
    keywords = read_items("keyword")
    return {
        "researched_on": RESEARCHED_ON,
        "observations": observations.to_dict(orient="records"),
        "keywords": keywords,
        "opportunities": read_items("opportunity"),
        "sources": read_items("source"),
        "summary": {
            "verified": int((observations["status"] == "observed").sum()) if not observations.empty else 0,
            "needs_check": int(observations["status"].isin(["unknown", "partial"]).sum()) if not observations.empty else 0,
            "keyword_ideas": len(keywords),
            "metrics_available": False,
        },
    }


# On Vercel, `app.frontend()` publishes the Vite build through its CDN while
# leaving the API routes above on FastAPI. Locally, keep API and Vite dev servers
# separate; the Vite proxy forwards `/api` requests to FastAPI.
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if DIST_DIR.is_dir() and hasattr(app, "frontend"):
    app.frontend("/", directory=str(DIST_DIR), fallback="index.html")
