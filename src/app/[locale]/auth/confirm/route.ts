import type { EmailOtpType } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: readonly EmailOtpType[] = [
  "email",
  "signup",
  "recovery",
  "email_change",
];

/**
 * Landing point for links in auth emails (confirm sign-up, reset password).
 *
 * The email contains a one-time `token_hash`, verified here on the server.
 * Unlike the PKCE code flow, this works even when the link is opened in a
 * different browser or the mail app's in-app browser.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/[locale]/auth/confirm">,
) {
  const { locale: rawLocale } = await ctx.params;
  const locale = hasLocale(routing.locales, rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const { searchParams, origin } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const to = (href: string) =>
    NextResponse.redirect(new URL(getPathname({ href, locale }), origin));

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      // Verification signed the user in; the session cookie is now set.
      return to(type === "recovery" ? "/reset-password" : "/account?notice=confirmed");
    }
  }

  return to("/login?error=linkInvalid");
}
