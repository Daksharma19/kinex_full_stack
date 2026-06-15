<div align="center">

# Kinex Wellness & Rehab

**A full-stack doctor-appointment & telehealth platform — book consultations, manage patients, run a clinic.**

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-000?logo=vercel)](https://kinex-frontend.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=000)](https://kinex-backend.onrender.com)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-000?logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20DB%20%7C%20Storage-3FCF8E?logo=supabase&logoColor=fff)](https://supabase.com)

[Live Demo](https://kinex-frontend.vercel.app) · [Deployment Guide](DEPLOYMENT.md) · [Report a Bug](https://github.com/Daksharma19/kinex_full_stack/issues)

</div>

---

## Overview

Kinex is a production-deployed healthcare platform that connects **patients**, **doctors**, and **clinic administrators** in a single application. Patients discover providers and book paid appointments; doctors manage their schedules and consultations; admins verify practitioners and govern the platform.

It is built around three role-based experiences served from one React SPA, backed by a Bun + Express API and Supabase (Auth, Postgres, Storage).

## Features

### 👤 Patients
- Email/password and Google sign-up with OTP email verification
- Browse data-driven services and provider profiles
- Book appointments with **online payments** (Razorpay), pre-payment invoice
- Optional **video consultations** (Whereby room per paid online appointment)
- View appointment history; edit profile and avatar

### 🩺 Doctors
- "Apply as a Doctor" onboarding (status `PENDING` until admin-verified)
- Manage appointments — confirm, complete, or cancel
- Track net earnings; edit profile and photo

### 🛡️ Admins
- Verify or reject doctor applications
- Promote users to admin; full user deletion
- Platform-wide oversight

### Platform
- Role-based dashboards behind a single protected route
- Input sanitization, 10-digit phone validation, password-strength UI
- Reminder emails (SMTP) a day before online consultations, driven by a cron endpoint
- SPA fallback, no-cache API headers, graceful degradation when optional integrations are unset

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| **Frontend** | Bun · React 19 · React Router · Tailwind CSS v4 (static `dist/`) |
| **Backend**  | Bun · Express 5 · Prisma 7 (pg adapter) |
| **Database** | Supabase Postgres |
| **Auth**     | Supabase Auth (email + Google OAuth, OTP) |
| **Storage**  | Supabase Storage (`avatars` bucket) |
| **Payments** | Razorpay |
| **Video**    | Whereby |
| **Email**    | Nodemailer (SMTP) |
| **Hosting**  | Vercel (frontend) · Render (backend, Docker) |

## Architecture

```
┌─────────────────┐        HTTPS / Bearer token        ┌──────────────────────┐
│  React SPA       │ ─────────────────────────────────▶ │  Express API (Bun)    │
│  (Vercel)        │                                     │  /api/v1/*            │
│                  │ ◀───────────────────────────────── │  Prisma 7 + pg        │
└────────┬─────────┘                                     └──────────┬───────────┘
         │                                                          │
         │  Supabase JS (auth, storage)                             │  pooled :6543 (runtime)
         ▼                                                          ▼  direct :5432 (migrations)
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Supabase — Auth · Postgres · Storage                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**API routes** (mounted under `/api/v1`): `auth`, `doctor`, `appointment`, `admin`.

## Project Structure

```
kinex_v1/
├── frontend/                 # React 19 SPA (Bun)
│   ├── assets/               # images, illustrations
│   ├── src/
│   │   ├── components/       # pages, sections, auth, ui
│   │   ├── context/          # AuthContext (session + profile)
│   │   └── lib/              # supabase client, api, validation
│   └── build.ts              # production build (inlines BUN_PUBLIC_* env)
├── backend/                  # Express + Prisma API (Bun)
│   ├── routes/               # auth · doctor · appointment · admin
│   ├── prisma/               # schema + migrations
│   ├── index.ts              # app entry (CORS, webhook before json())
│   ├── db.ts                 # Prisma client via pg adapter (pooled)
│   ├── prisma.config.ts      # migrations use DIRECT_URL
│   └── Dockerfile
└── DEPLOYMENT.md             # full deploy guide
```

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) 
- A [Supabase](https://supabase.com) project (Auth + Postgres + a public `avatars` storage bucket)
- (Optional) Razorpay, Whereby, and SMTP credentials for payments / video / email

### 1. Clone & install

```bash
git clone https://github.com/Daksharma19/kinex_full_stack.git
cd kinex_full_stack

# Backend
cd backend && bun install

# Frontend
cd ../frontend && bun install
```

### 2. Configure environment

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Backend** (`backend/.env`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Pooled Supabase connection (`:6543`) — app runtime |
| `DIRECT_URL` | Direct connection (`:5432`) — Prisma migrations |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-side provisioning) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:5173`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments *(optional)* |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification *(optional)* |
| `WHEREBY_API_KEY` | Video rooms *(optional)* |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Reminder emails *(optional)* |
| `CRON_SECRET` | Protects the reminder cron endpoint *(optional)* |

**Frontend** (`frontend/.env`) — must be `BUN_PUBLIC_`-prefixed so Bun inlines them into the browser bundle:

| Variable | Description |
|----------|-------------|
| `BUN_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `BUN_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `BUN_PUBLIC_API_BASE_URL` | API base, e.g. `http://localhost:3000/api/v1` |

### 3. Set up the database

```bash
cd backend
bunx prisma migrate deploy   # apply migrations (uses DIRECT_URL)
bunx prisma generate
```

### 4. Run locally

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && bun run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && bun run dev
```

## Scripts

**Backend**

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the API server |
| `bun run start` | Start in production |
| `bun run build` | Type-check (`tsc`) |

**Frontend**

| Command | Description |
|---------|-------------|
| `bun run dev` | Dev server with hot reload (port 5173) |
| `bun run build` | Production build to `dist/` |
| `bun run start` | Serve the production build |

## Deployment

Live today:

- **Frontend → Vercel:** https://kinex-frontend.vercel.app
- **Backend → Render:** https://kinex-backend.onrender.com (`backend/Dockerfile`)

> **Note:** Render's free tier sleeps after ~15 min of inactivity, so the first request after idle incurs a cold start. The same Dockerfile runs on Railway / Koyeb / Fly.

A few non-obvious but important details:
- **Connection split:** migrations run over `DIRECT_URL` (`:5432`); runtime uses the pooled `DATABASE_URL` (`:6543`) via the pg adapter — pgbouncer transaction pooling breaks migrations.
- **Razorpay webhook** is mounted *before* `express.json()` so signatures verify over the raw body. The client-side verify flow confirms payments even without it.
- Frontend env **must** be `BUN_PUBLIC_`-prefixed; changing `BUN_PUBLIC_API_BASE_URL` requires a redeploy.

## License

This project is private and proprietary. All rights reserved.

---

<div align="center">
Built with care for better patient experiences. 🩺
</div>
