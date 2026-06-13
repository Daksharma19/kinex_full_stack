import type { AppointmentStatus } from "../lib/api";

const STYLES: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

/** Small colored pill for an appointment status. */
export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded ${STYLES[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
