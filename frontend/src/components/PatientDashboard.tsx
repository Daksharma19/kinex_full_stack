import { useEffect, useState, useCallback } from "react";
import {
  listVerifiedDoctors,
  listMyAppointments,
  bookAppointment,
  type VerifiedDoctor,
  type Appointment,
  type AppointmentMode,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "./StatusBadge";

/**
 * Patient view: browse verified doctors, book an appointment, and see your own
 * appointments. Wires GET /doctor, POST /appointment, GET /appointment.
 */
export default function PatientDashboard() {
  const { profile } = useAuth();
  const [doctors, setDoctors] = useState<VerifiedDoctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<VerifiedDoctor | null>(null);
  const [mode, setMode] = useState<AppointmentMode>("ONLINE");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    const { appointments } = await listMyAppointments();
    setAppointments(appointments);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ doctors }] = await Promise.all([
        listVerifiedDoctors(),
        loadAppointments(),
      ]);
      setDoctors(doctors);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loadAppointments]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openBooking(d: VerifiedDoctor) {
    setSelected(d);
    setMode("ONLINE");
    setScheduledAt("");
    setNotes("");
    setError(null);
  }

  async function confirmBooking() {
    if (!selected) return;
    if (!scheduledAt) {
      setError("Pick a date and time.");
      return;
    }
    setBooking(true);
    setError(null);
    try {
      await bookAppointment({
        doctorId: selected.id,
        mode,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes || undefined,
      });
      setSelected(null);
      await loadAppointments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="flex-1 w-full bg-background px-6 py-10 max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Welcome{profile?.name ? `, ${profile.name}` : ""}
          </h1>
          <p className="text-sm text-on-surface-variant">Book an appointment with a verified doctor.</p>
        </div>
        <Button variant="secondary" onClick={loadAll} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Available doctors */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Available doctors</h2>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading…</p>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No verified doctors available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map((d) => (
              <div key={d.id} className="rounded-xl border p-4 bg-card flex flex-col gap-2">
                <p className="font-medium">{d.profile.name}</p>
                <p className="text-sm text-on-surface-variant">{d.specialization}</p>
                <Button className="mt-2" onClick={() => openBooking(d)}>
                  Book
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking form */}
      {selected && (
        <section className="rounded-xl border p-6 bg-card flex flex-col gap-4 max-w-md">
          <h2 className="text-lg font-bold">
            Book with {selected.profile.name}
          </h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mode">Mode</Label>
            <select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as AppointmentMode)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
            >
              <option value="ONLINE">Online</option>
              <option value="HOME_VISIT">Home visit</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="when">Date &amp; time</Label>
            <Input
              id="when"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button onClick={confirmBooking} disabled={booking}>
              {booking ? "Booking…" : "Confirm booking"}
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={booking}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {/* My appointments */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">My appointments</h2>
        {appointments.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No appointments yet.</p>
        ) : (
          <div className="flex flex-col divide-y rounded-xl border bg-card">
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">Dr. {a.doctor.profile.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(a.scheduledAt).toLocaleString()} ·{" "}
                    {a.mode === "ONLINE" ? "Online" : "Home visit"}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
