import { config } from "./config";
import { supabase } from "./supabase";

/**
 * Thin fetch wrapper for the backend API.
 *
 * - Prefixes every path with the configured API base URL (so the frontend has a
 *   single source of truth for where the backend lives).
 * - Pulls the current Supabase access token from the shared client and attaches
 *   it as `Authorization: Bearer <token>` — exactly what the backend's
 *   requireAuth middleware expects (it verifies via supabase.auth.getClaims()).
 * - Throws an Error carrying the HTTP status + server message on non-2xx.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const res = await fetch(`${config.apiBaseUrl}${path}`, { ...options, headers });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = body?.message || `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body as T;
}

/** Shape of the backend's GET /auth/me response. */
export interface MeResponse {
  profile: {
    id: string;
    email: string;
    name: string;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
    phone?: string | null;
    photoUrl?: string | null;
    patient?: {
      dateOfBirth?: string | null;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
    doctor?: unknown;
  } | null;
}

/** Update the signed-in user's own profile (any role). */
export function updateMyProfile(input: {
  name?: string;
  phone?: string;
  dateOfBirth?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  return apiFetch<{ message: string }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Upload/replace the signed-in user's own photo (base64 data URL). */
export function uploadMyPhoto(dataUrl: string) {
  return apiFetch<{ message: string }>("/auth/me/photo", {
    method: "POST",
    body: JSON.stringify({ image: dataUrl }),
  });
}

/** DOCTOR-only: update own profile (name/phone/specialization/consultation fee). */
export function updateDoctorProfile(input: {
  name?: string;
  phone?: string;
  specialization?: string;
  consultationFee?: number | null;
}) {
  return apiFetch<{ message: string }>("/doctor/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** DOCTOR-only: upload/replace own profile photo (base64 data URL). */
export function uploadDoctorPhoto(dataUrl: string) {
  return apiFetch<{ message: string }>("/doctor/me/photo", {
    method: "POST",
    body: JSON.stringify({ image: dataUrl }),
  });
}

/**
 * Which sign-in providers an email is registered with (e.g. ["google"]). Called
 * by the login page only after a failed password attempt, to tell a Google-signup
 * user to use "Continue with Google". Returns [] for unknown emails.
 */
export function getSignInMethods(email: string) {
  return apiFetch<{ providers: string[] }>("/auth/signin-methods", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Load the authenticated user's app profile (null if not onboarded yet). */
export async function getMe(): Promise<MeResponse> {
  try {
    return await apiFetch<MeResponse>("/auth/me");
  } catch (err) {
    // Treat "profile not found" as a not-yet-onboarded user rather than an error,
    // so callers can branch on profile === null uniformly.
    if ((err as { status?: number }).status === 404) return { profile: null };
    throw err;
  }
}

/**
 * localStorage key used to carry doctor-apply form details across the
 * email-confirmation / Google OAuth redirect. Set before signup; consumed (and
 * cleared) once the user comes back authenticated. See AuthContext +
 * DoctorApplyPage.
 *
 * NOTE: localStorage (not sessionStorage) is required because the email
 * confirmation link opens in a NEW tab/window, which does not inherit
 * sessionStorage — using sessionStorage caused doctors to be provisioned as
 * patients when they returned via the email link.
 */
export const DOCTOR_APPLY_INTENT_KEY = "doctorApplyIntent";

/** Fields a doctor provides when applying. */
export interface DoctorDetails {
  name: string;
  specialization: string;
  licenseNumber: string;
  phone?: string;
}

/**
 * Apply as a doctor for an ALREADY-authenticated user (e.g. after email
 * confirmation or Google login).
 * Identity comes from the token; only the doctor details are sent.
 */
export function applyDoctor(input: DoctorDetails) {
  return apiFetch("/doctor/apply", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- Admin: doctor verification ----

export type DoctorStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface DoctorApplication {
  id: string;
  specialization: string;
  licenseNumber: string;
  status: DoctorStatus;
  verifiedAt: string | null;
  createdAt: string;
  profile: { name: string; email: string; phone: string | null };
}

/** ADMIN-only: list doctor applications by status (defaults to PENDING). */
export function adminListDoctors(status: DoctorStatus = "PENDING") {
  return apiFetch<{ doctors: DoctorApplication[] }>(
    `/admin/doctors?status=${status}`
  );
}

/** ADMIN-only: approve or reject a doctor application. */
export function adminVerifyDoctor(doctorId: string, status: "VERIFIED" | "REJECTED") {
  return apiFetch<{ message: string; doctor: DoctorApplication }>(
    `/admin/doctors/${doctorId}/verify`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  phone: string | null;
  createdAt: string;
}

/** ADMIN-only: list all registered users (to pick one to promote). */
export function adminListUsers() {
  return apiFetch<{ users: UserRow[] }>("/admin/users");
}

/** One appointment row in a doctor's admin detail view. Amounts in rupees. */
export interface DoctorDetailAppointment {
  id: string;
  mode: AppointmentMode;
  scheduledAt: string;
  status: AppointmentStatus;
  patient: { name: string; email: string; phone: string | null };
  payment: { status: PaymentStatus; amount: number; consultation: number | null } | null;
}

/** Full admin detail view for a single doctor. */
export interface AdminDoctorDetails {
  doctor: {
    id: string;
    specialization: string;
    licenseNumber: string;
    consultationFee: number | null;
    status: DoctorStatus;
    verifiedAt: string | null;
    createdAt: string;
    profile: {
      name: string;
      email: string;
      phone: string | null;
      photoUrl: string | null;
      createdAt: string;
    };
  };
  stats: {
    totalAppointments: number;
    completed: number;
    confirmed: number;
    cancelled: number;
    /** Net consultation earnings (rupees) from VERIFIED payments. */
    totalEarned: number;
  };
  appointments: DoctorDetailAppointment[];
}

/**
 * ADMIN-only: full detail for a doctor — credentials, appointment activity and
 * money earned — keyed by the doctor's profile (user) id.
 */
export function adminGetDoctorDetails(profileId: string) {
  return apiFetch<AdminDoctorDetails>(`/admin/users/${profileId}/doctor-details`);
}

/** ADMIN-only: promote an existing registered user to ADMIN. */
export function adminPromoteToAdmin(userId: string) {
  return apiFetch<{ message: string; profile: UserRow }>(
    `/admin/users/${userId}/promote`,
    { method: "PATCH" }
  );
}

/**
 * ADMIN-only: permanently delete a user — all DB records plus the Supabase auth
 * account. Irreversible.
 */
export function adminDeleteUser(userId: string) {
  return apiFetch<{ message: string }>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

// ---- Doctors (public) + appointments ----

export interface VerifiedDoctor {
  id: string;
  specialization: string;
  licenseNumber: string;
  consultationFee: number | null;
  profile: { name: string; email: string; phone: string | null };
}

/** Public: list bookable (VERIFIED) doctors. */
export function listVerifiedDoctors() {
  return apiFetch<{ doctors: VerifiedDoctor[] }>("/doctor");
}

export interface TimeSlot {
  id: string;
  doctorId: string;
  startsAt: string;
  isBooked: boolean;
}

/** Public: a doctor's available (unbooked, future) slots. */
export function listDoctorSlots(doctorId: string) {
  return apiFetch<{ slots: TimeSlot[] }>(`/doctor/${doctorId}/slots`);
}

/** DOCTOR-only: list own upcoming slots (booked and free). */
export function listMySlots() {
  return apiFetch<{ slots: TimeSlot[] }>("/doctor/me/slots");
}

/** DOCTOR-only: publish one or more 1-hour slots (ISO start times). */
export function createMySlots(slots: string[]) {
  return apiFetch<{ message: string; slots: TimeSlot[] }>("/doctor/me/slots", {
    method: "POST",
    body: JSON.stringify({ slots }),
  });
}

/** DOCTOR-only: remove an unbooked slot. */
export function deleteMySlot(slotId: string) {
  return apiFetch<{ message: string }>(`/doctor/me/slots/${slotId}`, {
    method: "DELETE",
  });
}

export type AppointmentMode = "ONLINE" | "HOME_VISIT";
export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "VERIFIED" | "FAILED" | "REFUNDED";

export interface Appointment {
  id: string;
  mode: AppointmentMode;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string | null;
  patient: {
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    profile: { name: string; email: string; phone?: string | null };
  };
  doctor: { profile: { name: string; email: string } };
  // Amounts in rupees; null until a payment row exists. `amount` is the total
  // charged; `consultation` is the doctor's net earning (excludes gateway+GST).
  payment?: { status: PaymentStatus; amount: number; consultation: number | null } | null;
  // Video consultation links (ONLINE appointments, set once paid). The backend
  // scopes these by role: a patient receives roomUrl, a doctor hostRoomUrl.
  roomUrl?: string | null;
  hostRoomUrl?: string | null;
}

/** Razorpay order details returned when a booking is started. */
export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

/** Itemized invoice shown to the patient before they pay. Amounts in rupees. */
export interface PaymentInvoice {
  consultationFee: number;
  gatewayFeePercent: number;
  gatewayFee: number;
  gstPercent: number;
  gst: number;
  total: number;
  totalPaise: number;
}

/**
 * PATIENT-only: start a booking against an available slot. Creates a PENDING
 * appointment, returns a Razorpay order plus the itemized invoice to display
 * before the patient completes payment.
 */
export function bookAppointment(input: {
  slotId: string;
  mode: AppointmentMode;
  notes?: string;
}) {
  return apiFetch<{
    message: string;
    appointment: Appointment;
    payment: PaymentOrder;
    invoice: PaymentInvoice;
  }>("/appointment", { method: "POST", body: JSON.stringify(input) });
}

/**
 * PATIENT-only: release a pending (unpaid) booking — frees the slot. Call when
 * the patient closes the payment popup without paying.
 */
export function releaseAppointment(appointmentId: string) {
  return apiFetch<{ message: string }>(`/appointment/${appointmentId}/release`, {
    method: "DELETE",
  });
}

/** PATIENT-only: verify a Razorpay payment to auto-confirm the appointment. */
export function verifyAppointmentPayment(
  appointmentId: string,
  input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
) {
  return apiFetch<{ message: string; appointment: Appointment }>(
    `/appointment/${appointmentId}/payment/verify`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

/**
 * Join the video room for a confirmed online appointment. Lazily provisions the
 * room if needed and returns the caller's role-scoped join link (doctor → host,
 * patient → guest), both pointing at the same meeting.
 */
export function joinAppointment(appointmentId: string) {
  return apiFetch<{ joinUrl: string }>(`/appointment/${appointmentId}/join`, {
    method: "POST",
  });
}

/** List the caller's appointments (patient: their bookings, doctor: with them). */
export function listMyAppointments() {
  return apiFetch<{ appointments: Appointment[] }>("/appointment");
}

/**
 * Update an appointment's status. Only COMPLETED (doctor) or CANCELLED (admin);
 * CONFIRMED happens automatically on payment success.
 */
export function updateAppointmentStatus(
  id: string,
  status: "COMPLETED" | "CANCELLED"
) {
  return apiFetch<{ message: string; appointment: Appointment }>(
    `/appointment/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

/** TEMPORARY (ADMIN-only): hard-delete an appointment from the database. */
export function adminDeleteAppointment(id: string) {
  return apiFetch<{ message: string }>(`/appointment/${id}`, {
    method: "DELETE",
  });
}

/** Create the PATIENT profile for the current authenticated Supabase user. */
export function createPatientProfile(input: {
  name: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
}) {
  return apiFetch("/auth/profile", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
