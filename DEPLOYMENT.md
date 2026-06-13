# Deployment Guide — Kinex Healthcare

This is a full‑stack app made of three pieces:

| Piece | Stack | Hosting type |
|-------|-------|--------------|
| **Frontend** (`/frontend`) | Bun + React (Bun bundler → static `dist/`) | Static site / SPA |
| **Backend** (`/backend`) | Bun + Express + Prisma | Long‑running web service |
| **Database / Auth / Storage** | Supabase (Postgres + Auth + Storage) | Already hosted |

Supabase is already provisioned, so you only deploy the **frontend** and **backend**.

---

## 1. Build commands

### Frontend
```bash
cd frontend
bun install
bun run build          # → outputs static site to frontend/dist
```
The build inlines `BUN_PUBLIC_*` env vars, so they must be set **at build time**.

### Backend
The backend runs TypeScript directly with Bun (no compile step). For a host:
```bash
cd backend
bun install
bunx prisma generate           # generate the Prisma client (build step)
bunx prisma migrate deploy     # apply migrations to Supabase (run once per release)
bun run index.ts               # start command (serves the API)
```

---

## 2. Environment variables

### Frontend (set in the host's build env) — see `frontend/.env.example`
| Var | Value |
|-----|-------|
| `BUN_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `BUN_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public‑safe) |
| `BUN_PUBLIC_API_BASE_URL` | Deployed backend URL + `/api/v1` (e.g. `https://api.yourapp.com/api/v1`) |

### Backend (set in the host's service env) — see `backend/.env.example`
| Var | Value |
|-----|-------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service‑role key — **server only** |
| `DATABASE_URL` | Pooled connection (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Direct connection (port 5432) — used by migrations |
| `FRONTEND_ORIGIN` | Your deployed frontend URL (for CORS) |
| `PORT` | Provided by the host, or `3000` |

---

## 3. Deploy the frontend (Vercel — recommended)

`frontend/vercel.json` is already configured (build command, output dir, SPA rewrites).

1. Push to GitHub (done).
2. On **vercel.com** → New Project → import this repo.
3. Set **Root Directory** to `frontend`.
4. Add the three `BUN_PUBLIC_*` env vars (Production).
5. Deploy. Vercel runs `bun run build` and serves `dist/` with SPA fallback
   (so `/services`, `/dashboard`, etc. work on refresh).

> Netlify alternative: Base directory `frontend`, build `bun run build`,
> publish `frontend/dist`, and add a redirect `/* /index.html 200`.

---

## 4. Deploy the backend (Railway — recommended)

Railway runs a long‑lived process and **does not spin down** (unlike Render's free
tier). The repo ships a `backend/Dockerfile` + `backend/railway.json`, so the build,
start command, migrations, and healthcheck are already configured.

1. On **railway.app** → New Project → **Deploy from GitHub repo** → pick this repo.
2. In the service **Settings → Root Directory**, set `backend`.
   (Railway reads `backend/railway.json` and builds the `Dockerfile`.)
3. **Variables:** add all backend env vars from the table above
   (`SUPABASE_*`, `DATABASE_URL`, `DIRECT_URL`, `FRONTEND_ORIGIN`). Railway provides
   `PORT` automatically.
4. **Deploy.** The container runs `bunx prisma migrate deploy` (applies migrations)
   then `bun run index.ts`. Healthcheck path is `/`.
5. **Networking → Generate Domain** to get the public backend URL. Use it for the
   frontend's `BUN_PUBLIC_API_BASE_URL` (append `/api/v1`).

> The same `Dockerfile` works on **Koyeb** (free, no sleep) and **Fly.io**
> (`fly launch` → set `min_machines_running = 1`), or any container host. For a
> plain VPS: install Bun, `bun install && bunx prisma generate && bunx prisma
> migrate deploy`, then run `bun run index.ts` under `pm2`/systemd.

---

## 5. Post‑deploy wiring (important)

1. **Point the frontend at the backend:** set `BUN_PUBLIC_API_BASE_URL` to
   `https://<your-backend-domain>/api/v1` and **redeploy the frontend** (the URL
   is baked in at build time).
2. **CORS:** set the backend's `FRONTEND_ORIGIN` to your exact frontend URL.
3. **Supabase Auth URLs** (Authentication → URL Configuration):
   - Site URL = your frontend URL.
   - Redirect URLs += `https://<your-frontend-domain>/dashboard` (needed for
     Google OAuth).
4. **Google OAuth** (if used): enable the Google provider in Supabase with your
   Google client ID/secret, and add Supabase's callback URL to the Google console.
5. **Seed an admin** (once): run `bun run scripts/createAdmin.ts` from `backend`
   against the production DB, then change the default password.

---

## 6. Quick local sanity check before deploying
```bash
# backend
cd backend && bun install && bunx prisma generate && bun run index.ts
# frontend (new terminal)
cd frontend && bun install && bun run build   # should exit 0 and write dist/
```
