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

> 🧪 To get a token and run these endpoints in Postman, see [TESTING.md](./TESTING.md).

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

### `GET /api/v1/doctor/:id/slots`
List a doctor's **available** (unbooked, future) 1-hour slots. Patients pick from
these to book.
- **Auth:** Public
- **Returns:** `200` — `{ slots }`

### `GET /api/v1/doctor/me/slots`
List the signed-in doctor's own upcoming slots (booked and free).
- **Auth:** Bearer Supabase token — `DOCTOR` only
- **Returns:** `200` — `{ slots }`

### `POST /api/v1/doctor/me/slots`
Publish one or more 1-hour slots. Each start time must be **on the hour** and fall
within the **next 3 days (today excluded)**. Duplicates are skipped.
- **Auth:** Bearer Supabase token — **VERIFIED** `DOCTOR` only
- **Body:** `{ slots: string[] }` (ISO start times) or `{ startsAt }`
- **Returns:** `201` — `{ message, slots }` · `403` if not verified

### `DELETE /api/v1/doctor/me/slots/:id`
Remove one of the doctor's own slots. Only allowed if the slot is not yet booked.
- **Auth:** Bearer Supabase token — `DOCTOR` only
- **Returns:** `200` — `{ message }` · `409` if the slot is booked

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
Start a booking against an **available slot**. Atomically reserves the slot, creates
a `PENDING` appointment + `PENDING` payment, and opens a **Razorpay order**. The
appointment is only confirmed once payment is verified. The doctor must have a
consultation fee set.
- **Auth:** Bearer Supabase token — `PATIENT` only
- **Body:** `{ slotId, mode: "ONLINE" | "HOME_VISIT", notes? }`
- **Returns:** `201` — `{ message, appointment, payment: { orderId, amount, currency, keyId }, invoice }`
  · `409` if the slot was just taken · `503` if Razorpay is not configured
- **`invoice`** itemizes the charge (rupees): `{ consultationFee, gatewayFeePercent (2),
  gatewayFee, gstPercent (18), gst, total, totalPaise }`. The doctor's consultation
  fee is GST-exempt (healthcare); the 2% gateway fee + 18% GST-on-that-fee are added,
  and `amount`/`totalPaise` (what Razorpay charges) = the invoice total.

### `POST /api/v1/appointment/payment/webhook`
**Public** Razorpay webhook receiver (server-to-server; no auth). Verifies the
`X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` over the **raw** body, and
on `payment.captured` idempotently confirms the matching appointment (found by the
payment's `gatewayOrderId`). Backstop for when the browser callback never fires.
- **Auth:** none (signature-verified). Register this URL in the Razorpay Dashboard.
- **Returns:** `200` (acknowledged) · `400` invalid signature

### `POST /api/v1/appointment/:id/payment/verify`
Verify the Razorpay payment for an appointment. A valid signature marks the payment
`VERIFIED` and auto-**confirms** the appointment (slot stays locked). An invalid
signature marks the payment `FAILED` and frees the slot.
- **Auth:** Bearer Supabase token — owning `PATIENT` only
- **Body:** `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
- **Returns:** `200` — `{ message, appointment }` · `400` if verification fails

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
Update an appointment's status, enforcing the workflow:
- `CONFIRMED` is **automatic** on payment success — it cannot be set here (`400`).
- `COMPLETED` — **only the owning `DOCTOR`**, and only from `CONFIRMED`.
- `CANCELLED` — **`ADMIN` only**. Frees the slot and marks a paid consultation `REFUNDED`.
- **Auth:** Bearer Supabase token — owning `DOCTOR` (complete) or `ADMIN` (cancel)
- **Body:** `{ status: "COMPLETED" | "CANCELLED" }`
- **Returns:** `200` — `{ message, appointment }` · `403` wrong role · `409` invalid transition

---

## Notes
- **Identity model:** `profiles.id == auth.users.id == token.sub`. The backend never
  mints tokens or hashes passwords anymore.
- **Two id types:** `:id` in a URL is always a resource's own id (`doctors.id`,
  `appointments.id`). The token's `sub` maps to `profiles.id`.
- **Removed:** `POST /auth/register-patient` and `POST /auth/login` (now handled by
  Supabase on the frontend).
- **`GET /api/v1/doctor`** — public list of bookable (VERIFIED) doctors, each with
  `profile` (name/email/phone). Patients pick from this to book.
- **Booking + payments:** patients book from a doctor's published 1-hour slots; the
  slot is reserved, paid via **Razorpay**, and the appointment auto-confirms on a
  verified payment. Requires `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (see `.env.example`).
- **Status lifecycle:** `PENDING` → `CONFIRMED` (on payment) → `COMPLETED` (doctor) ·
  `CANCELLED` (admin) from any non-final state.
