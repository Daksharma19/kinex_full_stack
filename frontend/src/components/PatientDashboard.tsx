import { useEffect, useState, useCallback, useRef } from "react";
import {
  listVerifiedDoctors,
  listMyAppointments,
  bookAppointment,
  verifyAppointmentPayment,
  releaseAppointment,
  listDoctorSlots,
  joinAppointment,
  updateMyProfile,
  uploadMyPhoto,
  type VerifiedDoctor,
  type Appointment,
  type AppointmentMode,
  type TimeSlot,
  type PaymentOrder,
  type PaymentInvoice,
} from "../lib/api";
import { openRazorpayCheckout } from "../lib/razorpay";
import { sanitizePhone } from "../lib/validation";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "./StatusBadge";
import Loader from "./Loader";
import AddressLocationModal, {
  type AddressLocationResult,
} from "./AddressLocationModal";

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

// A 1-hour online consultation is joinable from 10 min before the slot start
// until 15 min after it ends (matches the backend join window).
function isWithinJoinWindow(scheduledAt: string): boolean {
  const start = new Date(scheduledAt).getTime();
  const now = Date.now();
  return now >= start - 10 * 60_000 && now <= start + 75 * 60_000;
}

// Group available slots by their calendar day for a tidy "pick a time" UI.
function groupSlotsByDay(slots: TimeSlot[]): [string, TimeSlot[]][] {
  const map = new Map<string, TimeSlot[]>();
  for (const s of slots) {
    const label = new Date(s.startsAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const arr = map.get(label) ?? [];
    arr.push(s);
    map.set(label, arr);
  }
  return Array.from(map.entries());
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
  const toast = useToast();
  const photoUrl = (profile as { photoUrl?: string | null } | null)?.photoUrl ?? null;
  const patient = (profile as { patient?: { dateOfBirth?: string | null; address?: string | null } | null } | null)?.patient;
  const phoneOnFile = (profile as { phone?: string | null } | null)?.phone ?? "";

  // A patient must have a phone AND an address before they can book a visit.
  const needsContactDetails = !phoneOnFile?.trim() || !patient?.address?.trim();

  // Address/location collection modal (shown when details are missing).
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<VerifiedDoctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking
  const [showBooking, setShowBooking] = useState(false);
  const [selected, setSelected] = useState<VerifiedDoctor | null>(null);
  const [mode, setMode] = useState<AppointmentMode>("ONLINE");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  // Slots for the selected doctor.
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  // After "Proceed to Payment": the started (PENDING) booking + its invoice +
  // Razorpay order. While set, the invoice screen is shown with a final Pay btn.
  const [pending, setPending] = useState<{
    appointment: Appointment;
    payment: PaymentOrder;
    invoice: PaymentInvoice;
  } | null>(null);
  const [paying, setPaying] = useState(false);
  // Set after a successful ONLINE booking so we can surface the patient's video
  // join link right away (a confirmation banner with a "Join" button).
  const [confirmedRoomUrl, setConfirmedRoomUrl] = useState<string | null>(null);
  // Id of the appointment whose video room is currently being opened.
  const [joiningId, setJoiningId] = useState<string | null>(null);
  // Ticks every 30s so the time-gated "Join" button appears/disappears on its
  // own as a slot opens or closes, without the user refreshing.
  const [, setNowTick] = useState(0);

  // Profile snapshot
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", dateOfBirth: "", address: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Debounce timer for auto-saving profile edits; guard against saving the
  // initial values we seed from the profile (only user edits should persist).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

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

  // Seed the profile form from the auth profile. Skip while the user is actively
  // editing (dirty) so an auto-save round-trip doesn't overwrite their typing.
  useEffect(() => {
    if (dirtyRef.current) return;
    setForm({
      name: profile?.name || "",
      phone: (profile as { phone?: string | null } | null)?.phone || "",
      dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "",
      address: patient?.address || "",
    });
  }, [profile, patient]);

  // Release a started-but-unpaid booking (best effort) so its slot frees up.
  async function releasePending() {
    if (!pending) return;
    const apptId = pending.appointment.id;
    setPending(null);
    try {
      await releaseAppointment(apptId);
    } catch {
      /* ignore */
    }
  }

  async function openBooking(d: VerifiedDoctor) {
    await releasePending(); // discard any prior unpaid hold before switching
    setSelected(d);
    setMode("ONLINE");
    setNotes("");
    setSelectedSlotId(null);
    setSlots([]);
    setError(null);
    setSlotsLoading(true);
    try {
      const { slots } = await listDoctorSlots(d.id);
      setSlots(slots);
    } catch (err) {
      setError((err as Error).message || "Could not load available slots");
    } finally {
      setSlotsLoading(false);
    }
  }

  // Entry point for the "Book New Appointment" button: collect missing contact
  // details first, otherwise just toggle the booking panel.
  function handleBookClick() {
    if (showBooking) {
      void releasePending(); // free any unpaid hold when closing the panel
      setShowBooking(false);
      return;
    }
    if (needsContactDetails) {
      setAddressError(null);
      setShowAddressModal(true);
      return;
    }
    setShowBooking(true);
  }

  // Persist the phone + merged address + coordinates, then continue to booking.
  async function handleSaveAddress(data: AddressLocationResult) {
    setSavingAddress(true);
    setAddressError(null);
    try {
      await updateMyProfile({
        phone: data.phone,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      await refreshProfile();
      setShowAddressModal(false);
      setShowBooking(true);
      toast.success("Details saved successfully");
    } catch (err) {
      const msg = (err as Error).message || "Could not save your details";
      setAddressError(msg);
      toast.error(msg);
    } finally {
      setSavingAddress(false);
    }
  }

  // Step 1: reserve the slot + create the PENDING booking and Razorpay order,
  // then show the itemized invoice. Payment happens on the invoice screen.
  async function startBooking() {
    if (!selected) return;
    if (!selectedSlotId) {
      setError("Pick an available time slot.");
      return;
    }
    if (selected.consultationFee == null || selected.consultationFee <= 0) {
      setError("This doctor has not set a consultation fee yet.");
      return;
    }
    setBooking(true);
    setError(null);
    try {
      const { appointment, payment, invoice } = await bookAppointment({
        slotId: selectedSlotId,
        mode,
        notes: notes || undefined,
      });
      setPending({ appointment, payment, invoice });
    } catch (err) {
      const msg = (err as Error).message || "Could not start the booking";
      setError(msg);
      toast.error(msg);
      // Refresh slots in case the chosen one was just taken.
      try {
        const { slots } = await listDoctorSlots(selected.id);
        setSlots(slots);
        setSelectedSlotId(null);
      } catch {
        /* ignore */
      }
    } finally {
      setBooking(false);
    }
  }

  // Step 2: open Razorpay for the started booking, verify, and confirm.
  async function payNow() {
    if (!pending || !selected) return;
    setPaying(true);
    setError(null);
    const apptId = pending.appointment.id;
    try {
      const result = await openRazorpayCheckout(pending.payment, {
        name: "Kinex Healthcare",
        description: `Consultation with Dr. ${selected.profile.name}`,
        prefill: {
          name: profile?.name || undefined,
          email: profile?.email || undefined,
          contact: phoneOnFile || undefined,
        },
      });

      // Verify → auto-confirms the appointment + locks the slot (and for ONLINE
      // returns the appointment with its video join link).
      const { appointment: confirmed } = await verifyAppointmentPayment(apptId, result);

      setPending(null);
      setSelected(null);
      setShowBooking(false);
      if (confirmed.mode === "ONLINE" && confirmed.roomUrl) {
        setConfirmedRoomUrl(confirmed.roomUrl);
      }
      await loadAppointments();
      toast.success("Payment successful — appointment confirmed");
    } catch (err) {
      const msg = (err as Error).message || "Could not complete the payment";
      setError(msg);
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  }

  // Abandon the started booking from the invoice screen: release the hold so the
  // slot frees up, then return to slot selection.
  async function cancelInvoice() {
    if (!pending) return;
    const apptId = pending.appointment.id;
    setPending(null);
    try {
      await releaseAppointment(apptId);
    } catch {
      /* ignore — may already be cancelled server-side */
    }
    if (selected) {
      try {
        const { slots } = await listDoctorSlots(selected.id);
        setSlots(slots);
        setSelectedSlotId(null);
      } catch {
        /* ignore */
      }
    }
  }

  // Persist the current form. Called (debounced) automatically as the user edits.
  async function autoSaveProfile(next: typeof form) {
    // Don't push an empty name — the backend rejects it. Other fields can clear.
    if (!next.name.trim()) return;
    setSavingProfile(true);
    setSavedTick(false);
    try {
      await updateMyProfile({
        name: next.name,
        phone: next.phone,
        dateOfBirth: next.dateOfBirth || null,
        address: next.address || null,
      });
      await refreshProfile();
      setSavedTick(true);
      toast.success("Profile saved");
    } catch (err) {
      toast.error((err as Error).message || "Could not save your profile");
    } finally {
      setSavingProfile(false);
    }
  }

  // Update a field and schedule an auto-save (debounced) so changes persist and
  // reflect without the user pressing a save button.
  function handleFieldChange(key: keyof typeof form, value: string) {
    dirtyRef.current = true;
    setSavedTick(false);
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => autoSaveProfile(next), 900);
      return next;
    });
  }

  // Flush any pending save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Open the consultation room: asks the backend for our join link (provisioning
  // the room if needed) and opens it in a new tab.
  async function handleJoin(appointmentId: string) {
    setJoiningId(appointmentId);
    try {
      const { joinUrl } = await joinAppointment(appointmentId);
      window.open(joinUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error((err as Error).message || "Could not open the consultation room");
    } finally {
      setJoiningId(null);
    }
  }

  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await uploadMyPhoto(await fileToDataUrl(file));
      await refreshProfile();
      toast.success("Photo updated");
    } catch (err) {
      toast.error((err as Error).message || "Could not upload the photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex-1 w-full bg-background px-6 md:px-10 py-10 max-w-7xl mx-auto flex flex-col gap-8">
      <AddressLocationModal
        open={showAddressModal}
        saving={savingAddress}
        error={addressError}
        initialPhone={phoneOnFile}
        onClose={() => setShowAddressModal(false)}
        onSave={handleSaveAddress}
      />

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
          onClick={handleBookClick}
          className="group flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3.5 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-lg">
            {showBooking ? "close" : "add_circle"}
          </span>
          {showBooking ? "Close" : "Book New Appointment"}
        </button>
      </section>

      {error && <p className="text-sm text-error">{error}</p>}

      {/* Post-booking banner: video room link for an online consultation. */}
      {confirmedRoomUrl && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">videocam</span>
            <div>
              <p className="font-bold text-on-surface">Your video consultation is booked</p>
              <p className="text-sm text-on-surface-variant">
                Use this link to join at your scheduled time. We'll also email you a
                reminder a day before.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={confirmedRoomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-primary-container text-on-primary px-4 py-2 rounded-lg font-bold text-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">video_call</span>
              Join room
            </a>
            <button
              onClick={() => setConfirmedRoomUrl(null)}
              className="text-on-surface-variant hover:text-on-surface"
              title="Dismiss"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: booking + history */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Booking panel */}
          {showBooking && (
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 space-y-6">
              <h3 className="text-xl font-bold text-on-surface">Available doctors</h3>
              {loading ? (
                <Loader label="Loading doctors…" size={72} />
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
                      <p className="text-xs font-bold text-primary">
                        {d.consultationFee != null ? `₹${d.consultationFee} consultation` : "Fee not set"}
                      </p>
                      <Button className="mt-1" onClick={() => openBooking(d)}>Book</Button>
                    </div>
                  ))}
                </div>
              )}

              {selected && !pending && (
                <div className="rounded-xl border border-primary/20 p-6 bg-primary/5 flex flex-col gap-4 max-w-md">
                  <h4 className="font-bold text-on-surface">Book with {selected.profile.name}</h4>
                  {selected.consultationFee != null && (
                    <p className="text-sm font-bold text-primary">
                      Consultation fee: ₹{selected.consultationFee}
                    </p>
                  )}
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
                    <Label>Available time slots</Label>
                    {slotsLoading ? (
                      <Loader label="Loading slots…" size={64} />
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">
                        This doctor has no open slots right now. Please check back later.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {groupSlotsByDay(slots).map(([day, daySlots]) => (
                          <div key={day}>
                            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
                              {day}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {daySlots.map((s) => {
                                const isSel = s.id === selectedSlotId;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSelectedSlotId(s.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                      isSel
                                        ? "bg-primary text-on-primary border-primary"
                                        : "bg-surface-container-lowest border-outline-variant/30 text-on-surface hover:border-primary"
                                    }`}
                                  >
                                    {new Date(s.startsAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={startBooking} disabled={booking || !selectedSlotId}>
                      {booking ? "Processing…" : "Proceed to Payment"}
                    </Button>
                    <Button variant="secondary" onClick={() => setSelected(null)} disabled={booking}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Invoice / payment screen — shown after "Proceed to Payment". */}
              {selected && pending && (
                <div className="rounded-xl border border-primary/20 p-6 bg-primary/5 flex flex-col gap-4 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                    <h4 className="font-bold text-on-surface">Payment summary</h4>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Consultation with Dr. {selected.profile.name}
                    {pending.appointment.scheduledAt && (
                      <>
                        {" · "}
                        {new Date(pending.appointment.scheduledAt).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                  </p>

                  <div className="rounded-lg bg-surface-container-lowest border border-outline-variant/10 divide-y divide-outline-variant/10 text-sm">
                    <InvoiceRow
                      label="Doctor consultation fee"
                      hint="Healthcare service — GST exempt"
                      value={pending.invoice.consultationFee}
                    />
                    <InvoiceRow
                      label={`Payment gateway fee (${pending.invoice.gatewayFeePercent}%)`}
                      value={pending.invoice.gatewayFee}
                    />
                    <InvoiceRow
                      label={`GST (${pending.invoice.gstPercent}% on gateway fee)`}
                      value={pending.invoice.gst}
                    />
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="font-bold text-on-surface">Total payable</span>
                      <span className="font-black text-on-surface">
                        ₹{pending.invoice.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-on-surface-variant">
                    This is a temporary itemized invoice. The total above is what
                    will be charged via Razorpay.
                  </p>

                  <div className="flex gap-3">
                    <Button onClick={payNow} disabled={paying}>
                      {paying ? "Processing…" : `Pay ₹${pending.invoice.total.toFixed(2)}`}
                    </Button>
                    <Button variant="secondary" onClick={cancelInvoice} disabled={paying}>
                      Cancel
                    </Button>
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
              <Loader label="Loading appointments…" size={72} />
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
                          <div className="flex items-center justify-end gap-2">
                            {a.mode === "ONLINE" &&
                              a.status === "CONFIRMED" &&
                              isWithinJoinWindow(a.scheduledAt) && (
                                <button
                                  onClick={() => handleJoin(a.id)}
                                  disabled={joiningId === a.id}
                                  className="flex items-center gap-1 bg-primary-container text-on-primary px-3 py-1.5 rounded-lg font-bold text-xs hover:shadow-md transition-all disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-sm">video_call</span>
                                  {joiningId === a.id ? "Opening…" : "Join"}
                                </button>
                              )}
                            <span
                              className="material-symbols-outlined text-primary-container align-middle"
                              title={a.mode === "ONLINE" ? "Online consultation" : "Home visit"}
                            >
                              {a.mode === "ONLINE" ? "video_chat" : "home_health"}
                            </span>
                          </div>
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
              <SnapField label="Full Name" value={form.name} onChange={(v) => handleFieldChange("name", v)} />
              <SnapField
                label="Phone"
                value={form.phone}
                prefix="+91"
                placeholder="98765 43210"
                onChange={(v) => handleFieldChange("phone", sanitizePhone(v))}
              />
              <div className="grid grid-cols-2 gap-4">
                <SnapField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => handleFieldChange("dateOfBirth", v)} />
                <SnapField label="Address" value={form.address} onChange={(v) => handleFieldChange("address", v)} />
              </div>
              {/* Auto-save status — changes persist as you type, no button needed. */}
              <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                {savingProfile ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Saving…
                  </>
                ) : savedTick ? (
                  <>
                    <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                    All changes saved
                  </>
                ) : (
                  "Changes save automatically"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div>
        <p className="text-on-surface">{label}</p>
        {hint && <p className="text-[10px] text-on-surface-variant">{hint}</p>}
      </div>
      <span className="text-on-surface font-medium">₹{value.toFixed(2)}</span>
    </div>
  );
}

function SnapField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
        {label}
      </label>
      <div className="flex items-stretch">
        {prefix && (
          <span className="inline-flex items-center rounded-l-lg bg-surface-container px-3 text-sm text-on-surface-variant select-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-surface-container-low border-none py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary/30 ${
            prefix ? "rounded-r-lg" : "rounded-lg"
          }`}
        />
      </div>
    </div>
  );
}
