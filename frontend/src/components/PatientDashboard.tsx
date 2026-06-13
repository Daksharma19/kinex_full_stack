import { useEffect, useState, useCallback, useRef } from "react";
import {
  listVerifiedDoctors,
  listMyAppointments,
  bookAppointment,
  updateMyProfile,
  uploadMyPhoto,
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.readAsDataURL(file);
  });
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/**
 * Patient dashboard styled after the Kinex mockup. Welcome header + booking,
 * real appointment-history table, and an editable profile snapshot with photo.
 * Wires GET /doctor, POST/GET /appointment, PATCH /auth/me, POST /auth/me/photo.
 * (Mock-only vitals / health-insights / task cards are intentionally omitted —
 * the backend has no such data.)
 */
export default function PatientDashboard() {
  const { profile, refreshProfile } = useAuth();
  const photoUrl = (profile as { photoUrl?: string | null } | null)?.photoUrl ?? null;
  const patient = (profile as { patient?: { dateOfBirth?: string | null; address?: string | null } | null } | null)?.patient;

  const [doctors, setDoctors] = useState<VerifiedDoctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking
  const [showBooking, setShowBooking] = useState(false);
  const [selected, setSelected] = useState<VerifiedDoctor | null>(null);
  const [mode, setMode] = useState<AppointmentMode>("ONLINE");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  // Profile snapshot
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", dateOfBirth: "", address: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    const { appointments } = await listMyAppointments();
    setAppointments(appointments);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ doctors }] = await Promise.all([listVerifiedDoctors(), loadAppointments()]);
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

  // Seed the profile form whenever the auth profile changes.
  useEffect(() => {
    setForm({
      name: profile?.name || "",
      phone: (profile as { phone?: string | null } | null)?.phone || "",
      dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "",
      address: patient?.address || "",
    });
  }, [profile, patient]);

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
      setShowBooking(false);
      await loadAppointments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBooking(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateMyProfile({
        name: form.name,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address || null,
      });
      await refreshProfile();
      setProfileMsg("Saved");
    } catch (err) {
      setProfileMsg((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setProfileMsg(null);
    try {
      await uploadMyPhoto(await fileToDataUrl(file));
      await refreshProfile();
    } catch (err) {
      setProfileMsg((err as Error).message);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex-1 w-full bg-background px-6 md:px-10 py-10 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Welcome header */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight">
            Hello{profile?.name ? `, ${profile.name.split(" ")[0]}!` : "!"}
          </h2>
          <p className="text-on-surface-variant mt-2 max-w-md">
            {appointments.length === 0
              ? "Book your first appointment with a verified doctor."
              : "Here's your health snapshot and appointment history."}
          </p>
        </div>
        <button
          onClick={() => setShowBooking((s) => !s)}
          className="group flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3.5 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-lg">
            {showBooking ? "close" : "add_circle"}
          </span>
          {showBooking ? "Close" : "Book New Appointment"}
        </button>
      </section>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: booking + history */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Booking panel */}
          {showBooking && (
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 space-y-6">
              <h3 className="text-xl font-bold text-on-surface">Available doctors</h3>
              {loading ? (
                <p className="text-sm text-on-surface-variant">Loading…</p>
              ) : doctors.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No verified doctors available yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {doctors.map((d) => (
                    <div key={d.id} className="rounded-xl border border-outline-variant/10 p-4 bg-surface-container-low flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {initials(d.profile.name)}
                      </div>
                      <p className="font-bold text-on-surface text-sm">{d.profile.name}</p>
                      <p className="text-xs text-on-surface-variant">{d.specialization}</p>
                      <Button className="mt-1" onClick={() => openBooking(d)}>Book</Button>
                    </div>
                  ))}
                </div>
              )}

              {selected && (
                <div className="rounded-xl border border-primary/20 p-6 bg-primary/5 flex flex-col gap-4 max-w-md">
                  <h4 className="font-bold text-on-surface">Book with {selected.profile.name}</h4>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="mode">Mode</Label>
                    <select
                      id="mode"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as AppointmentMode)}
                      className="border border-outline-variant/30 rounded-md h-9 px-3 text-sm bg-surface-container-lowest"
                    >
                      <option value="ONLINE">Online</option>
                      <option value="HOME_VISIT">Home visit</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="when">Date &amp; time</Label>
                    <Input id="when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={confirmBooking} disabled={booking}>
                      {booking ? "Booking…" : "Confirm booking"}
                    </Button>
                    <Button variant="secondary" onClick={() => setSelected(null)} disabled={booking}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Appointment history */}
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface">Appointment History</h3>
              <button onClick={loadAll} className="text-sm text-primary font-bold hover:underline">Refresh</button>
            </div>
            {loading ? (
              <p className="text-sm text-on-surface-variant">Loading…</p>
            ) : appointments.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No appointments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="pb-2 pl-4">Doctor</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right pr-4">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {appointments.map((a) => (
                      <tr key={a.id} className="group hover:bg-surface-container-low transition-colors">
                        <td className="py-4 pl-4 rounded-l-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {initials(a.doctor.profile.name)}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">Dr. {a.doctor.profile.name}</p>
                              <p className="text-[10px] text-on-surface-variant">{a.doctor.profile.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-on-surface-variant">
                          {new Date(a.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
                          <span className="block text-[10px]">
                            {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-4"><StatusBadge status={a.status} /></td>
                        <td className="py-4 text-right pr-4 rounded-r-xl">
                          <span
                            className="material-symbols-outlined text-primary-container align-middle"
                            title={a.mode === "ONLINE" ? "Online consultation" : "Home visit"}
                          >
                            {a.mode === "ONLINE" ? "video_chat" : "home_health"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: profile snapshot */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
            <h3 className="text-xl font-bold text-on-surface mb-6">Profile Snapshot</h3>
            <div className="flex flex-col items-center mb-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="relative group rounded-full"
                title="Change photo"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-background shadow-inner bg-primary-container text-on-primary flex items-center justify-center text-2xl font-black">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials(profile?.name || "PT")
                  )}
                </div>
                <div className="absolute inset-0 bg-primary/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </div>
              </button>
              <p className="text-[10px] font-bold text-primary mt-3 uppercase tracking-widest">
                {uploadingPhoto ? "Uploading…" : "Change Photo"}
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoSelected} />
            </div>

            <div className="space-y-4">
              <SnapField label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <SnapField label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
              <div className="grid grid-cols-2 gap-4">
                <SnapField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
                <SnapField label="Address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
              </div>
              {profileMsg && (
                <p className={`text-xs ${profileMsg === "Saved" ? "text-primary" : "text-error"}`}>{profileMsg}</p>
              )}
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="w-full mt-2 bg-secondary text-on-secondary py-3 rounded-lg font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {savingProfile ? "Saving…" : "Update Info"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-low border-none rounded-lg py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary/30"
      />
    </div>
  );
}
