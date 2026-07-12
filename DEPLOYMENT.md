# EcoSphere — ESG Management Platform

## Deploying EcoSphere to Vercel (free tier)

EcoSphere runs fully on Vercel using **two projects from the same repo** plus two
free managed services:

| Piece            | Where it runs                    | Cost |
| ---------------- | -------------------------------- | ---- |
| Frontend (Vite)  | Vercel project, root = `client`  | Free |
| Backend (FastAPI)| Vercel project, root = `server`  | Free |
| Database         | **Neon** (managed PostgreSQL)    | Free |
| Proof uploads    | **Vercel Blob**                  | Free |

> The database is genuine PostgreSQL — Neon is just Postgres hosted in the cloud.
> The models, Alembic migrations and `seed.py` are unchanged; only `DATABASE_URL`
> differs from local.

---

## 1. Create the database (Neon)

1. Sign up at [neon.tech](https://neon.tech) and create a project (Postgres 16).
2. Copy the **pooled** connection string (host contains `-pooler`). It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/NEONDB?sslmode=require
   ```
3. Prefix it for SQLAlchemy — this is your `DATABASE_URL`:
   ```
   postgresql+psycopg2://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/NEONDB?sslmode=require
   ```

Using the **pooled** endpoint matters: serverless functions open a fresh
connection per invocation, and the pooler prevents connection exhaustion.

## 2. Load the schema and demo data (once, from your machine)

```bash
cd server
source .venv/bin/activate
export DATABASE_URL="postgresql+psycopg2://...-pooler...?sslmode=require"
alembic upgrade head        # create tables on Neon
python seed.py              # load demo departments, employees, scores, etc.
```

## 3. Deploy the backend (FastAPI)

1. In Vercel: **Add New → Project**, import this Git repo.
2. **Root Directory → `server`**. Vercel auto-detects FastAPI (`app` in `app/main.py`).
   Leave build/output settings at their defaults.
3. Under **Storage**, create a **Blob** store and connect it to this project.
   Vercel auto-injects `BLOB_READ_WRITE_TOKEN` — that alone switches uploads to Blob.
4. Add **Environment Variables**:
   | Name             | Value                                                        |
   | ---------------- | ------------------------------------------------------------ |
   | `DATABASE_URL`   | your Neon pooled URL (step 1)                                |
   | `JWT_SECRET`     | a long random string                                         |
   | `CORS_ORIGINS`   | your frontend URL (fill after step 4, then redeploy)         |
5. **Deploy** and note the URL, e.g. `https://ecosphere-api.vercel.app`.
6. Sanity check: open `https://ecosphere-api.vercel.app/health` → `{"status":"ok"}`.

## 4. Deploy the frontend (Vite)

1. **Add New → Project**, import the **same** repo again.
2. **Root Directory → `client`**. Vercel auto-detects Vite.
3. Add **Environment Variable**:
   | Name           | Value                                   |
   | -------------- | --------------------------------------- |
   | `VITE_API_URL` | your backend URL from step 3            |
4. **Deploy** and note the URL, e.g. `https://ecosphere.vercel.app`.

## 5. Close the loop (CORS)

Set the backend's `CORS_ORIGINS` to the frontend URL and **redeploy the backend**:

```
CORS_ORIGINS=https://ecosphere.vercel.app
```

## 6. Log in

Open the frontend URL and sign in with a seeded account:

- Admin (non-participating): `admin@ecosphere.com` / `Password123`
- Dept head: `arjun@ecosphere.com` / `Password123`
- Employee: `priya@ecosphere.com` / `Password123`

---

## How it works / what changed

- **Same repo, two projects** — each Vercel project uses a different *Root Directory*.
  They get different domains, so the frontend calls the backend cross-origin
  (`VITE_API_URL`) and the backend allows it via `CORS_ORIGINS`.
- **Uploads** — `save_proof()` writes to Vercel Blob when `BLOB_READ_WRITE_TOKEN`
  is present and stores the returned absolute URL; the frontend opens it directly.
  With no token (local dev) it falls back to the `uploads/` folder.
- **Database engine** — on Vercel (`VERCEL` env is set automatically) the engine
  uses `NullPool`, so no pool is held open between invocations.

## Good to know (free-tier caveats)

- **Cold starts:** the first request after idle time takes ~1–2s while the
  function boots. Normal for serverless.
- **Function limit:** hobby functions cap at 60s (`server/vercel.json`); report
  generation is well under this.
- **Migrations run from your machine**, not on Vercel. Re-run `alembic upgrade head`
  against `DATABASE_URL` whenever you add migrations.
- **Local development is unchanged**: leave `VITE_API_URL` and
  `BLOB_READ_WRITE_TOKEN` unset and run the client and server as before.
