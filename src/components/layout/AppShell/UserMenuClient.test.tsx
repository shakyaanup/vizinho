import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import messages from "@/messages/en.json";
import { UserMenuClient } from "./UserMenuClient";

// The real modules need a Next.js runtime; the menu only needs these shapes.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={String(href)} {...props} />,
  usePathname: () => "/host",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

function renderMenu(props: Partial<ComponentProps<typeof UserMenuClient>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <UserMenuClient
        area="host"
        name="Hugo Martins"
        email="host@demo.vizinho.app"
        roles={["customer", "host"]}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("UserMenuClient", () => {
  beforeEach(() => localStorage.clear());

  it("opens for a multi-role user and lists only their areas as links", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    const host = screen.getByRole("menuitem", { name: "Host" });
    expect(host).toHaveAttribute("href", "/host");
    expect(host).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("menuitem", { name: "Customer" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.queryByRole("menuitem", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("hides the area switcher for single-role users", async () => {
    const user = userEvent.setup();
    renderMenu({ area: "customer", roles: ["customer"] });

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.queryByText("Switch area")).not.toBeInTheDocument();
  });

  it("switches and remembers the theme", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("vizinho-theme")).toBe("dark");
  });
});
