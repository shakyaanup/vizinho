import { readLocale } from "@/i18n/form-locale";
import { homePathForRoles, isAppRole } from "@/lib/auth/roles";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { signIn } from "@/lib/auth/session";
import { DomainError } from "@/mocks/errors";
import { DEMO_USER_IDS } from "@/mocks/seed";
import { getDemoState, transact } from "@/mocks/store";
import { fieldErrorsFrom, type AuthErrorCode, type FormState } from "./form-state";
import { hashPassword } from "./password";
import { loginSchema, signupSchema } from "./schemas";
import { findUserByCredentials, registerUser } from "./service";

// Form actions for useActionState, run in the browser against the mock store.
// On success they return where to go; the form navigates there.

export async function logIn(
  _prev: FormState<"email" | "password">,
  formData: FormData,
): Promise<FormState<"email" | "password">> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email },
    };
  }

  const hash = await hashPassword(parsed.data.email, parsed.data.password);
  const user = findUserByCredentials(getDemoState().db, parsed.data.email, hash);
  if (!user) {
    // Same message for "no such user" and "wrong password": no account enumeration.
    return { status: "error", formError: "invalidCredentials", values: { email } };
  }

  signIn(user.id);
  return {
    status: "success",
    // ?next= is user input: only same-site paths are followed (open-redirect guard).
    redirectTo: safeRedirectPath(formData.get("next"), homePathForRoles(user.roles)),
  };
}

type SignupField = "fullName" | "email" | "password" | "acceptTerms";

export async function signUp(
  _prev: FormState<SignupField>,
  formData: FormData,
): Promise<FormState<SignupField>> {
  // Echoed back so the form keeps them after a validation error (never the password).
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    acceptTerms: formData.get("acceptTerms") === "on" ? "on" : "",
  };
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const { fullName, email, password } = parsed.data;
  const passwordHash = await hashPassword(email, password);
  try {
    const user = transact((db) =>
      registerUser(db, { fullName, email, passwordHash, locale: readLocale(formData) }),
    );
    // No email confirmation in the demo: the new account is signed in at once.
    signIn(user.id);
  } catch (error) {
    const code: AuthErrorCode =
      error instanceof DomainError && error.code === "emailTaken"
        ? "emailTaken"
        : "unexpected";
    return { status: "error", formError: code, values };
  }

  return { status: "success", redirectTo: "/customer" };
}

export async function demoLogIn(
  _prev: FormState<never>,
  formData: FormData,
): Promise<FormState<never>> {
  const role = formData.get("role");
  if (!isAppRole(role)) return { status: "error", formError: "unexpected" };

  signIn(DEMO_USER_IDS[role]);
  // Demo visitors land straight in the area they chose.
  return { status: "success", redirectTo: `/${role}` };
}
