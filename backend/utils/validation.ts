/**
 * Server-side input validation & sanitization. The frontend validates too, but
 * the API must never trust the client — every controller that writes user input
 * runs values through here first.
 *
 * Users are India-only: a phone is always a bare 10-digit local number (no +91).
 */

/** Trim, collapse whitespace, and strip angle brackets from a free-text value. */
export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

/** Strip non-digits and cap at 10 — the canonical stored phone form. */
export function sanitizePhone(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\D/g, "").slice(0, 10);
}

/** A valid Indian mobile number: 10 digits starting 6–9. */
export function isValidPhone(value: unknown): boolean {
  return /^[6-9]\d{9}$/.test(sanitizePhone(value));
}

/** Light email shape check. */
export function isValidEmail(value: unknown): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Password policy: ≥6 chars with at least one letter, one digit, one special. */
export function isStrongPassword(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return (
    value.length >= 6 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

/**
 * Normalize a phone for storage: returns the sanitized 10-digit string, null for
 * an empty value, or throws an Error (caught by the controller) if it's present
 * but malformed.
 */
export function normalizePhoneOrThrow(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const phone = sanitizePhone(value);
  if (!isValidPhone(phone)) {
    throw new Error("phone must be a valid 10-digit Indian mobile number");
  }
  return phone;
}
