import en from "@/messages/en.json";
import { APP_ROLES } from "@/lib/auth/roles";
import { isNavItemActive, NAV_ITEMS } from "./nav-config";

describe("isNavItemActive", () => {
  const home = { href: "/host", exact: true };
  const requests = { href: "/host/requests" };

  it("matches an area home only exactly", () => {
    expect(isNavItemActive("/host", home)).toBe(true);
    expect(isNavItemActive("/host/requests", home)).toBe(false);
  });

  it("keeps a section active on its sub-pages", () => {
    expect(isNavItemActive("/host/requests", requests)).toBe(true);
    expect(isNavItemActive("/host/requests/abc", requests)).toBe(true);
  });

  it("does not match a different section with the same prefix", () => {
    expect(isNavItemActive("/host/requests-archive", requests)).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it.each(APP_ROLES)(
    "%s items have translated labels and stay inside the area",
    (role) => {
      for (const item of NAV_ITEMS[role]) {
        expect(item.href === `/${role}` || item.href.startsWith(`/${role}/`)).toBe(true);
        expect(
          (en.Nav[role] as Record<string, string>)[item.labelKey as string],
        ).toBeTruthy();
      }
    },
  );

  it.each(APP_ROLES)("%s has at most 5 items (fits a phone tab bar)", (role) => {
    expect(NAV_ITEMS[role].length).toBeLessThanOrEqual(5);
  });
});
