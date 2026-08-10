# Architecture

NLA GeoAI is deployed as one Vercel project with a Next.js interface and Python FastAPI functions. The current prototype is safe by default: browser-visible workflows use deterministic synthetic data, and the FastAPI service exposes only approved operations.

```text
NLA employee
  -> Next.js interface
  -> authentication and RBAC boundary
  -> FastAPI orchestration
  -> approved tool registry
      -> PostGIS functions
      -> LAIS connector (mock)
      -> NSDI catalogue
      -> document retrieval / pgvector
  -> grounded response, map result or report
  -> audit event
```

## Service boundaries

- `components/geoai-app.tsx`: interactive demonstration UI and offline-safe mock workflows.
- `api/index.py`: Vercel Python runtime entrypoint, validation, safe intent handling, API authorization boundary and audit capture.
- `database/migrations`: PostGIS/pgvector schema and a security-definer example for an approved spatial operation.
- `database/seeds`: 128 synthetic parcels and clearly labelled demo documents.

The language model never receives database credentials and never executes generated SQL. It may only select from a server-owned registry of approved functions. Future LAIS integration belongs behind an authorization service and an adapter implementing the same narrow connector interface used by the mock service.

## Vercel deployment

Vercel builds Next.js with its native runtime and packages `api/index.py` as a Python function. `/api/:path*` requests are routed to the FastAPI application. Hosted PostgreSQL should be provided by a PostGIS-capable managed service and connected with server-only environment variables.
