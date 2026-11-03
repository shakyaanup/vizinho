"use server";

import type { AuthError } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { getPathname, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demo-accounts";
import { fieldErrorsFrom, type AuthErrorCode, type FormState } from "./form-state";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  TERMS_VERSION,
} from "./schemas";

// Server Actions can't read the [locale] route segment, so each form posts it
// in a hidden field. Anything unexpected falls back to the default locale.
function readLocale(formData: FormData): Locale {
  const value = formData.get("locale");
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

/** Absolute URL of the email-link handler, in the user's language. */
function confirmUrl(locale: Locale) {
  return new URL(
    getPathname({ href: "/auth/confirm", locale }),
    publicEnv.NEXT_PUBLIC_SITE_URL,
  ).toString();
}

/** Maps Supabase Auth errors to our translation keys. Unknown errors are logged, not shown. */
function authErrorCode(error: AuthError, context: string): AuthErrorCode {
  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";
    case "weak_password":
      return "passwordWeak";
    case "same_password":
      return "passwordSame";
    default:
      console.error(`[auth:${context}] unexpected error`, error.code ?? error.name);
      return "unexpected";
  }
}

const DEFAULT_AFTER_LOGIN = "/account";

// -----------------------------------------------------------------------------

export async function logIn(
  _prev: FormState<"email" | "password">,
  formData: FormData,
): Promise<FormState<"email" | "password">> {
  const locale = readLocale(formData);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for "no such user" and "wrong password": no account enumeration.
    return {
      status: "error",
      formError: authErrorCode(error, "login"),
      values: { email },
    };
  }

  redirect({ href: safeRedirectPath(formData.get("next"), DEFAULT_AFTER_LOGIN), locale });
  return { status: "idle" }; // unreachable: redirect() throws
}

export async function signUp(
  _prev: FormState<"fullName" | "email" | "password" | "acceptTerms">,
  formData: FormData,
): Promise<FormState<"fullName" | "email" | "password" | "acceptTerms">> {
  const locale = readLocale(formData);
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmUrl(locale),
      // Read by the sign-up trigger: name, language, and the accepted terms version.
      data: { full_name: parsed.data.fullName, locale, terms_version: TERMS_VERSION },
    },
  });

  if (error) {
    return { status: "error", formError: authErrorCode(error, "signup"), values };
  }

  // Supabase answers identically whether or not the email is already
  // registered, so attackers can't probe which emails have accounts.
  return { status: "success", email: parsed.data.email };
}

export async function requestPasswordReset(
  _prev: FormState<"email">,
  formData: FormData,
): Promise<FormState<"email">> {
  const locale = readLocale(formData);
  const email = String(formData.get("email") ?? "");
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(locale),
  });

  if (
    error?.code === "over_email_send_rate_limit" ||
    error?.code === "over_request_rate_limit"
  ) {
    return { status: "error", formError: "rateLimited", values: { email } };
  }
  if (error) authErrorCode(error, "reset-request"); // log only

  // Always "success": never reveal whether an account exists.
  return { status: "success", email: parsed.data.email };
}

export async function updatePassword(
  _prev: FormState<"password">,
  formData: FormData,
): Promise<FormState<"password">> {
  const locale = readLocale(formData);
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", formError: authErrorCode(error, "update-password") };
  }

  redirect({ href: "/account?notice=passwordUpdated", locale });
  return { status: "idle" };
}

export async function signOut(formData: FormData): Promise<void> {
  const locale = readLocale(formData);
  const supabase = await createClient();
  // "local" ends this browser's session only; other devices stay signed in.
  await supabase.auth.signOut({ scope: "local" });
  redirect({ href: "/", locale });
}

export async function demoLogIn(
  _prev: FormState<never>,
  formData: FormData,
): Promise<FormState<never>> {
  const locale = readLocale(formData);
  const role = formData.get("role");
  if (!APP_ROLES.includes(role as AppRole)) {
    return { status: "error", formError: "unexpected" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role as AppRole],
    password: DEMO_PASSWORD,
  });
  if (error) {
    console.error("[auth:demo] demo sign-in failed", error.code ?? error.name);
    return { status: "error", formError: "demoUnavailable" };
  }

  redirect({ href: DEFAULT_AFTER_LOGIN, locale });
  return { status: "idle" };
}
