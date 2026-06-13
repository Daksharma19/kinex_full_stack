import { useEffect, useState, useCallback, useMemo } from "react";
import {
  listMyAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "./StatusBadge";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
  const { profile } = useAuth();
  const doctor = (profile as { doctor?: { status: string; specialization: string; licenseNumber: string } } | null)?.doctor;
  const doctorStatus = doctor?.status;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

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

  async function setStatus(id: string, status: Exclude<AppointmentStatus, "PENDING">) {
    setActingId(id);
    setError(null);
    try {
      await updateAppointmentStatus(id, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
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
    const stats = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard icon="event" iconClass="text-primary" label="Total Appointments" value={stats.total} />
        <MetricCard icon="pending_actions" iconClass="text-tertiary" label="Awaiting Confirmation" value={stats.pending} />
        <MetricCard icon="task_alt" iconClass="text-secondary" label="Completed" value={stats.completed} />
      </div>

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
                <p className="text-sm text-on-surface-variant p-6">Loading…</p>
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
                              <span className="font-medium">{a.patient.profile.name}</span>
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
                            {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {a.notes ? ` · “${a.notes}”` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs font-bold text-primary bg-secondary-container px-3 py-1.5 rounded-full">
                          <span className="material-symbols-outlined text-sm">
                            {a.mode === "ONLINE" ? "videocam" : "location_on"}
                          </span>
                          {a.mode === "ONLINE" ? "Telehealth" : "In-person"}
                        </span>
                        <StatusBadge status={a.status} />
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
            <h2 className="text-xl font-bold text-on-surface mb-6">Clinical Profile</h2>
            <div className="flex flex-col items-center mb-6">
              <div className="w-28 h-28 rounded-3xl bg-primary-container text-on-primary flex items-center justify-center text-3xl font-black ring-4 ring-background shadow-lg">
                {profile?.name ? initials(profile.name) : "DR"}
              </div>
              <p className="mt-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Clinical Identity
              </p>
            </div>
            <div className="space-y-4">
              <Field label="Full Name" value={profile?.name ? `Dr. ${profile.name}` : "—"} />
              <Field label="Specialization" value={doctor?.specialization || "—"} />
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
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col items-center text-center">
      <span className={`material-symbols-outlined text-3xl mb-2 ${iconClass}`}>{icon}</span>
      <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">{label}</h3>
      <p className="text-3xl font-black text-on-surface">{value}</p>
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
  onSet: (id: string, status: Exclude<AppointmentStatus, "PENDING">) => void;
}) {
  if (appt.status === "COMPLETED" || appt.status === "CANCELLED") {
    return <span className="text-xs text-on-surface-variant">—</span>;
  }
  return (
    <div className="flex gap-3 whitespace-nowrap">
      {appt.status === "PENDING" && (
        <button
          onClick={() => onSet(appt.id, "CONFIRMED")}
          disabled={busy}
          className="text-primary text-sm font-bold hover:underline disabled:opacity-50"
        >
          Confirm
        </button>
      )}
      {appt.status === "CONFIRMED" && (
        <button
          onClick={() => onSet(appt.id, "COMPLETED")}
          disabled={busy}
          className="text-primary text-sm font-bold hover:underline disabled:opacity-50"
        >
          Complete
        </button>
      )}
      <button
        onClick={() => onSet(appt.id, "CANCELLED")}
        disabled={busy}
        className="text-error text-sm font-bold hover:underline disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
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
