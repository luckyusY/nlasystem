# NLA GeoAI

**Intelligent Land & Geospatial Assistant** — a Vercel-ready internal decision-support prototype for the National Land Authority (NLA) Rwanda.

The application demonstrates how an authorized employee could combine GIS analysis, synthetic parcel records, NSDI metadata and verified institutional documents through one guarded AI workspace. It is a prototype and does not connect to production LAIS, citizen or Rwanda GeoNet data.

## What works in the prototype

- Government-style operational dashboard with activity charts and system notices.
- GeoAI chat with all requested demonstration questions, source citations and verification warnings.
- Interactive synthetic parcel map with layer toggles, parcel selection, zoom and analysis controls.
- Searchable registry of 128 synthetic parcels across six districts.
- Approved road, wetland, proximity, area, zoning and land-use analysis workflows.
- Searchable NSDI demonstration catalogue and indexed DEMO knowledge documents.
- Rwanda Government Updates workspace with 20 official-site-confirmed public channels, topic filters, opt-in live X timelines and institution-owned newsroom fallbacks.
- Parcel, road, wetland, GIS, land-use and NSDI report creation with downloadable PDF output.
- Simulated CORS/GNSS monitoring and anomaly summaries.
- Future satellite change-detection workflow with mock findings.
- Role, connector, audit and system-health administration views.
- FastAPI endpoints for authentication, LAIS mock records, NSDI search, approved GIS operations and grounded assistant responses.
- PostGIS/pgvector migration and 128-record synthetic seed.

## Technology

- Next.js 16, React 19, TypeScript and Tailwind CSS 4
- Python FastAPI on the Vercel Python runtime
- PostgreSQL with PostGIS and pgvector
- Deterministic mock AI mode when no provider key is configured

## Quick start — interface

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. All interface workflows work immediately with safe in-browser synthetic data, even when the Python or database services are not running.

## Full local stack

Requirements: Node.js 20+, Python 3.12+, Docker Desktop and two terminal windows.

1. Copy `.env.example` to `.env.local` and keep the prototype defaults.
2. Start PostgreSQL/PostGIS/pgvector:

   ```bash
   docker compose up --build -d
   ```

   The first start applies `database/migrations/001_initial.sql` and inserts 128 synthetic records from `database/seeds/001_synthetic_data.sql`.

3. Create a Python virtual environment and install the API:

   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   npm run dev:api
   ```

4. In a second terminal, proxy the Next.js `/api` path to FastAPI:

   ```bash
   $env:FASTAPI_ORIGIN="http://127.0.0.1:8000"
   npm run dev
   ```

5. Check `http://localhost:3000` and `http://127.0.0.1:8000/docs`.

Demo API credentials:

```text
gis.officer@nla.demo
Prototype2026!
```

Set `AUTH_REQUIRED=true` only when testing the prototype bearer-session flow. This is not a production identity system.

## Deploy to Vercel

The repository is a single polyglot Vercel project: Next.js serves the interface and `api/index.py` is packaged as a Python Function.

1. Push the repository to a Git provider and import it into Vercel, or run `vercel` from the project root.
2. Keep the detected framework as Next.js and the project root as `.`.
3. Add the server-side environment variables from `.env.example`. At minimum set `NEXT_PUBLIC_SITE_URL` and `APP_ORIGIN` to the assigned HTTPS domain.
4. For persistent hosted data, provision a PostgreSQL service that supports PostGIS and pgvector, apply the migration and seed, and set `DATABASE_URL` plus a least-privilege `DATABASE_READONLY_URL`.
5. Deploy. The interface is available at `/`; FastAPI health is available at `/api/health`.

Do not add real NLA credentials, citizen data or production LAIS connection details to preview deployments. Vercel environment variables should be scoped separately for Development, Preview and Production.

## AI provider abstraction

`AI_PROVIDER=mock` is the default. A future provider adapter should implement the same server-owned tool contract used by the deterministic assistant. The model may select an approved function, but must never generate unrestricted SQL or receive a database password.

Approved operations include:

```text
find_parcels_by_district
find_parcels_by_land_use
find_parcels_within_distance
find_intersecting_parcels
calculate_parcel_area
find_nearest_feature
get_parcel_details
```

## Important safety boundary

NLA GeoAI is for search, analysis, GIS assistance, documentation and reporting. It cannot change ownership, register land, transfer a title, approve subdivision or rezoning, change boundaries, resolve disputes, delete records or make a final administrative or legal decision.

Every result that could affect an official decision requires verification by an authorized NLA officer.

See [architecture](docs/architecture.md) and [security](docs/security.md) for the production integration boundaries.
