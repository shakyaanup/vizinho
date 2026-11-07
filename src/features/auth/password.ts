/**
 * SHA-256 of the password salted with the email. Only so the demo never keeps
 * a readable password in localStorage; real password storage needs a slow,
 * salted hash on a server (the original design used Supabase Auth's bcrypt).
 */
export async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`vizinho-demo:${email}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
}
