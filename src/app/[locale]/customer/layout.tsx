import { AppShell } from "@/components/layout/AppShell";

export default function CustomerLayout({ children }: LayoutProps<"/[locale]/customer">) {
  return <AppShell area="customer">{children}</AppShell>;
}
