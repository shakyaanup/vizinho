import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { AuthHeader } from "../auth-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.login");
  return { title: t("title") };
}

/**
 * Reads ?next= on the server and passes it down, so the form is server-
 * rendered. (Reading it with the client hook useSearchParams would make React
 * skip SSR for the form.)
 */
async function LoginFormWithParams({
  searchParams,
}: Pick<PageProps<"/[locale]/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  const t = await getTranslations("Auth.login");
  return (
    <>
      {/* Static shell (title) prerenders; the form streams in per request. */}
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      <Suspense>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
    </>
  );
}
