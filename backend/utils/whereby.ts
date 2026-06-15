/**
 * Whereby integration helpers.
 *
 * A Whereby "meeting" is a disposable video room scoped to a time window. We
 * create one per ONLINE appointment once payment is confirmed, and store both
 * the patient join link (roomUrl) and the doctor's host link (hostRoomUrl).
 *
 * The API key is server-only (Whereby dashboard -> Configure -> API keys) and is
 * sent as a Bearer token. If WHEREBY_API_KEY is unset, meeting creation is
 * skipped gracefully so the rest of the booking flow keeps working.
 */
const API_KEY = process.env.WHEREBY_API_KEY;
const API_URL = "https://api.whereby.dev/v1/meetings";

export const isWherebyConfigured = Boolean(API_KEY);

export interface WherebyMeeting {
  meetingId: string;
  roomUrl: string;
  hostRoomUrl: string;
}

/**
 * Create a Whereby meeting room for an appointment.
 *
 * @param startsAt   When the consultation begins. The room opens at this time.
 * @param endsAt     When the room closes. Whereby requires an end date; we pass
 *                   the slot end (defaults to 1 hour after start).
 * @returns the meeting id and both join URLs, or null if Whereby isn't
 *          configured. Throws on an API error so callers can decide how to react.
 */
export async function createWherebyMeeting(
  startsAt: Date,
  endsAt?: Date
): Promise<WherebyMeeting | null> {
  if (!API_KEY) return null;

  const end = endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1000);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Make the room available a little before the slot and close it at the end.
      startDate: startsAt.toISOString(),
      endDate: end.toISOString(),
      // Ask Whereby to also return the host-privileged URL for the doctor.
      fields: ["hostRoomUrl"],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Whereby meeting creation failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    meetingId: string;
    roomUrl: string;
    hostRoomUrl: string;
  };

  return {
    meetingId: data.meetingId,
    roomUrl: data.roomUrl,
    hostRoomUrl: data.hostRoomUrl,
  };
}
