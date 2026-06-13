# Testing the auth flow (Postman)

How to exercise the Supabase-auth flow end-to-end with Postman. Since the migration,
the backend **does not issue tokens** — signup, email confirmation and login all happen
directly against Supabase's Auth API. The backend only **verifies** the access token and
maps it to a `profiles` row.

See [API_ROUTES.md](./API_ROUTES.md) for the full per-endpoint reference.

---

## Values you need

| Name | Value / where to find it |
|------|--------------------------|
| `PROJECT_REF` | `fxhxjdgzwplkghiowdjd` (from `SUPABASE_URL` in `.env`) |
| `SUPABASE_ANON_KEY` | the `eyJ…` anon key in `.env` (line `SUPABASE_ANON_KEY=`). Safe to use in clients. |
| Supabase Auth base | `https://fxhxjdgzwplkghiowdjd.supabase.co/auth/v1` |
| API base | `http://localhost:3000/api/v1` (server `PORT` defaults to 3000) |

> ⚠️ Never put `SUPABASE_SERVICE_ROLE_KEY` in a client/Postman call you might share — it
> bypasses RLS. It's used only server-side (admin/seed paths).

A convenient Postman setup: define environment variables `{{authBase}}`, `{{apiBase}}`,
`{{anonKey}}`, and `{{token}}` so you can reuse them across requests.

---

## Production flow: signup → confirm email → login → create profile

This is the real flow your frontend will implement. It requires **"Confirm email" to be ON**
in the Supabase dashboard (see [Dashboard prerequisites](#dashboard-prerequisites-manual)).

### 1. Sign up (Supabase, NOT your backend)
```
POST https://fxhxjdgzwplkghiowdjd.supabase.co/auth/v1/signup
Headers:
  apikey: <SUPABASE_ANON_KEY>
  Content-Type: application/json
Body:
  {
    "email": "you@example.com",
    "password": "supersecret123",
    "options": { "emailRedirectTo": "http://localhost:3000" }
  }
```
- **Expect:** `200` with a `user` object and **`session: null`** (no token yet — email must be confirmed first).
- Supabase sends a *Confirm your signup* email.

### 2. Confirm the email
- Open the inbox for that address and click the **Confirm your signup** link.
- The link goes to `…/auth/v1/verify?token=…&type=signup&redirect_to=…`, which sets
  `email_confirmed_at` and 302-redirects to your redirect URL.
- For backend-only testing, **the page it lands on doesn't matter** — clicking the link is
  what confirms the account. (A 404 on the redirect target is fine.)

### 3. Log in (password grant) → get the access token
```
POST https://fxhxjdgzwplkghiowdjd.supabase.co/auth/v1/token?grant_type=password
Headers:
  apikey: <SUPABASE_ANON_KEY>
  Content-Type: application/json
Body:
  { "email": "you@example.com", "password": "supersecret123" }
```
- **Before confirming:** `400 { "error_code": "email_not_confirmed" }`.
- **After confirming:** `200 { "access_token": "...", "refresh_token": "...", "expires_in": 3600, ... }`.
- Copy `access_token` — use it as `Authorization: Bearer <access_token>` on all backend calls.

### 4. Create the app profile (your backend)
The Supabase user now exists, but `profiles` doesn't know them yet.
```
POST http://localhost:3000/api/v1/auth/profile
Headers:
  Authorization: Bearer <access_token>
  Content-Type: application/json
Body:
  { "name": "Test One", "phone": "9990001111", "address": "12 MG Road", "dateOfBirth": "1995-04-20" }
```
- **Expect:** `201 { message, profile }` (with the `patient` relation). `409` if a profile already exists. `400` if `name` is missing. `401` if no/invalid token.

### 5. Confirm onboarding
```
GET http://localhost:3000/api/v1/auth/me
Headers: Authorization: Bearer <access_token>
```
- **Before step 4:** `404 { "message": "Profile not found — create one first" }`.
- **After step 4:** `200 { profile }` including `patient` / `doctor` relations.

---

## Dashboard prerequisites (manual — do these in the Supabase dashboard)

These are configuration steps, not code. Do them once:

1. **Authentication → Email/Providers → enable "Confirm email".** This is what makes the
   real confirmation email required (steps 1–3 above).
2. **Authentication → URL Configuration → set Site URL and add Redirect URLs.** The email
   link's `redirect_to` must be allow-listed or the link errors. For backend-only testing,
   `http://localhost:3000` (or your frontend URL) is fine.
3. **(Production-grade email) Authentication → SMTP Settings → configure custom SMTP**
   (Resend, SendGrid, Amazon SES, etc.). The built-in Supabase email sender is **rate-limited
   (~2–4 emails/hour)** and intended only for testing. The confirmation *flow* is identical
   with or without custom SMTP — only deliverability/volume changes.
4. **(Optional) Authentication → Providers → enable Google** if you'll test Google sign-in.

---

## Fast shortcuts for testing (NOT production)

When you don't want to wait on real emails:

- **Create a pre-confirmed user:** Dashboard → Authentication → Users → **Add user** →
  tick **"Auto Confirm User"**. Then skip straight to step 3 (login).
- **Temporarily disable confirmation:** turn **"Confirm email" OFF** while testing — then
  step 1 (`/signup`) returns a `session` with an `access_token` immediately. Turn it back ON
  before production.
- **Resend a confirmation email** (e.g. it expired):
  ```
  POST https://fxhxjdgzwplkghiowdjd.supabase.co/auth/v1/resend
  Headers: apikey: <SUPABASE_ANON_KEY>, Content-Type: application/json
  Body: { "type": "signup", "email": "you@example.com" }
  ```
- **Seeded admin:** with the real `SUPABASE_SERVICE_ROLE_KEY` now in `.env`, run
  `bun run scripts/createAdmin.ts` to create a pre-confirmed `admin@clinic.com` / `admin123`
  (ADMIN role), then log in via step 3 to get an admin token for the `/admin/*` routes.

---

## Roles & tokens quick reference

| Route group | Required | Get a token as |
|-------------|----------|----------------|
| `POST /auth/profile`, `POST /doctor/apply` | any confirmed user (no profile yet) | any confirmed Supabase user |
| `GET /auth/me`, all `/appointment/*` | confirmed user **with** a profile | patient/doctor user after step 4 |
| `POST /appointment` | role `PATIENT` | a patient profile |
| all `/admin/*` | role `ADMIN` | the seeded admin |
| `GET /doctor/:id` | public (no token) | — |

For the full request/response contract of every endpoint, see [API_ROUTES.md](./API_ROUTES.md).
