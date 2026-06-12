# API Routes

Backend API reference for the appointment-booking service.

**Base URL:** `/api/v1`
**Auth header:** protected routes require `Authorization: Bearer <token>`
The token is returned by `/auth/login`, `/auth/register-patient`, and `/doctor/apply`.

### Roles
- `PATIENT` — books and views their own appointments
- `DOCTOR` — applies for verification, manages their own appointments
- `ADMIN` — verifies doctors, has full oversight

### Common status codes
- `200` OK · `201` Created · `400` Bad request (validation)
- `401` Not authenticated (missing/invalid token)
- `403` Forbidden (authenticated but wrong role / not a participant)
- `404` Not found · `409` Conflict (duplicate) · `500` Server error

---

## Auth — `/api/v1/auth`

### `POST /api/v1/auth/register-patient`
Register a new patient. Creates a `User` (role `PATIENT`) plus a linked `Patient` profile, and returns a JWT.
- **Auth:** Public
- **Body:** `{ name, email, password, address?, dateOfBirth? }`
- **Returns:** `201` — `{ message, token, user }`

### `POST /api/v1/auth/login`
Authenticate any user (patient, doctor, or admin) with email and password.
- **Auth:** Public
- **Body:** `{ email, password }`
- **Returns:** `200` — `{ message, token, user }`

### `GET /api/v1/auth/me`
Return the currently authenticated user's profile.
- **Auth:** Bearer token (any role)
- **Body:** none
- **Returns:** `200` — `{ user }`

---

## Doctors — `/api/v1/doctor`

### `POST /api/v1/doctor/apply`
Apply as a doctor. Creates a `User` (role `DOCTOR`) plus a `Doctor` profile with status `PENDING`, and returns a JWT. The doctor is not bookable until an admin verifies them.
- **Auth:** Public
- **Body:** `{ name, email, password, specialization, licenseNumber, phone? }`
- **Returns:** `201` — `{ message, token, user }` (status `PENDING`)

### `GET /api/v1/doctor/:id`
Fetch a single doctor's public details by doctor profile id.
- **Auth:** Public
- **Params:** `id` — doctor profile id (`doctors.id`)
- **Returns:** `200` — `{ doctor }` · `404` if not found

---

## Admin — `/api/v1/admin`

### `GET /api/v1/admin/doctors`
List doctor applications, filtered by status. Defaults to `PENDING`.
- **Auth:** Bearer token — `ADMIN` only
- **Query:** `?status=PENDING | VERIFIED | REJECTED`
- **Returns:** `200` — `{ doctors }`

### `PATCH /api/v1/admin/doctor/:id/verify`
Approve or reject a doctor application. Sets `status`, and records `verifiedById` (from the admin's token) and `verifiedAt`.
- **Auth:** Bearer token — `ADMIN` only
- **Params:** `id` — doctor profile id (`doctors.id`)
- **Body:** `{ status: "VERIFIED" | "REJECTED" }`
- **Returns:** `200` — `{ message, doctor }`

---

## Appointments — `/api/v1/appointment`

### `POST /api/v1/appointment`
Book an appointment with a verified doctor. The patient identity is taken from the token, not the body. Rejects unverified doctors and past dates.
- **Auth:** Bearer token — `PATIENT` only
- **Body:** `{ doctorId, mode: "ONLINE" | "HOME_VISIT", scheduledAt, notes? }`
- **Returns:** `201` — `{ message, appointment }`

### `GET /api/v1/appointment`
List the caller's own appointments. A patient sees their bookings, a doctor sees appointments booked with them, an admin sees all.
- **Auth:** Bearer token (any role)
- **Returns:** `200` — `{ appointments }`

### `GET /api/v1/appointment/:id`
Get a single appointment. Only a participant (the patient or the doctor on it) or an admin may view it.
- **Auth:** Bearer token — participant or `ADMIN`
- **Params:** `id` — appointment id
- **Returns:** `200` — `{ appointment }` · `403` if not a participant · `404` if not found

### `PATCH /api/v1/appointment/:id/status`
Update an appointment's status. Only the doctor on the appointment or an admin can change it.
- **Auth:** Bearer token — owning `DOCTOR` or `ADMIN`
- **Params:** `id` — appointment id
- **Body:** `{ status: "CONFIRMED" | "COMPLETED" | "CANCELLED" }`
- **Returns:** `200` — `{ message, appointment }`

---

## Notes
- **Path consistency:** the doctor resource is mounted as `/doctor` (singular) in your tested routes but written as `/doctors` in some notes. Pick one and keep the mount and these docs in sync.
- **Two id types:** `:id` in a URL is always a profile/resource's own id (`doctors.id`, `appointments.id`). The token carries the `users.id`, which is mapped to a profile internally via `userId`.
- **Pending / not yet built:** Google OAuth sign-in (`POST /auth/google`), verified-doctor list (`GET /doctor`), payments, and email OTP verification.
