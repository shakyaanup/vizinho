import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { requireUser } from "@/lib/auth/session";
import { AuthHeader } from "../auth-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.reset");
  return { title: t("title") };
}

// Reached from the recovery email, which signs the user in first.
async function ResetGate() {
  await requireUser("/reset-password");
  return <ResetPasswordForm />;
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("Auth.reset");
  return (
    <>
      <AuthHeader title={t("title")} />
      <Suspense fallback={<Spinner size="lg" />}>
        <ResetGate />
      </Suspense>
    </>
  );
}
