import { AppShell } from "@/components/layout/AppShell";

export default function HostLayout({ children }: LayoutProps<"/[locale]/host">) {
  return <AppShell area="host">{children}</AppShell>;
}
