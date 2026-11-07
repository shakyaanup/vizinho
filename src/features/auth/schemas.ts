import { z } from "zod";

// Error messages are translation keys (Auth.errors.*), not English text, so
// the same validation serves every language. The UI translates the key.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "emailInvalid" }));

// 72 is bcrypt's input limit; kept so the rules match a real backend.
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
