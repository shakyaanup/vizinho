import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { AuthHeader } from "../auth-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.forgot");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth.forgot");
  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      <ForgotPasswordForm />
    </>
  );
}
