# Restaurant Growth Intelligence — Piccolo Caratello

A bilingual (French / English) dashboard for **Piccolo Caratello** (8 rue Audran, Paris 18e, [piccolocaratello.com](https://piccolocaratello.com/)). It shows the owner where the restaurant stands, the 30-day plan to reach the **top 3 Italian restaurants in the 18th**, and what we need from him. Built with React + TypeScript + Vite and a small FastAPI backend; deployed on Vercel as `restaurant-growth-intelligence`.

Pizza Caratello and Al Caratello come later, using the same method once Piccolo shows results.

## The four tabs

| Tab | What the owner sees |
|---|---|
| **Today** | The 30-day goal with a ranking ladder (No. 11 of 27 → top 3), Google rating and review count (updated every morning), plan progress, website health, a review-count chart, the next steps, and the access we still need |
| **30-day plan** | Every task with why it matters, the steps, and when it counts as done. Filter by area; tasks that need access the owner has not given yet show "Waiting for access" |
| **Reputation** | Google, TheFork, Tripadvisor, Restaurant Guru, Rankeat and Uber Eats side by side, with source and date for every number, information that does not match between sites, a sample of what guests say, and the words to use everywhere |
| **Website** | The automatic morning check of piccolocaratello.com: what changed since yesterday, problems with their fix, and what already works |

Every number has an ⓘ button saying where it comes from. Numbers not re-checked recently say "to confirm".

## Updating the plan

Edit `backend/snapshot/research.json`, then commit and push; Vercel redeploys.

- Mark a task done: set its `"status"` to `"done"` (or `"doing"` while in progress).
- When the owner gives an access item (Google Manager, website login, domain, bookings number), set that item's `"status"` to `"done"`; tasks that were waiting for it unlock automatically.
- New readings for TheFork, Tripadvisor and the others: update `rating`, `reviews` and `checked_on` on that platform.

The Google rating and review count do not need editing: the daily check reads them from the restaurant website's structured data (published from Google) and stores one reading per day in `site_check_history.json`.

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
- `GET /api/site-check` — latest automated site check, including the Google rating and review count
- `GET /api/history` — one line per day: check results plus Google rating and review count

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
