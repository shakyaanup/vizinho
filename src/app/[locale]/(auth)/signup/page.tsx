import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { AuthHeader } from "../auth-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signup");
  return { title: t("title") };
}

export default async function SignupPage() {
  const t = await getTranslations("Auth.signup");
  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      <SignupForm />
    </>
  );
}
