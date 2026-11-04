import { Construction } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";
import type messages from "@/messages/en.json";
import { PageHeader } from "../PageHeader";

type Sections = (typeof messages)["ComingSoon"]["sections"];
type Area = keyof Sections;
type Section<A extends Area> = keyof Sections[A] & string;

type ComingSoonProps<A extends Area> = {
  area: A;
  section: Section<A>;
  /** Roadmap phase that delivers this section (docs/DEVELOPMENT_PLAN.md §9). */
  phase: number;
};

/** Placeholder for a nav section that later phases implement. */
export async function ComingSoon<A extends Area>({
  area,
  section,
  phase,
}: ComingSoonProps<A>) {
  const t = await getTranslations("ComingSoon");
  const tNav = await getTranslations("Nav");
  const key = `${area}.${section}`;

  return (
    <>
      <PageHeader
        title={tNav(key as Parameters<typeof tNav>[0])}
        actions={<Badge tone="warning">{t("badge", { phase })}</Badge>}
      />
      <EmptyState
        icon={Construction}
        title={t("body")}
        action={
          <Button asChild variant="secondary">
            <Link href={`/${area}`}>{t("backToDashboard")}</Link>
          </Button>
        }
      >
        <p>{t(`sections.${key}` as Parameters<typeof t>[0])}</p>
      </EmptyState>
    </>
  );
}

/** Page <title> for a coming-soon section, e.g. "Requests · Vizinho". */
export function comingSoonMetadata<A extends Area>(area: A, section: Section<A>) {
  return async (): Promise<Metadata> => {
    const tNav = await getTranslations("Nav");
    return { title: tNav(`${area}.${section}` as Parameters<typeof tNav>[0]) };
  };
}
