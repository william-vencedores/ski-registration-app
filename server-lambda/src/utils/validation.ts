// Shared lightweight validators. Kept permissive — these reject obvious garbage
// (missing @, missing domain/TLD, whitespace) without trying to fully model the
// email grammar.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(input: string | undefined | null): boolean {
  return typeof input === 'string' && EMAIL_RE.test(input.trim());
}
