import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return <AppShell area="admin">{children}</AppShell>;
}
