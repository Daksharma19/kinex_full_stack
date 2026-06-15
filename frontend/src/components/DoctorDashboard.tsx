import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  listMyAppointments,
  updateAppointmentStatus,
  updateDoctorProfile,
  uploadDoctorPhoto,
  listMySlots,
  createMySlots,
  deleteMySlot,
  type Appointment,
  type TimeSlot,
} from "../lib/api";
import { isValidPhone, sanitizePhone, sanitizeText } from "../lib/validation";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import StatusBadge from "./StatusBadge";
import Loader from "./Loader";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.readAsDataURL(file);
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Build a maps link for a home visit: prefer exact coordinates (opens the pin in
// the device's default maps app), otherwise fall back to a text address search.
function mapsUrl(appt: Appointment): string | null {
  const { latitude, longitude, address } = appt.patient;
  if (typeof latitude === "number" && typeof longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

// For HOME_VISIT appointments: show the address + a button to open the location
// in the doctor's default maps application.
function HomeVisitLocation({ appt }: { appt: Appointment }) {
  if (appt.mode !== "HOME_VISIT") return null;
  const { address } = appt.patient;
  const url = mapsUrl(appt);
  if (!address && !url) return null;
  return (
    <div className="mt-2 flex flex-col gap-1 rounded-lg bg-surface-container-low px-3 py-2">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-base text-primary">home_pin</span>
        <span className="text-xs text-on-surface-variant break-words">{address || "Location pinned"}</span>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-sm">directions</span>
          Open in Maps
        </a>
      )}
    </div>
  );
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Doctor console. Recreates the Kinex doctor-dashboard design (verification
 * banner, metric cards, today's queue, upcoming appointments, clinical profile)
 * but every number and row comes from the real /appointment data — no mock
 * stats. Wires GET /appointment and PATCH /appointment/:id/status.
 */
export default function DoctorDashboard() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const doctor = (profile as { doctor?: { status: string; specialization: string; licenseNumber: string; consultationFee: number | null } } | null)?.doctor;
  const doctorStatus = doctor?.status;
  const photoUrl = (profile as { photoUrl?: string | null } | null)?.photoUrl ?? null;
  const phone = (profile as { phone?: string | null } | null)?.phone ?? "";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // Availability (time slots).
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);

  // Profile editing + photo upload state.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", specialization: "", consultationFee: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  function startEdit() {
    setForm({
      name: profile?.name || "",
      phone: phone || "",
      specialization: doctor?.specialization || "",
      consultationFee:
        doctor?.consultationFee != null ? String(doctor.consultationFee) : "",
    });
    setProfileError(null);
    setEditing(true);
  }

  async function saveProfile() {
    if (!sanitizeText(form.name)) {
      setProfileError("Name cannot be empty.");
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      setProfileError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      const fee = form.consultationFee.trim();
      await updateDoctorProfile({
        name: sanitizeText(form.name),
        phone: form.phone,
        specialization: form.specialization,
        consultationFee: fee === "" ? null : Number(fee),
      });
      await refreshProfile();
      setEditing(false);
      toast.success("Profile saved");
    } catch (err) {
      const msg = (err as Error).message;
      setProfileError(msg);
      toast.error(msg || "Could not save your profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setProfileError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      await uploadDoctorPhoto(dataUrl);
      await refreshProfile();
      toast.success("Photo updated");
    } catch (err) {
      toast.error((err as Error).message || "Could not upload the photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const isVerified = doctorStatus === "VERIFIED";

  const loadSlots = useCallback(async () => {
    try {
      const { slots } = await listMySlots();
      setSlots(slots);
    } catch {
      /* non-fatal — availability is secondary to the queue */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { appointments } = await listMyAppointments();
      setAppointments(appointments);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isVerified) loadSlots();
  }, [isVerified, loadSlots]);

  // Toggle a 1-hour slot at a given start time: create it if absent, delete it
  // if present and unbooked. Booked slots are locked.
  async function toggleSlot(startsAt: Date) {
    const iso = startsAt.toISOString();
    const existing = slots.find((s) => new Date(s.startsAt).getTime() === startsAt.getTime());
    setSlotBusy(iso);
    try {
      if (existing) {
        if (existing.isBooked) {
          toast.error("That slot is already booked");
          return;
        }
        await deleteMySlot(existing.id);
        toast.success("Slot removed");
      } else {
        await createMySlots([iso]);
        toast.success("Slot added");
      }
      await loadSlots();
    } catch (err) {
      toast.error((err as Error).message || "Could not update availability");
    } finally {
      setSlotBusy(null);
    }
  }

  async function setStatus(id: string, status: "COMPLETED" | "CANCELLED") {
    setActingId(id);
    setError(null);
    try {
      await updateAppointmentStatus(id, status);
      await load();
      toast.success(`Appointment ${status.toLowerCase()}`);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg || "Could not update the appointment");
    } finally {
      setActingId(null);
    }
  }

  const { today, upcoming, stats } = useMemo(() => {
    const now = new Date();
    const sorted = [...appointments].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    const today = sorted.filter((a) => isSameDay(new Date(a.scheduledAt), now));
    const upcoming = sorted.filter(
      (a) => new Date(a.scheduledAt) > now && !isSameDay(new Date(a.scheduledAt), now)
    );
    // Payments collected = appointments with a VERIFIED (paid) payment. Revenue
    // counts only the doctor's consultation earning (gateway fee + GST go to the
    // gateway/govt, not the doctor); fall back to total for legacy rows.
    const paid = appointments.filter((a) => a.payment?.status === "VERIFIED");
    const stats = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
      paymentsCount: paid.length,
      revenue: paid.reduce(
        (sum, a) => sum + (a.payment?.consultation ?? a.payment?.amount ?? 0),
        0
      ),
    };
    return { today, upcoming, stats };
  }, [appointments]);

  return (
    <div className="flex-1 w-full bg-background px-6 md:px-10 py-10 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Welcome{profile?.name ? `, Dr. ${profile.name}` : ""}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {doctor?.specialization || "Clinical dashboard"}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-bold text-primary px-4 py-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Verification banner */}
      {doctorStatus && doctorStatus !== "VERIFIED" && (
        <div className="p-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl flex items-center gap-3 shadow-sm border-l-4 border-tertiary-container">
          <span className="material-symbols-outlined text-tertiary-container">warning</span>
          <p className="font-medium">
            Your application is <strong>{doctorStatus}</strong>. You can receive
            appointments once an admin verifies your credentials.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      {/* Metric cards (bento) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricCard icon="event" iconClass="text-primary" label="Total Appointments" value={stats.total} />
        <MetricCard icon="pending_actions" iconClass="text-tertiary" label="Awaiting Confirmation" value={stats.pending} />
        <MetricCard icon="task_alt" iconClass="text-secondary" label="Completed" value={stats.completed} />
        <MetricCard
          icon="payments"
          iconClass="text-primary"
          label="Consultation Earnings"
          value={`₹${stats.revenue.toLocaleString("en-IN")}`}
          sub={`${stats.paymentsCount} payment${stats.paymentsCount === 1 ? "" : "s"}`}
        />
      </div>

      {/* Availability — open 1-hour slots for the next 3 days (today excluded) */}
      {isVerified && (
        <AvailabilityManager slots={slots} busy={slotBusy} onToggle={toggleSlot} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: queue + upcoming */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's queue */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">groups</span>
                Today's Patient Queue
              </h2>
              <span className="bg-primary-fixed text-on-primary-fixed text-xs font-bold px-3 py-1 rounded-full">
                {today.length} today
              </span>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
              {loading ? (
                <Loader label="Loading appointments…" size={72} />
              ) : today.length === 0 ? (
                <p className="text-sm text-on-surface-variant p-6">No appointments scheduled today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low text-xs font-bold text-on-surface-variant uppercase tracking-tight">
                      <tr>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Patient</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {today.map((a) => (
                        <tr key={a.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-6 py-5 text-sm font-semibold text-primary whitespace-nowrap">
                            {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container text-xs font-bold">
                                {initials(a.patient.profile.name)}
                              </div>
                              <div>
                                <span className="font-medium">{a.patient.profile.name}</span>
                                <HomeVisitLocation appt={a} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5"><StatusBadge status={a.status} /></td>
                          <td className="px-6 py-5">
                            <RowActions appt={a} busy={actingId === a.id} onSet={setStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Upcoming */}
          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">event_available</span>
              Future Appointments
            </h2>
            <div className="space-y-4">
              {upcoming.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No future appointments.</p>
              ) : (
                upcoming.map((a) => {
                  const d = new Date(a.scheduledAt);
                  return (
                    <div
                      key={a.id}
                      className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-surface-container-low rounded-xl flex flex-col items-center justify-center text-primary font-black">
                          <span className="text-[10px] uppercase">
                            {d.toLocaleString([], { month: "short" })}
                          </span>
                          <span>{d.getDate()}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface">{a.patient.profile.name}</h4>
                          <p className="text-sm text-on-surface-variant">
                            {d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                            {" · "}
                            {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {a.notes ? ` · “${a.notes}”` : ""}
                          </p>
                          <HomeVisitLocation appt={a} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-bold text-primary bg-secondary-container px-3 py-1.5 rounded-full">
                          <span className="material-symbols-outlined text-sm">
                            {a.mode === "ONLINE" ? "videocam" : "location_on"}
                          </span>
                          {a.mode === "ONLINE" ? "Telehealth" : "In-person"}
                        </span>
                        <StatusBadge status={a.status} />
                        <RowActions appt={a} busy={actingId === a.id} onSet={setStatus} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right: clinical profile */}
        <div className="space-y-8">
          <section className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface">Clinical Profile</h2>
              {!editing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-base">edit</span> Edit
                </button>
              )}
            </div>

            {/* Avatar + photo upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-28 h-28 rounded-3xl object-cover ring-4 ring-background shadow-lg"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-3xl bg-primary-container text-on-primary flex items-center justify-center text-3xl font-black ring-4 ring-background shadow-lg">
                    {profile?.name ? initials(profile.name) : "DR"}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-2 rounded-xl shadow-lg active:scale-90 transition-transform disabled:opacity-50"
                  title="Change photo"
                >
                  <span className="material-symbols-outlined text-sm">
                    {uploadingPhoto ? "hourglass_top" : "photo_camera"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoSelected}
                />
              </div>
              <p className="mt-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {uploadingPhoto ? "Uploading…" : "Clinical Identity"}
              </p>
            </div>

            {profileError && <p className="text-sm text-error mb-4">{profileError}</p>}

            {editing ? (
              <div className="space-y-4">
                <EditField label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
                <EditField
                  label="Phone"
                  value={form.phone}
                  prefix="+91"
                  placeholder="98765 43210"
                  onChange={(v) => setForm((f) => ({ ...f, phone: sanitizePhone(v) }))}
                />
                <EditField
                  label="Specialization"
                  value={form.specialization}
                  onChange={(v) => setForm((f) => ({ ...f, specialization: v }))}
                />
                <EditField
                  label="Consultation Fee (₹)"
                  value={form.consultationFee}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, consultationFee: v.replace(/[^0-9]/g, "") }))
                  }
                />
                <Field label="License Number" value={doctor?.licenseNumber || "—"} />
                <Field label="Email" value={profile?.email || "—"} />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="flex-1 bg-primary-container text-on-primary py-2.5 rounded-xl font-bold hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingProfile ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    disabled={savingProfile}
                    className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Full Name" value={profile?.name ? `Dr. ${profile.name}` : "—"} />
                <Field label="Specialization" value={doctor?.specialization || "—"} />
                <Field
                  label="Consultation Fee"
                  value={doctor?.consultationFee != null ? `₹${doctor.consultationFee}` : "—"}
                />
                <Field label="Phone" value={phone || "—"} />
                <Field label="License Number" value={doctor?.licenseNumber || "—"} />
                <Field label="Email" value={profile?.email || "—"} />
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Verification
                  </p>
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                      doctorStatus === "VERIFIED"
                        ? "bg-green-100 text-green-800"
                        : doctorStatus === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {doctorStatus || "—"}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// Bookable hours offered each day (start times). Slots are 1 hour; 09:00–17:00
// means the last slot starts at 17:00 and ends at 18:00.
const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

// The 3 calendar days a doctor may open slots for: tomorrow, +2, +3 (today is
// intentionally excluded so patients always book at least a day ahead).
function upcomingDays(): Date[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return [1, 2, 3].map((offset) => {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return d;
  });
}

function AvailabilityManager({
  slots,
  busy,
  onToggle,
}: {
  slots: TimeSlot[];
  busy: string | null;
  onToggle: (startsAt: Date) => void;
}) {
  const days = upcomingDays();
  const now = Date.now();
  // Index existing slots by their exact start-time for quick lookup.
  const byTime = new Map(slots.map((s) => [new Date(s.startsAt).getTime(), s]));

  return (
    <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">schedule</span>
          Manage Availability
        </h2>
      </div>
      <p className="text-sm text-on-surface-variant mb-5">
        Tap an hour to open or close a 1-hour slot for the next 3 days. Booked
        slots are locked.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {days.map((day) => (
          <div key={day.toISOString()} className="rounded-xl border border-outline-variant/10 p-4">
            <p className="text-xs font-bold text-on-surface uppercase tracking-wide mb-3">
              {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="flex flex-wrap gap-2">
              {SLOT_HOURS.map((h) => {
                const start = new Date(day);
                start.setHours(h, 0, 0, 0);
                const existing = byTime.get(start.getTime());
                const past = start.getTime() <= now;
                const isBusy = busy === start.toISOString();
                const booked = existing?.isBooked;
                const open = Boolean(existing) && !booked;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={past || booked || isBusy}
                    onClick={() => onToggle(start)}
                    title={booked ? "Booked" : open ? "Open — tap to remove" : "Tap to open"}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 ${
                      booked
                        ? "bg-secondary-container text-primary border-secondary-container cursor-not-allowed"
                        : open
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-primary"
                    }`}
                  >
                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {booked && <span className="material-symbols-outlined text-[14px] align-middle ml-1">lock</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col items-center text-center">
      <span className={`material-symbols-outlined text-3xl mb-2 ${iconClass}`}>{icon}</span>
      <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">{label}</h3>
      <p className="text-3xl font-black text-on-surface">{value}</p>
      {sub && <p className="text-xs font-bold text-primary mt-1">{sub}</p>}
    </div>
  );
}

function RowActions({
  appt,
  busy,
  onSet,
}: {
  appt: Appointment;
  busy: boolean;
  onSet: (id: string, status: "COMPLETED" | "CANCELLED") => void;
}) {
  // Pending appointments are awaiting the patient's payment; doctors act only
  // once an appointment is CONFIRMED. Completing is the doctor's only action —
  // cancellation is admin-only. For ONLINE consultations, also offer a "Join"
  // button that opens the doctor's host video room.
  if (appt.status === "CONFIRMED") {
    return (
      <div className="flex items-center gap-3">
        {appt.mode === "ONLINE" && appt.hostRoomUrl && (
          <a
            href={appt.hostRoomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-primary-container text-on-primary px-3 py-1.5 rounded-lg font-bold text-xs hover:shadow-md transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">video_call</span>
            Join
          </a>
        )}
        <button
          onClick={() => onSet(appt.id, "COMPLETED")}
          disabled={busy}
          className="text-primary text-sm font-bold hover:underline disabled:opacity-50"
        >
          Mark completed
        </button>
      </div>
    );
  }
  if (appt.status === "PENDING") {
    return <span className="text-xs text-on-surface-variant">Awaiting payment</span>;
  }
  return <span className="text-xs text-on-surface-variant">—</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="w-full bg-surface-container-low rounded-xl px-3 py-2 text-on-surface font-medium text-sm break-words">
        {value}
      </p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-stretch">
        {prefix && (
          <span className="inline-flex items-center rounded-l-xl bg-surface-container px-3 text-sm text-on-surface-variant select-none">
            {prefix}
          </span>
        )}
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 text-on-surface font-medium text-sm px-3 py-2 ${
            prefix ? "rounded-r-xl" : "rounded-xl"
          }`}
        />
      </div>
    </div>
  );
}
