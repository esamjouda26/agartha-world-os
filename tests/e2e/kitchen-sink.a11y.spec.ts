import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const KITCHEN_SINK_URL = "/kitchen-sink";

test.describe("/kitchen-sink — Phase 2A axe a11y", () => {
  test("light mode: zero serious or critical violations", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "NEXT_THEME",
        value: "light",
        url: "http://localhost:3000",
      },
    ]);
    await page.goto(KITCHEN_SINK_URL, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (blocking.length > 0) {
      console.error(JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });

  test("dark mode: zero serious or critical violations", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "NEXT_THEME",
        value: "dark",
        url: "http://localhost:3000",
      },
    ]);
    await page.goto(KITCHEN_SINK_URL, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (blocking.length > 0) {
      console.error(JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });
});
