/**
 * Shared client-side input validation & sanitization helpers.
 *
 * Users are India-only, so phone numbers are always a bare 10-digit local number
 * (no +91 country code stored). The +91 is presentation-only (placeholder / a
 * fixed prefix box) — see PhoneInput.
 */

/** Strip anything that isn't a digit and cap at 10 — what we store for a phone. */
export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** A valid Indian mobile number: exactly 10 digits, not starting with 0–5. */
export function isValidPhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(sanitizePhone(value));
}

/**
 * General-purpose text sanitizer for free-text fields (names, addresses, etc.).
 * Trims, collapses internal whitespace, and strips angle brackets so a value can
 * never be smuggled into markup. Does NOT alter the casing or content otherwise.
 */
export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

/** Light email shape check (the real check is the confirmation email itself). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** The individual password rules, evaluated live for the UI checklist. */
export function getPasswordChecks(password: string): { label: string; ok: boolean }[] {
  return [
    { label: "At least 6 characters", ok: password.length >= 6 },
    { label: "One letter (a–z)", ok: /[A-Za-z]/.test(password) },
    { label: "One number (0–9)", ok: /\d/.test(password) },
    { label: "One special character (!@#$…)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

/** True when every password rule passes. */
export function isStrongPassword(password: string): boolean {
  return getPasswordChecks(password).every((c) => c.ok);
}
