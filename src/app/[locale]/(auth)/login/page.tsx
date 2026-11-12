import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { AuthHeader } from "../auth-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.login");
  return { title: t("title") };
}

export default async function LoginPage() {
  const t = await getTranslations("Auth.login");
  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      {/* Fully static: the form reads ?next= itself in the browser. */}
      <LoginForm />
    </>
  );
}
