# API Routes

Backend API reference for the appointment-booking service.

**Base URL:** `/api/v1`

**Authentication:** Identity is owned by **Supabase Auth**. Signup, login, Google
sign-in and email OTP all happen on the **frontend** via `supabase-js`. The backend
no longer issues tokens — it **verifies the Supabase access token** on each request.

Protected routes require `Authorization: Bearer <supabase_access_token>` (the
`access_token` from the supabase-js session). The backend verifies it via
`supabase.auth.getClaims()` (asymmetric ES256 / JWKS) and maps `sub` → `profiles.id`.

> The token's `role` claim is the **Postgres** role (`authenticated`), NOT the app
> role. The app role (`PATIENT`/`DOCTOR`/`ADMIN`) is read from the `profiles` table.

### Signup → profile flow
1. Frontend signs the user up/in with Supabase (`supabase.auth.signUp` / `signInWith…`).
2. User confirms email (if "Confirm email" is on) and obtains a session.
3. Frontend calls `GET /auth/me` with the access token.
   - `{ profile: null }` → send the user to profile creation.
   - `{ profile }` → user is fully onboarded.
4. To create the profile, the frontend calls `POST /auth/profile` (patients) or
   `POST /doctor/apply` (doctors) with the access token.

### Roles
- `PATIENT` — books and views their own appointments
- `DOCTOR` — applies for verification, manages their own appointments
- `ADMIN` — verifies doctors, creates other admins, has full oversight

### Common status codes
- `200` OK · `201` Created · `400` Bad request (validation)
- `401` Not authenticated (missing/invalid Supabase token)
- `403` Forbidden (authenticated but wrong role / not a participant)
- `404` Not found · `409` Conflict (profile already exists) · `500` Server error

---

## Auth — `/api/v1/auth`

### `POST /api/v1/auth/profile`
Create the **patient** profile for an already-authenticated Supabase user. Reads
`sub`/`email` from the token; creates a `Profile` (role `PATIENT`, `id = sub`) plus
the linked `Patient` row.
- **Auth:** Bearer Supabase token
- **Body:** `{ name, phone?, address?, dateOfBirth? }`
- **Returns:** `201` — `{ message, profile }` · `409` if a profile already exists

### `GET /api/v1/auth/me`
Return the authenticated user's profile and its patient/doctor relation.
- **Auth:** Bearer Supabase token
- **Returns:** `200` — `{ profile }` with relations, or `{ profile: null }` if the
  user is authenticated but has not created a profile yet.

---

## Doctors — `/api/v1/doctor`

### `POST /api/v1/doctor/apply`
Apply as a doctor. Requires a valid Supabase token — identity comes from the token,
not the body. Creates a `Profile` (role `DOCTOR`, `id = sub`) plus a `Doctor` row
with status `PENDING`. Not bookable until an admin verifies them.
- **Auth:** Bearer Supabase token
- **Body:** `{ name, specialization, licenseNumber, phone? }`
- **Returns:** `201` — `{ message, profile }` (status `PENDING`) · `409` if a profile
  already exists

### `GET /api/v1/doctor/:id`
Fetch a single doctor's public details by doctor profile id. Includes the linked
`profile`.
- **Auth:** Public
- **Params:** `id` — doctor profile id (`doctors.id`)
- **Returns:** `200` — `{ doctor }` · `404` if not found

---

## Admin — `/api/v1/admin`

### `GET /api/v1/admin/doctors`
List doctor applications, filtered by status. Defaults to `PENDING`.
- **Auth:** Bearer Supabase token — `ADMIN` only
- **Query:** `?status=PENDING | VERIFIED | REJECTED`
- **Returns:** `200` — `{ doctors }`

### `PATCH /api/v1/admin/doctors/:id/verify`
Approve or reject a doctor application. Sets `status`, and records `verifiedById`
(the admin's profile id) and `verifiedAt`.
- **Auth:** Bearer Supabase token — `ADMIN` only
- **Params:** `id` — doctor profile id (`doctors.id`)
- **Body:** `{ status: "VERIFIED" | "REJECTED" }`
- **Returns:** `200` — `{ message, doctor }`

### `POST /api/v1/admin/admins`
Create a new admin. Uses the Supabase **service-role** admin client to create the
auth user (email pre-confirmed), then creates a matching `Profile` (role `ADMIN`,
`id =` the new auth user's id).
- **Auth:** Bearer Supabase token — `ADMIN` only
- **Body:** `{ email, password, name, phone? }`
- **Returns:** `201` — `{ message, profile }`

---

## Appointments — `/api/v1/appointment`

### `POST /api/v1/appointment`
Book an appointment with a verified doctor. The patient identity is taken from the
token, not the body. Rejects unverified doctors and past dates.
- **Auth:** Bearer Supabase token — `PATIENT` only
- **Body:** `{ doctorId, mode: "ONLINE" | "HOME_VISIT", scheduledAt, notes? }`
- **Returns:** `200` — `{ message, appointment }`

### `GET /api/v1/appointment`
List the caller's own appointments. A patient sees their bookings, a doctor sees
appointments booked with them, an admin sees all.
- **Auth:** Bearer Supabase token (any role)
- **Returns:** `200` — `{ appointments }`

### `GET /api/v1/appointment/:id`
Get a single appointment. Only a participant (the patient or the doctor on it) or an
admin may view it.
- **Auth:** Bearer Supabase token — participant or `ADMIN`
- **Params:** `id` — appointment id
- **Returns:** `200` — `{ appointment }` · `403` if not a participant · `404` if not found

### `PATCH /api/v1/appointment/:id/status`
Update an appointment's status. Only the doctor on the appointment or an admin can
change it.
- **Auth:** Bearer Supabase token — owning `DOCTOR` or `ADMIN`
- **Params:** `id` — appointment id
- **Body:** `{ status: "CONFIRMED" | "COMPLETED" | "CANCELLED" }`
- **Returns:** `200` — `{ message, appointment }`

---

## Notes
- **Identity model:** `profiles.id == auth.users.id == token.sub`. The backend never
  mints tokens or hashes passwords anymore.
- **Two id types:** `:id` in a URL is always a resource's own id (`doctors.id`,
  `appointments.id`). The token's `sub` maps to `profiles.id`.
- **Removed:** `POST /auth/register-patient` and `POST /auth/login` (now handled by
  Supabase on the frontend).
- **Pending / not yet built:** verified-doctor list (`GET /doctor`), payments.
