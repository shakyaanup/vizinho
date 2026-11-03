/**
 * Validates a user-supplied post-login destination (e.g. `?next=`).
 *
 * Only same-site relative paths are allowed. Anything else, such as
 * "https://evil.example", "//evil.example" (protocol-relative) or
 * "/\evil.example" (browsers treat \ as /), falls back to `fallback`.
 * Without this, a phishing link could log a user in and bounce them to an
 * attacker's site ("open redirect").
 */
export function safeRedirectPath(input: unknown, fallback: string): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 512)
    return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//") || input.startsWith("/\\")) return fallback;
  // Reject control characters (e.g. tab/newline tricks that browsers strip).
  if (/[\u0000-\u001F\u007F]/.test(input)) return fallback;
  return input;
}
