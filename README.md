# Restaurant Growth Intelligence — Pizza Caratello

Step 1 of the restaurant growth platform: a source-linked public website audit, French and English search opportunity hypotheses, and a practical local customer acquisition plan. The workspace started empty, so this is a new, self-contained React + TypeScript + Vite frontend and FastAPI + SQLite backend. The GitHub repository and Vercel project use the name `restaurant-growth-intelligence`.

## What the demo does

- Shows only dated public-page observations as verified; technical checks that were not run are marked unknown or partial.
- Provides eight French and English search phrase ideas based on location, cuisine, and guest intent. Search volumes and rankings are intentionally unavailable until Search Console data is connected.
- Turns evidence into five concrete recommendations, each with expected business value, effort, confidence, and source links.
- Saves the research snapshot in SQLite and uses Pandas to summarize observation status.
- Includes a working fallback snapshot in the frontend, so the interface can still be browsed when the API is stopped.

The current public research snapshot is dated **14 November 2026**. Restaurant details and website copy are taken from [the French home page](https://pizzacaratello.com/) and [the English page](https://pizzacaratello.com/en). Google documentation is linked next to recommendations. The public site displays its own Google review summary; this demo does not import or analyze reviews.

## Run locally

Requirements: Node.js 20+ and Python 3.12+.

### 1. Start the API

From the repository root:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
py -m uvicorn backend.main:app --reload --port 8000
```

The API creates `backend/caratello.sqlite3` on first start. Set `CARATELLO_DB` to use a different SQLite path.

### 2. Start the frontend

In a second terminal from the repository root:

```powershell
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to FastAPI on port 8000; if it cannot connect, the saved public-research snapshot is shown and the connection status is visible in the sidebar.

### 3. Build the frontend

```powershell
npm run build
```

## API endpoints

- `GET /api/health` — health and snapshot date
- `GET /api/profile` — restaurant profile
- `GET /api/research` — observations, keyword hypotheses, opportunities, linked sources, and evidence counts

Interactive API docs are available at http://localhost:8000/docs.

## Deploy to Vercel

The root `main.py` exports the FastAPI app. Vercel runs `npm ci && npm run build`, then serves the Vite frontend at `/` and the API routes at `/api/*`. FastAPI's built-in frontend support lets Vercel promote the static dashboard to its CDN. SQLite uses `/tmp` on Vercel because serverless filesystems are temporary; the current read-only demo data is seeded at startup and owner edits are not persisted.

Connect the GitHub repository to a Vercel project and keep the project root at the repository root. Vercel will build and deploy each push automatically.

## Evidence and interpretation

“Observed” means visible in the linked public page. “Partial” means a related fact appears on the restaurant website, but the relevant Google Business Profile details were not checked directly. “Unverified” means no technical measurement was performed. Keyword fit is an editorial relevance judgment, not demand data. Priority, effort, and confidence are transparent planning labels, not predicted outcomes.

No sales, traffic, conversion, rank, search volume, or competitor data is present. There are no guarantees about Google rankings or revenue. Before claiming business impact, the owner should connect Search Console and agree on a baseline for booking, call, direction, and order actions, then use actual booking/POS outcomes where available.

## What is needed to improve confidence

Owner access to Google Business Profile for category, menu, photos, attributes, and profile status; Search Console for actual queries and landing pages; permission to inspect HTML and run mobile checks; and analytics or booking/order data for conversion measurement. No paid API or production website change is required for this demo.
