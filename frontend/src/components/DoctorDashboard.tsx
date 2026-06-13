import { useEffect, useState, useCallback } from "react";
import {
  listMyAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";

/**
 * Doctor view: shows the appointments booked with this doctor and lets them
 * move each through the workflow. Only VERIFIED doctors can receive bookings;
 * PENDING/REJECTED doctors see their verification state instead.
 * Wires GET /appointment and PATCH /appointment/:id/status.
 */
export default function DoctorDashboard() {
  const { profile } = useAuth();
  const doctorStatus = (profile as { doctor?: { status: string } } | null)?.doctor?.status;

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

  return (
    <div className="flex-1 w-full bg-background px-6 py-10 max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Welcome{profile?.name ? `, Dr. ${profile.name}` : ""}
          </h1>
          {doctorStatus && doctorStatus !== "VERIFIED" && (
            <p className="text-sm text-amber-700 mt-1">
              Your application is <strong>{doctorStatus}</strong>. You can receive
              appointments once an admin verifies you.
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Appointments with you</h2>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading…</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No appointments yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((a) => {
              const busy = actingId === a.id;
              return (
                <div
                  key={a.id}
                  className="rounded-xl border p-4 bg-card flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{a.patient.profile.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(a.scheduledAt).toLocaleString()} ·{" "}
                      {a.mode === "ONLINE" ? "Online" : "Home visit"}
                    </p>
                    {a.notes && (
                      <p className="text-xs text-on-surface-variant mt-1">“{a.notes}”</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={a.status} />
                    <div className="flex gap-2">
                      {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                        <>
                          {a.status === "PENDING" && (
                            <Button onClick={() => setStatus(a.id, "CONFIRMED")} disabled={busy}>
                              Confirm
                            </Button>
                          )}
                          {a.status === "CONFIRMED" && (
                            <Button onClick={() => setStatus(a.id, "COMPLETED")} disabled={busy}>
                              Complete
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            onClick={() => setStatus(a.id, "CANCELLED")}
                            disabled={busy}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
