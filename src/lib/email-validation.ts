// Single source of truth for email shape validation across API routes.
// Deliberately pragmatic (not RFC 5322): reject whitespace/@ in the local and
// domain parts, require a dot-separated TLD of 2+ chars, and cap total length
// at the SMTP limit. Real deliverability is proven by the confirmation email,
// not the regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const EMAIL_MAX_LENGTH = 254;

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= EMAIL_MAX_LENGTH &&
    EMAIL_RE.test(value)
  );
}
