// Basic email validation — catches obvious typos (missing @, missing domain or
// TLD, stray spaces). Intentionally permissive about the exact local/domain
// grammar; the real test is whether the confirmation email is delivered.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(input: string): boolean {
  return EMAIL_RE.test(input.trim())
}
