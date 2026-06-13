import { useEffect, useState, useCallback } from "react";
import {
  adminListDoctors,
  adminVerifyDoctor,
  adminListUsers,
  adminPromoteToAdmin,
  type DoctorApplication,
  type DoctorStatus,
  type UserRow,
} from "../lib/api";
import { Button } from "@/components/ui/button";

const STATUS_TABS: DoctorStatus[] = ["PENDING", "VERIFIED", "REJECTED"];

/**
 * Admin console. Two views:
 *  - Doctor applications: review and verify/reject by status.
 *  - Manage admins: list registered users and promote one to ADMIN.
 * Rendered only for ADMIN profiles (see Dashboard). Logout lives in the navbar.
 */
export default function AdminDashboard() {
  const [view, setView] = useState<"doctors" | "admins">("doctors");

  return (
    <div className="flex-1 w-full bg-background px-6 py-10 max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Admin console</h1>

      <div className="flex gap-2 border-b">
        <ViewTab active={view === "doctors"} onClick={() => setView("doctors")}>
          Doctor applications
        </ViewTab>
        <ViewTab active={view === "admins"} onClick={() => setView("admins")}>
          Manage admins
        </ViewTab>
      </div>

      {view === "doctors" ? <DoctorApplications /> : <ManageAdmins />}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-on-surface-variant hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Doctor applications ---------------- */

function DoctorApplications() {
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
      await load(tab);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {STATUS_TABS.map((t) => (
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
                <Row label="Applied" value={new Date(selected.createdAt).toLocaleString()} />
              </dl>

              {selected.status === "PENDING" && (
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => decide("VERIFIED")} disabled={acting}>
                    {acting ? "Saving…" : "Verify"}
                  </Button>
                  <Button variant="secondary" onClick={() => decide("REJECTED")} disabled={acting}>
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

/* ---------------- Manage admins ---------------- */

function ManageAdmins() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { users } = await adminListUsers();
      setUsers(users);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function promote(id: string) {
    setPromotingId(id);
    setError(null);
    try {
      await adminPromoteToAdmin(id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-on-surface-variant">
        Promote any registered user to admin. Admins can verify doctors and manage
        other admins.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading…</p>
      ) : (
        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-on-surface-variant">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    u.role === "ADMIN"
                      ? "bg-primary-container text-on-primary"
                      : "bg-muted text-on-surface-variant"
                  }`}
                >
                  {u.role}
                </span>
                {u.role === "ADMIN" ? (
                  <span className="text-xs text-on-surface-variant w-28 text-right">
                    Already admin
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-28"
                    onClick={() => promote(u.id)}
                    disabled={promotingId === u.id}
                  >
                    {promotingId === u.id ? "Promoting…" : "Make admin"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
