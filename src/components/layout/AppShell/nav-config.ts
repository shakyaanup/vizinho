import {
  Boxes,
  CalendarClock,
  Gauge,
  House,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Package,
  ScrollText,
  Store,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type messages from "@/messages/en.json";
import type { AppRole } from "@/lib/auth/roles";

type NavMessages = (typeof messages)["Nav"];

export type NavItem<A extends AppRole = AppRole> = {
  href: string;
  /** Key under Nav.<area> in the message files. */
  labelKey: keyof NavMessages[A];
  icon: LucideIcon;
  /** Only active on an exact match (used for each area's home). */
  exact?: boolean;
};

export const NAV_ITEMS: { [A in AppRole]: NavItem<A>[] } = {
  customer: [
    { href: "/customer", labelKey: "home", icon: House, exact: true },
    { href: "/customer/hosts", labelKey: "findHost", icon: MapPin },
    { href: "/customer/reservations", labelKey: "parcels", icon: Package },
    { href: "/customer/help", labelKey: "help", icon: LifeBuoy },
  ],
  host: [
    { href: "/host", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
    { href: "/host/requests", labelKey: "requests", icon: Inbox },
    { href: "/host/parcels", labelKey: "storage", icon: Boxes },
    { href: "/host/schedule", labelKey: "schedule", icon: CalendarClock },
    { href: "/host/earnings", labelKey: "earnings", icon: Wallet },
  ],
  admin: [
    { href: "/admin", labelKey: "overview", icon: Gauge, exact: true },
    { href: "/admin/hosts", labelKey: "hosts", icon: Store },
    { href: "/admin/reservations", labelKey: "reservations", icon: Package },
    { href: "/admin/incidents", labelKey: "incidents", icon: TriangleAlert },
    { href: "/admin/audit", labelKey: "audit", icon: ScrollText },
  ],
};

/**
 * Is this nav item the current page? Section items also stay active on their
 * sub-pages (/host/requests/123 highlights "Requests").
 * `pathname` is locale-free (next-intl's usePathname strips the /pt prefix).
 */
export function isNavItemActive(pathname: string, item: Pick<NavItem, "href" | "exact">) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
