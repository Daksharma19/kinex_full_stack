import { useEffect, useState, useCallback, useMemo } from "react";
import {
  adminListDoctors,
  adminVerifyDoctor,
  adminListUsers,
  adminGetDoctorDetails,
  adminPromoteToAdmin,
  adminDeleteUser,
  listMyAppointments,
  updateAppointmentStatus,
  adminDeleteAppointment,
  type DoctorApplication,
  type DoctorStatus,
  type UserRow,
  type Appointment,
  type AdminDoctorDetails,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "./StatusBadge";
import Loader from "./Loader";

const STATUS_TABS: DoctorStatus[] = ["PENDING", "VERIFIED", "REJECTED"];

type UserRoleTab = "PATIENT" | "DOCTOR" | "ADMIN";
const USER_ROLE_TABS: { key: UserRoleTab; label: string }[] = [
  { key: "PATIENT", label: "Patients" },
  { key: "DOCTOR", label: "Doctors" },
  { key: "ADMIN", label: "Admins" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string) {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function DoctorStatusPill({ status }: { status: DoctorStatus }) {
  const map: Record<DoctorStatus, string> = {
    PENDING: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    VERIFIED: "bg-secondary-container text-primary",
    REJECTED: "bg-error-container text-on-error-container",
  };
  return (
    <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${map[status]}`}>
      {status}
    </span>
  );
}

/**
 * Admin console, styled after the Kinex "Systems Overview" mockup. Single page:
 * real summary metrics, provider (doctor) applications with verify/reject, user
 * management with promote/delete, and a read-only admin profile card. All data
 * comes from the existing admin endpoints - metric numbers are computed, not mocked.
 */
export default function AdminDashboard() {
  const { profile } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [apps, setApps] = useState<DoctorApplication[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [tab, setTab] = useState<DoctorStatus>("PENDING");
  const [selected, setSelected] = useState<DoctorApplication | null>(null);

  // User Management: which role bucket is shown, plus the doctor-details drill-in.
  const [userRoleTab, setUserRoleTab] = useState<UserRoleTab>("PATIENT");
  const [detailsFor, setDetailsFor] = useState<UserRow | null>(null);
  const [details, setDetails] = useState<AdminDoctorDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadApps = useCallback(async (status: DoctorStatus) => {
    setLoadingApps(true);
    setError(null);
    try {
      const { doctors } = await adminListDoctors(status);
      setApps(doctors);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { users } = await adminListUsers();
      setUsers(users);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try {
      const { appointments } = await listMyAppointments();
      setAppointments(appointments);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAppts(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const { doctors } = await adminListDoctors("PENDING");
      setPendingCount(doctors.length);
    } catch {
      /* metric only - ignore */
    }
  }, []);

  useEffect(() => {
    loadApps(tab);
    setSelected(null);
  }, [tab, loadApps]);

  useEffect(() => {
    loadUsers();
    loadPending();
    loadAppointments();
  }, [loadUsers, loadPending, loadAppointments]);

  const metrics = useMemo(
    () => ({
      totalUsers: users.length,
      doctors: users.filter((u) => u.role === "DOCTOR").length,
      pending: pendingCount,
    }),
    [users, pendingCount]
  );

  // Count per role (for the User Management tab badges) and the rows for the
  // currently selected role bucket.
  const roleCounts = useMemo(
    () => ({
      PATIENT: users.filter((u) => u.role === "PATIENT").length,
      DOCTOR: users.filter((u) => u.role === "DOCTOR").length,
      ADMIN: users.filter((u) => u.role === "ADMIN").length,
    }),
    [users]
  );

  const visibleUsers = useMemo(
    () => users.filter((u) => u.role === userRoleTab),
    [users, userRoleTab]
  );

  async function openDoctorDetails(u: UserRow) {
    setDetailsFor(u);
    setDetails(null);
    setDetailsError(null);
    setLoadingDetails(true);
    try {
      const data = await adminGetDoctorDetails(u.id);
      setDetails(data);
    } catch (err) {
      setDetailsError((err as Error).message);
    } finally {
      setLoadingDetails(false);
    }
  }

  function closeDoctorDetails() {
    setDetailsFor(null);
    setDetails(null);
    setDetailsError(null);
  }

  async function decide(id: string, status: "VERIFIED" | "REJECTED") {
    setActingId(id);
    setError(null);
    try {
      await adminVerifyDoctor(id, status);
      setSelected(null);
      await Promise.all([loadApps(tab), loadPending()]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function promote(id: string) {
    setActingId(id);
    setError(null);
    try {
      await adminPromoteToAdmin(id);
      await loadUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function remove(u: UserRow) {
    if (
      !window.confirm(
        `Permanently delete ${u.name} (${u.email})? This removes all their records and login. This cannot be undone.`
      )
    )
      return;
    setActingId(u.id);
    setError(null);
    try {
      await adminDeleteUser(u.id);
      await Promise.all([loadUsers(), loadApps(tab), loadPending()]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function cancelAppointment(a: Appointment) {
    if (
      !window.confirm(
        `Cancel the appointment for ${a.patient.profile.name} with Dr. ${a.doctor.profile.name}? A paid consultation will be marked refunded and the slot freed.`
      )
    )
      return;
    setActingId(a.id);
    setError(null);
    try {
      await updateAppointmentStatus(a.id, "CANCELLED");
      await loadAppointments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  // TEMPORARY: hard-delete an appointment from the DB (no record kept).
  async function deleteAppointment(a: Appointment) {
    if (
      !window.confirm(
        `Permanently DELETE the appointment for ${a.patient.profile.name} with Dr. ${a.doctor.profile.name} from the database? This cannot be undone.`
      )
    )
      return;
    setActingId(a.id);
    setError(null);
    try {
      await adminDeleteAppointment(a.id);
      await loadAppointments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  function refreshAll() {
    loadApps(tab);
    loadUsers();
    loadPending();
    loadAppointments();
  }

  return (
    <div className="flex-1 w-full bg-background px-6 md:px-8 py-10 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header + metrics */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary mb-2">
            Systems Overview
          </h1>
          <p className="text-on-surface-variant max-w-md">
            Welcome back{profile?.name ? `, ${profile.name}` : ""}. Review provider
            applications and manage your users.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Total Users" value={metrics.totalUsers} accent="border-primary/20" />
          <Metric label="Doctors" value={metrics.doctors} accent="border-primary/20" />
          <Metric label="Pending Approvals" value={metrics.pending} accent="border-error/20" danger />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 text-sm font-bold text-primary px-4 py-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-base">refresh</span> Refresh
        </button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: applications + users */}
        <div className="lg:col-span-2 space-y-8">
          {/* Provider applications */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-primary">Provider Applications</h3>
                <p className="text-xs text-on-surface-variant">
                  Credentialing for medical staff.
                </p>
              </div>
              <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      tab === t ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"
                    }`}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface-container-lowest z-10">
                  <tr className="text-[10px] uppercase tracking-widest text-outline font-bold border-b border-outline-variant/10">
                    <th className="pb-4">Doctor</th>
                    <th className="pb-4">Specialty</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loadingApps ? (
                    <tr><td colSpan={4}><Loader label="Loading applications…" size={64} /></td></tr>
                  ) : apps.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-sm text-on-surface-variant">No {tab.toLowerCase()} applications.</td></tr>
                  ) : (
                    apps.map((d) => (
                      <tr key={d.id} className="group hover:bg-surface-container-low transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-xs">
                              {initials(d.profile.name)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-on-surface">{d.profile.name}</p>
                              <p className="text-[10px] text-on-surface-variant">Applied {timeAgo(d.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-on-surface-variant">{d.specialization}</td>
                        <td className="py-4"><DoctorStatusPill status={d.status} /></td>
                        <td className="py-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => setSelected(d)}
                            className="px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-primary-container/10 rounded-lg transition-colors"
                          >
                            Review
                          </button>
                          {d.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => decide(d.id, "VERIFIED")}
                                disabled={actingId === d.id}
                                className="px-3 py-1.5 text-[10px] font-bold bg-primary text-on-primary rounded-lg shadow-sm active:scale-95 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => decide(d.id, "REJECTED")}
                                disabled={actingId === d.id}
                                className="px-3 py-1.5 text-[10px] font-bold text-error hover:bg-error-container/20 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Deny
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* User management - segregated by role (Patients / Doctors / Admins) */}
          <section className="bg-surface-container rounded-xl p-6">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-primary">User Management</h3>
                <p className="text-xs text-on-surface-variant">
                  {roleCounts[userRoleTab]} {userRoleTab.toLowerCase()}
                  {roleCounts[userRoleTab] === 1 ? "" : "s"} • {users.length} users total
                </p>
              </div>
              <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
                {USER_ROLE_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setUserRoleTab(t.key)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      userRoleTab === t.key
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 opacity-60">{roleCounts[t.key]}</span>
                  </button>
                ))}
              </div>
            </div>
            {loadingUsers ? (
              <Loader label="Loading users…" size={64} />
            ) : visibleUsers.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-4">
                No {userRoleTab.toLowerCase()}s yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[28rem] overflow-y-auto pr-1">
                {visibleUsers.map((u) => (
                  <div
                    key={u.id}
                    className="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between border border-transparent hover:border-primary/20 transition-all gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-on-surface truncate">{u.name}</p>
                        <p className="text-[10px] text-outline font-bold uppercase truncate">
                          {u.role} • {u.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {u.role === "DOCTOR" && (
                        <button
                          onClick={() => openDoctorDetails(u)}
                          title="Review doctor"
                          className="px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-primary-container/10 rounded-lg transition-colors"
                        >
                          Review
                        </button>
                      )}
                      {u.role !== "ADMIN" && (
                        <button
                          onClick={() => promote(u.id)}
                          disabled={actingId === u.id}
                          title="Make admin"
                          className="p-2 text-outline-variant hover:text-primary transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-lg">shield_person</span>
                        </button>
                      )}
                      {u.id !== profile?.id && (
                        <button
                          onClick={() => remove(u)}
                          disabled={actingId === u.id}
                          title="Delete user"
                          className="p-2 text-outline-variant hover:text-error transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Appointments - admin can cancel any non-final appointment */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Appointments</h3>
                <p className="text-xs text-on-surface-variant">
                  Only an admin can cancel a booking.
                </p>
              </div>
              <span className="text-xs text-on-surface-variant">{appointments.length} total</span>
            </div>
            {loadingAppts ? (
              <Loader label="Loading appointments…" size={64} />
            ) : appointments.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No appointments yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-surface-container-lowest z-10">
                    <tr className="text-[10px] uppercase tracking-widest text-outline font-bold border-b border-outline-variant/10">
                      <th className="pb-4">Patient</th>
                      <th className="pb-4">Doctor</th>
                      <th className="pb-4">When</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {appointments.map((a) => {
                      const final = a.status === "COMPLETED" || a.status === "CANCELLED";
                      return (
                        <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 text-sm font-medium text-on-surface">{a.patient.profile.name}</td>
                          <td className="py-3 text-sm text-on-surface-variant">Dr. {a.doctor.profile.name}</td>
                          <td className="py-3 text-sm text-on-surface-variant whitespace-nowrap">
                            {new Date(a.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            {" · "}
                            {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3"><StatusBadge status={a.status} /></td>
                          <td className="py-3 text-right whitespace-nowrap">
                            {!final && (
                              <button
                                onClick={() => cancelAppointment(a)}
                                disabled={actingId === a.id}
                                className="px-3 py-1.5 text-[10px] font-bold text-error hover:bg-error-container/20 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                            {/* TEMPORARY: hard delete from DB */}
                            <button
                              onClick={() => deleteAppointment(a)}
                              disabled={actingId === a.id}
                              title="Delete from database (temporary)"
                              className="px-2 py-1.5 text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-base align-middle">delete_forever</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right: admin profile (read-only) */}
        <div className="space-y-8">
          <section className="bg-surface-container-high rounded-xl p-6">
            <h3 className="text-lg font-bold text-primary mb-6">Admin Profile</h3>
            <div className="flex flex-col items-center mb-6">
              <div className="h-20 w-20 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-2xl font-black">
                {profile?.name ? initials(profile.name) : "AD"}
              </div>
            </div>
            <div className="space-y-5">
              <ReadField label="Full Name" value={profile?.name || "-"} />
              <ReadField label="Email Address" value={profile?.email || "-"} />
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-outline-variant tracking-wider">
                  Access Tier
                </label>
                <div className="bg-surface-container-lowest px-3 py-2 rounded-lg text-xs font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                  Administrator
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Review modal */}
      {selected && (
        <ReviewModal
          app={selected}
          acting={actingId === selected.id}
          onClose={() => setSelected(null)}
          onDecide={decide}
        />
      )}

      {/* Doctor details modal (User Management → Review) */}
      {detailsFor && (
        <DoctorDetailsModal
          user={detailsFor}
          details={details}
          loading={loadingDetails}
          error={detailsError}
          onClose={closeDoctorDetails}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number;
  accent: string;
  danger?: boolean;
}) {
  return (
    <div className={`bg-surface-container-lowest p-4 md:p-5 rounded-xl shadow-sm border-b-2 ${accent}`}>
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${danger ? "text-error" : "text-outline"}`}>
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-black text-on-surface">{value}</p>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase font-black text-outline-variant tracking-wider">{label}</label>
      <div className="bg-surface-container-low rounded-lg text-sm p-3 text-on-surface font-medium break-words">
        {value}
      </div>
    </div>
  );
}

function ReviewModal({
  app,
  acting,
  onClose,
  onDecide,
}: {
  app: DoctorApplication;
  acting: boolean;
  onClose: () => void;
  onDecide: (id: string, status: "VERIFIED" | "REJECTED") => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold">
            {initials(app.profile.name)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">{app.profile.name}</h2>
            <DoctorStatusPill status={app.status} />
          </div>
        </div>
        <dl className="text-sm flex flex-col gap-2 mt-2">
          <ModalRow label="Email" value={app.profile.email} />
          <ModalRow label="Phone" value={app.profile.phone || "-"} />
          <ModalRow label="Specialization" value={app.specialization} />
          <ModalRow label="License #" value={app.licenseNumber} />
          <ModalRow label="Applied" value={new Date(app.createdAt).toLocaleString()} />
        </dl>
        {app.status === "PENDING" ? (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onDecide(app.id, "VERIFIED")}
              disabled={acting}
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg font-bold active:scale-95 disabled:opacity-50"
            >
              {acting ? "Saving…" : "Approve"}
            </button>
            <button
              onClick={() => onDecide(app.id, "REJECTED")}
              disabled={acting}
              className="flex-1 border border-error/40 text-error py-2.5 rounded-lg font-bold hover:bg-error-container/20 disabled:opacity-50"
            >
              Deny
            </button>
          </div>
        ) : (
          <button onClick={onClose} className="mt-2 text-sm font-bold text-primary hover:underline">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-medium text-right break-all">{value}</dd>
    </div>
  );
}

function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Read-only deep-dive on a single doctor, opened from User Management. Shows the
 * doctor's credentials, headline stats (incl. money earned), and the full list
 * of their appointments with patient + payment. Data is fetched on open.
 */
function DoctorDetailsModal({
  user,
  details,
  loading,
  error,
  onClose,
}: {
  user: UserRow;
  details: AdminDoctorDetails | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-outline-variant/10">
          <div className="h-14 w-14 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden">
            {details?.doctor.profile.photoUrl ? (
              <img
                src={details.doctor.profile.photoUrl}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              initials(user.name)
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-on-surface truncate">{user.name}</h2>
            <p className="text-xs text-on-surface-variant truncate">
              {details ? details.doctor.specialization : "Doctor"} • {user.email}
            </p>
          </div>
          {details && (
            <div className="ml-auto shrink-0">
              <DoctorStatusPill status={details.doctor.status} />
            </div>
          )}
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-6">
          {loading ? (
            <Loader label="Loading doctor details…" size={64} />
          ) : error ? (
            <p className="text-sm text-error">{error}</p>
          ) : details ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Earned" value={rupees(details.stats.totalEarned)} highlight />
                <StatCard label="Appointments" value={String(details.stats.totalAppointments)} />
                <StatCard label="Completed" value={String(details.stats.completed)} />
                <StatCard label="Upcoming" value={String(details.stats.confirmed)} />
              </div>

              {/* Credentials */}
              <dl className="text-sm flex flex-col gap-2 bg-surface-container-low rounded-xl p-4">
                <ModalRow label="Phone" value={details.doctor.profile.phone || "-"} />
                <ModalRow label="License #" value={details.doctor.licenseNumber} />
                <ModalRow
                  label="Consultation Fee"
                  value={
                    details.doctor.consultationFee != null
                      ? rupees(details.doctor.consultationFee)
                      : "Not set"
                  }
                />
                <ModalRow
                  label="Joined"
                  value={new Date(details.doctor.profile.createdAt).toLocaleDateString()}
                />
                <ModalRow
                  label="Verified"
                  value={
                    details.doctor.verifiedAt
                      ? new Date(details.doctor.verifiedAt).toLocaleDateString()
                      : "-"
                  }
                />
              </dl>

              {/* Appointments */}
              <div>
                <h3 className="text-sm font-bold text-primary mb-3">
                  Appointments ({details.appointments.length})
                </h3>
                {details.appointments.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No appointments yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-outline font-bold border-b border-outline-variant/10">
                          <th className="pb-3">Patient</th>
                          <th className="pb-3">When</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {details.appointments.map((a) => {
                          // Net earning counts only once the payment is VERIFIED.
                          const earned =
                            a.payment?.status === "VERIFIED" && a.payment.consultation != null
                              ? a.payment.consultation
                              : null;
                          return (
                            <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="py-2.5">
                                <p className="text-sm font-medium text-on-surface">{a.patient.name}</p>
                                <p className="text-[10px] text-on-surface-variant">
                                  {a.mode === "ONLINE" ? "Online" : "Home visit"}
                                </p>
                              </td>
                              <td className="py-2.5 text-sm text-on-surface-variant whitespace-nowrap">
                                {new Date(a.scheduledAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                                {" · "}
                                {new Date(a.scheduledAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-2.5">
                                <StatusBadge status={a.status} />
                              </td>
                              <td className="py-2.5 text-right text-sm font-bold text-on-surface whitespace-nowrap">
                                {earned != null ? rupees(earned) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="p-4 border-t border-outline-variant/10 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm font-bold text-primary px-4 py-2 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        highlight ? "bg-primary-container/40" : "bg-surface-container-low"
      }`}
    >
      <p className="text-[10px] uppercase tracking-widest font-bold text-outline mb-1">{label}</p>
      <p className={`text-lg font-black ${highlight ? "text-primary" : "text-on-surface"}`}>
        {value}
      </p>
    </div>
  );
}
