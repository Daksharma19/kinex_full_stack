import { useEffect, useState, useCallback } from "react";
import {
  adminListDoctors,
  adminVerifyDoctor,
  type DoctorApplication,
  type DoctorStatus,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";

const TABS: DoctorStatus[] = ["PENDING", "VERIFIED", "REJECTED"];

/**
 * Admin view: review doctor applications. Lists applications by status, opens a
 * detail panel for one, and verifies/rejects via the existing admin endpoints.
 * Rendered only for ADMIN profiles (see Dashboard).
 */
export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<DoctorStatus>("PENDING");
  const [doctors, setDoctors] = useState<DoctorApplication[]>([]);
  const [selected, setSelected] = useState<DoctorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async (status: DoctorStatus) => {
    setLoading(true);
    setError(null);
    try {
      const { doctors } = await adminListDoctors(status);
      setDoctors(doctors);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
    setSelected(null);
  }, [tab, load]);

  async function decide(status: "VERIFIED" | "REJECTED") {
    if (!selected) return;
    setActing(true);
    setError(null);
    try {
      await adminVerifyDoctor(selected.id, status);
      setSelected(null);
      await load(tab); // refresh the current list (the doctor leaves PENDING)
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex-1 w-full bg-background px-6 py-10 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Admin · Doctor applications</h1>
        <Button variant="secondary" onClick={() => signOut()}>
          Log out
        </Button>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-primary-container text-on-primary"
                : "border text-on-surface-variant hover:bg-muted"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* List */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-on-surface-variant">Loading…</p>
          ) : doctors.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No {tab.toLowerCase()} applications.
            </p>
          ) : (
            doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`text-left rounded-xl border p-4 bg-card hover:border-primary transition-colors ${
                  selected?.id === d.id ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                <p className="font-medium">{d.profile.name}</p>
                <p className="text-sm text-on-surface-variant">{d.specialization}</p>
                <p className="text-xs text-on-surface-variant mt-1">{d.profile.email}</p>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <div className="rounded-xl border p-6 bg-card flex flex-col gap-3 sticky top-6">
              <h2 className="text-lg font-bold">{selected.profile.name}</h2>
              <dl className="text-sm flex flex-col gap-2">
                <Row label="Email" value={selected.profile.email} />
                <Row label="Phone" value={selected.profile.phone || "—"} />
                <Row label="Specialization" value={selected.specialization} />
                <Row label="License #" value={selected.licenseNumber} />
                <Row label="Status" value={selected.status} />
                <Row
                  label="Applied"
                  value={new Date(selected.createdAt).toLocaleString()}
                />
              </dl>

              {selected.status === "PENDING" && (
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => decide("VERIFIED")} disabled={acting}>
                    {acting ? "Saving…" : "Verify"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => decide("REJECTED")}
                    disabled={acting}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Select an application to review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
