// Phone helpers. US numbers are auto-formatted as (555) 123-4567; a leading "+"
// switches to international mode where we keep the raw digits (10–15) so people
// can enter non-US numbers.

/** Format a phone value for display as the user types. */
export function formatPhone(input: string): string {
  const raw = input.trimStart()

  // International: keep the leading + and up to 15 digits, no grouping.
  if (raw.startsWith('+')) {
    return '+' + raw.replace(/\D/g, '').slice(0, 15)
  }

  let digits = raw.replace(/\D/g, '')
  // Drop a US country code typed without a + (e.g. 1 555 123 4567).
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1)
  digits = digits.slice(0, 10)

  const area = digits.slice(0, 3)
  const prefix = digits.slice(3, 6)
  const line = digits.slice(6, 10)

  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${area}`
  if (digits.length <= 6) return `(${area}) ${prefix}`
  return `(${area}) ${prefix}-${line}`
}

/** True when the value is a plausible US (10-digit) or international (+, 10–15 digit) number. */
export function isValidPhone(input: string): boolean {
  const raw = input.trim()
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return digits.length >= 10 && digits.length <= 15
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1')
}
