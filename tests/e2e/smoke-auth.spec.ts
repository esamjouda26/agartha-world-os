import { expect, test, type Page } from "@playwright/test";

// Phase 3 smoke suite. Every test title includes "@smoke" so Phase 11's
// production smoke gate can filter with `--grep @smoke`.

type Credentials = Readonly<{ email: string; password: string }>;

const PASSWORD = "Password1!";

const CREDS = (role: string): Credentials => ({
  email: `${role}@agartha.test`,
  password: PASSWORD,
});

async function login(page: Page, creds: Credentials): Promise<void> {
  await page.goto("/en/auth/login");
  await page.getByTestId("login-email").fill(creds.email);
  await page.getByTestId("login-password").fill(creds.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/auth/login"), { timeout: 15_000 }),
    page.getByTestId("login-submit").click(),
  ]);
}

test.describe("auth smoke — roles", () => {
  test("login as it_admin lands on admin portal @smoke", async ({ page }) => {
    await login(page, CREDS("it_admin"));
    await expect(page).toHaveURL(/\/en\/admin\//);
  });

  test("login as business_admin lands on admin portal @smoke", async ({ page }) => {
    await login(page, CREDS("business_admin"));
    await expect(page).toHaveURL(/\/en\/admin\//);
  });

  test("login as human_resources_manager lands on management portal @smoke", async ({ page }) => {
    await login(page, CREDS("human_resources_manager"));
    await expect(page).toHaveURL(/\/en\/management/);
  });

  test("login as fnb_crew lands on crew attendance @smoke", async ({ page }) => {
    await login(page, CREDS("fnb_crew"));
    await expect(page).toHaveURL(/\/en\/crew\/attendance/);
  });

  test("login as runner_crew lands on crew attendance @smoke", async ({ page }) => {
    await login(page, CREDS("runner_crew"));
    await expect(page).toHaveURL(/\/en\/crew\/attendance/);
  });
});

test.describe("middleware gates", () => {
  test("unauthenticated /admin/it redirects to /auth/login @smoke", async ({ page }) => {
    await page.goto("/en/admin/it");
    await expect(page).toHaveURL(/\/en\/auth\/login/);
  });

  test("fnb_crew hitting /admin/it is redirected away from admin portal @smoke", async ({
    page,
  }) => {
    await login(page, CREDS("fnb_crew"));
    await page.goto("/en/admin/it");
    await expect(page).not.toHaveURL(/\/en\/admin\//);
  });

  test("security headers present on html responses @smoke", async ({ request }) => {
    const response = await request.get("/en/auth/login");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["strict-transport-security"]).toContain("max-age");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  test("kitchen-sink returns 404 in production build @smoke", async ({ request }) => {
    // Production middleware (see middleware.ts) must 404 /kitchen-sink
    // unless the ALLOW_KITCHEN_SINK escape hatch is set. In this test run
    // the hatch is off, so the route is dev-only.
    if (process.env.NODE_ENV !== "production" && !process.env.PLAYWRIGHT_WEBSERVER) {
      test.skip(true, "kitchen-sink is only blocked in production build runs");
    }
    const response = await request.get("/kitchen-sink");
    expect(response.status()).toBe(404);
  });

  test("login rate limiter rejects after 5 attempts @smoke", async ({ page }) => {
    // Server Action is limited to 5 tokens/min/(ip|email); 6th returns
    // `RATE_LIMITED` surfaced as a toast (CLAUDE.md §11).
    await page.goto("/en/auth/login");
    const email = `ratelimit-probe-${Date.now()}@agartha.test`;
    for (let i = 0; i < 6; i++) {
      await page.getByTestId("login-email").fill(email);
      await page.getByTestId("login-password").fill("WrongPassword1!");
      await page.getByTestId("login-submit").click();
      // Wait for the response to settle before the next attempt so the
      // rate limiter sees discrete calls.
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    }
    // 6th attempt should surface the "Too many attempts" toast from
    // `toast-helpers.tsx`.
    await expect(page.getByText(/too many attempts/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("mobile responsive — bottom tab bar everywhere", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("fnb_crew on mobile sees BottomTabBar, not sidebar @smoke", async ({ page }) => {
    await login(page, CREDS("fnb_crew"));
    await expect(page.getByTestId("portal-bottom-tabs")).toBeVisible();
    await expect(page.getByTestId("portal-sidebar")).toBeHidden();
  });

  test("it_admin on mobile sees BottomTabBar — same pattern as crew @smoke", async ({ page }) => {
    await login(page, CREDS("it_admin"));
    await expect(page.getByTestId("portal-bottom-tabs")).toBeVisible();
    await expect(page.getByTestId("portal-sidebar")).toBeHidden();
  });

  test("no hamburger drawer appears on any staff portal @smoke", async ({ page }) => {
    await login(page, CREDS("it_admin"));
    await expect(page.getByTestId("portal-topbar-menu")).toHaveCount(0);
    await expect(page.getByTestId("portal-drawer")).toHaveCount(0);
  });
});

test.describe("desktop responsive — sidebar everywhere", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("it_admin on desktop sees sidebar @smoke", async ({ page }) => {
    await login(page, CREDS("it_admin"));
    await expect(page.getByTestId("portal-sidebar")).toBeVisible();
  });

  test("fnb_crew on desktop sees sidebar — not BottomTabBar @smoke", async ({ page }) => {
    await login(page, CREDS("fnb_crew"));
    await expect(page.getByTestId("portal-sidebar")).toBeVisible();
    await expect(page.getByTestId("portal-bottom-tabs")).toBeHidden();
  });

  test("command palette opens with cmd/ctrl+k in admin portal @smoke", async ({
    page,
    browserName,
  }) => {
    await login(page, CREDS("it_admin"));
    const modifier = browserName === "webkit" ? "Meta" : "Control";
    // Ensure hydration has completed and the portal shell's hotkey
    // listener is registered before dispatching Cmd/Ctrl+K.
    await expect(page.getByTestId("portal-sidebar")).toBeVisible();
    await page.locator("body").click();
    await page.keyboard.down(modifier);
    await page.keyboard.press("KeyK");
    await page.keyboard.up(modifier);
    await expect(page.getByTestId("command-palette-input")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("command palette opens in management portal @smoke", async ({ page, browserName }) => {
    await login(page, CREDS("human_resources_manager"));
    const modifier = browserName === "webkit" ? "Meta" : "Control";
    // Ensure hydration has completed and the portal shell's hotkey
    // listener is registered before dispatching Cmd/Ctrl+K.
    await expect(page.getByTestId("portal-sidebar")).toBeVisible();
    await page.locator("body").click();
    await page.keyboard.down(modifier);
    await page.keyboard.press("KeyK");
    await page.keyboard.up(modifier);
    await expect(page.getByTestId("command-palette-input")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("command palette opens in crew portal @smoke", async ({ page, browserName }) => {
    await login(page, CREDS("fnb_crew"));
    const modifier = browserName === "webkit" ? "Meta" : "Control";
    // Ensure hydration has completed and the portal shell's hotkey
    // listener is registered before dispatching Cmd/Ctrl+K.
    await expect(page.getByTestId("portal-sidebar")).toBeVisible();
    await page.locator("body").click();
    await page.keyboard.down(modifier);
    await page.keyboard.press("KeyK");
    await page.keyboard.up(modifier);
    await expect(page.getByTestId("command-palette-input")).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
