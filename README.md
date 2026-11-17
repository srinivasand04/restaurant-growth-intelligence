# Restaurant Growth Intelligence — Piccolo Caratello

A bilingual (French / English) dashboard that tells the restaurant owner what to fix and what to do next to win more local guests. Built with React + TypeScript + Vite and a small FastAPI backend; deployed on Vercel as `restaurant-growth-intelligence`.

## What it does today

- **Site health.** An automated check loads every page in the restaurant's sitemap and reports what is actually there: titles, search descriptions, language tags, French/English links, structured data for Google, opening hours, phone link, share preview, speed, and every outgoing link (menu PDF, delivery apps, review sites). Problems come first, each with a plain-language fix. Nothing is estimated; checks that cannot be verified automatically say so.
- **Action plan.** Problems found by the site check and curated recommendations (French copy fixes, Google Maps listing, English visitor path, measurement) in one list, most urgent first.
- **Owner-only items.** What can only be confirmed once the owner grants access: Google Business Profile, Search Console, and a quick real-phone test.
- **Search ideas.** French and English search phrases based on location, cuisine and guest intent. These are hypotheses until Search Console data is connected; no volumes or rankings are claimed.
- **FR / EN toggle** on every page; the choice is remembered in the browser.

## Roadmap

| Phase | What | Needs from the owner |
|---|---|---|
| ✅ 0 | Single data source, automated site check, rebuilt site health and action plan | — |
| 1 | Guest review analysis: themes (food, service, wait, price), languages, trend over time, most-praised dishes | — (public reviews) |
| 2 | Reply drafts for new reviews; weekly one-page brief in French; scheduled weekly refresh | An email address for the brief |
| 3 | Real numbers: Google Business Profile (calls, directions, website clicks) and Search Console (actual searches) | Access to both |

## How the data flows

```
backend/collect/site_check.py  ──writes──▶  backend/snapshot/site_check.json ─┐
(hand-edited)                               backend/snapshot/research.json  ──┼─▶ FastAPI /api/*  ─▶ dashboard
                                                                              └─▶ bundled into the dashboard at build time
```

- `research.json` holds the curated, bilingual content (profile, recommendations, owner checks, search ideas). Every text field has `en` and `fr`.
- `site_check.json` is generated. Do not edit it by hand; rerun the check.
- The dashboard bundles both files, so it still works when the API is down. When the API answers, it shows the freshest copy.

## Run locally

Requirements: Node.js 20+ and Python 3.12 or 3.13.

> **Windows note:** if `py` defaults to the free-threaded build (`3.13t`, shown by `py -0`), package installs fail with "Microsoft Visual C++ 14.0 or greater is required". Create the venv with `py -3.13` (or `py -3.12`) as below.

### 1. Install

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
npm install
```

### 2. Refresh the site check (optional, about 30 seconds)

```powershell
python -m backend.collect.site_check
```

It prints a one-line summary and lists anything to fix, then saves `backend/snapshot/site_check.json`. It uses only the Python standard library. Links to delivery and review platforms are retried with a browser-like request before being reported as broken, because some platforms reject automated requests; sites that block checks entirely are reported as "not verifiable", never as broken.

### 3. Start the API and the dashboard

In two terminals from the repository root:

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

```powershell
npm run dev
```

Open http://localhost:5180. Vite proxies `/api` to FastAPI on port 8000. The port is fixed (`strictPort`) so it never collides with other projects on 5173.

### 4. Build

```powershell
npm run build
```

## API

- `GET /api/health` — status, research date, last site-check time
- `GET /api/profile` — restaurant profile
- `GET /api/research` — curated research (profile, sources, owner checks, search ideas, recommendations)
- `GET /api/site-check` — latest automated site check

Interactive docs: http://localhost:8000/docs

## Deploy to Vercel

The root `main.py` exports the FastAPI app. Vercel runs `npm ci && npm run build`, serves the Vite dashboard at `/` and the API at `/api/*`. The snapshot files ship with each deployment.

## Daily refresh (automatic)

[`.github/workflows/daily-site-check.yml`](.github/workflows/daily-site-check.yml) runs every day at 05:00 UTC (06:00 Paris in winter, 07:00 in summer):

1. GitHub Actions reruns the site check against the live website.
2. It commits `backend/snapshot/site_check.json` and `site_check_history.json` as `github-actions[bot]`.
3. Vercel sees the push to `main` and redeploys, so the dashboard shows that morning's results.

What the owner sees:

- **Top bar:** date and time of the last check.
- **Site health → "What changed":** problems fixed and new problems since the previous check.
- **A red warning on every page** if the data is more than 36 hours old, which means the daily job stopped. GitHub also emails the repository owner when a run fails.

Requirements: the Vercel project must be connected to this GitHub repository with automatic deployments from `main`. To run it immediately, open the repository's **Actions** tab → **Daily site check** → **Run workflow**.

Because the job commits to `main` every day, run `git pull` before pushing your own changes. `site_check_history.json` keeps one line per day (counts and problem ids) for later trend charts.

## Evidence rules

- Only what was loaded from a public page or confirmed by the owner is reported as fact; each recommendation links to its source.
- Search phrase fit is an editorial judgment, not demand data.
- Priority, effort and confidence are planning labels, not predicted outcomes.
- No sales, traffic, ranking or revenue figures are shown or promised. Business impact should be measured against a baseline of bookings, calls, direction requests and orders once the owner connects their data.
