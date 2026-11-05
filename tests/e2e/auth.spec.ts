import {
  demoLogin,
  emailLink,
  expect,
  heading,
  test,
  uniqueEmail,
  visible,
} from "./fixtures";

const DEMO_PASSWORD = "VizinhoDemo2026";

test.describe("locale routing", () => {
  test("English lives at /, European Portuguese at /pt", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.goto("/pt");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-PT");
    await expect(heading(page)).toHaveText("Nunca mais perca uma entrega");
  });

  test("unknown paths render a localized 404", async ({ page, consoleErrors }) => {
    // The browser logs the document's 404 status; that is the point here.
    consoleErrors.allow(/status of 404/);
    expect((await page.goto("/does-not-exist"))?.status()).toBe(404);
    await expect(heading(page)).toHaveText("Page not found");
    expect((await page.goto("/pt/nao-existe"))?.status()).toBe(404);
    await expect(heading(page)).toHaveText("Página não encontrada");
  });
});

test.describe("log in", () => {
  test("protected page → login → back to ?next, then log out", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL("/login?next=%2Faccount");

    const email = visible(page.getByLabel("Email"));
    const password = visible(page.getByLabel("Password", { exact: true }));

    await email.fill("customer@demo.vizinho.app");
    await password.fill("wrongpass1");
    await page.getByRole("button", { name: "Log in" }).click();
    // Generic message: never reveals whether the account exists.
    await expect(
      visible(page.getByText("Email or password is incorrect.")),
    ).toBeVisible();
    await expect(email).toHaveValue("customer@demo.vizinho.app");

    await password.fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/account");
    await expect(heading(page)).toHaveText("Welcome, Carla Costa");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("an external ?next is ignored (open-redirect guard)", async ({ page }) => {
    await page.goto(`/login?next=${encodeURIComponent("//evil.example/phish")}`);
    await visible(page.getByLabel("Email")).fill("customer@demo.vizinho.app");
    await visible(page.getByLabel("Password", { exact: true })).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/customer");
  });

  for (const role of ["customer", "host", "admin"] as const) {
    test(`"Try as ${role}" signs in and lands in /${role}`, async ({ page }) => {
      await demoLogin(page, role);
      await expect(page).toHaveURL(`/${role}`);
    });
  }

  test("the login form is server-rendered (works without JavaScript)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/login?next=%2Faccount");
    await expect(page.locator('input[name="email"]')).toHaveCount(1);
    await context.close();
  });
});

test.describe("sign up", () => {
  test("validation errors are translated and keep safe input", async ({ page }) => {
    await page.goto("/pt/signup");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(
      visible(page.getByText("Tem de aceitar os termos para continuar.")),
    ).toBeVisible();
    await expect(
      visible(page.getByText("Indique o seu nome (2–100 caracteres).")),
    ).toBeVisible();

    await visible(page.getByLabel("Nome completo")).fill("Rita Sousa");
    await visible(page.getByLabel("Email")).fill(uniqueEmail("rita"));
    await visible(page.getByLabel("Palavra-passe", { exact: true })).fill("short");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(visible(page.getByText("Use pelo menos 8 caracteres."))).toBeVisible();
    await expect(visible(page.getByLabel("Nome completo"))).toHaveValue("Rita Sousa");
    await expect(page.getByRole("checkbox")).toBeChecked();
    // Passwords are never echoed back from the server.
    await expect(visible(page.getByLabel("Palavra-passe", { exact: true }))).toHaveValue(
      "",
    );
  });

  test("sign up → confirm by email → reset password → log in", async ({ page }) => {
    const email = uniqueEmail("rita");

    await page.goto("/pt/signup");
    await visible(page.getByLabel("Nome completo")).fill("Rita Sousa");
    await visible(page.getByLabel("Email")).fill(email);
    await visible(page.getByLabel("Palavra-passe", { exact: true })).fill("Lisboa2026");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(visible(page.getByText("Verifique o seu email"))).toBeVisible();

    // Unconfirmed accounts cannot log in yet.
    await page.goto("/pt/login");
    await visible(page.getByLabel("Email")).fill(email);
    await visible(page.getByLabel("Palavra-passe", { exact: true })).fill("Lisboa2026");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(visible(page.getByText(/Confirme primeiro/))).toBeVisible();

    // The confirmation email is in Portuguese and links to /pt/auth/confirm.
    const confirmation = await emailLink(page, email, "email");
    expect(confirmation.html).toContain("Confirme o seu email");
    expect(confirmation.html).toContain("Rita Sousa");
    expect(new URL(confirmation.link).pathname).toBe("/pt/auth/confirm");

    await page.goto(confirmation.link);
    await expect(page).toHaveURL(/\/pt\/account\?notice=confirmed/);
    await expect(heading(page)).toHaveText("Olá, Rita Sousa");

    // Links are single-use.
    await page.goto(confirmation.link);
    await expect(
      visible(page.getByText("Este link é inválido ou expirou")),
    ).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/forgot-password");
    await visible(page.getByLabel("Email")).fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(visible(page.getByText("Check your email"))).toBeVisible();

    const recovery = await emailLink(page, email, "recovery");
    await page.goto(recovery.link);
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.locator('input[name="password"]:visible').fill("Porto2026new");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL(/notice=passwordUpdated/);
    await expect(
      visible(page.getByText("Your password has been updated.")),
    ).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/login");
    await visible(page.getByLabel("Email")).fill(email);
    await visible(page.getByLabel("Password", { exact: true })).fill("Porto2026new");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/customer");
    // A brand-new customer has nothing on the way yet.
    await expect(visible(page.getByText("No parcels on the way"))).toBeVisible();
  });
});

test("the language switcher keeps the current page", async ({ page }) => {
  await demoLogin(page, "customer");
  await page.goto("/account");
  await page.getByRole("link", { name: /Language: Português/ }).click();
  await expect(page).toHaveURL("/pt/account");
});
