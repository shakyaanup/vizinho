import { z } from "zod";

/** Version of the Terms/Privacy Policy a new user accepts at sign-up. */
export const TERMS_VERSION = "2026-11";

// Error messages are translation keys (Auth.errors.*), not English text, so
// the same validation serves every language. The UI translates the key.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "emailInvalid" }));

// bcrypt (used by Supabase Auth) only reads the first 72 bytes.
const newPassword = z
  .string()
  .min(8, { error: "passwordTooShort" })
  .max(72, { error: "passwordTooLong" })
  .regex(/[A-Za-z]/, { error: "passwordWeak" })
  .regex(/[0-9]/, { error: "passwordWeak" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "passwordRequired" }),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "nameRequired" })
    .max(100, { error: "nameRequired" }),
  email,
  password: newPassword,
  // An unchecked checkbox is simply absent from FormData.
  acceptTerms: z.literal("on", { error: "termsRequired" }),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });
