import { chromium } from "@playwright/test";

async function run(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/kitchen-sink", { waitUntil: "networkidle" });

  const wide = await page.evaluate(() => {
    const offenders: Array<{ selector: string; right: number; width: number }> = [];
    const all = document.body.getElementsByTagName("*");
    for (let i = 0; i < all.length; i += 1) {
      const el = all[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 2) {
        let cur: HTMLElement | null = el.parentElement;
        let scrollable = false;
        while (cur) {
          const style = getComputedStyle(cur);
          if (
            style.overflowX === "auto" ||
            style.overflowX === "scroll" ||
            style.overflowX === "hidden"
          ) {
            scrollable = true;
            break;
          }
          cur = cur.parentElement;
        }
        if (scrollable) continue;
        const id = el.id ? `#${el.id}` : "";
        const cls =
          typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : "";
        offenders.push({
          selector: `${el.tagName.toLowerCase()}${id}${cls ? `.${cls}` : ""}`,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    }
    return offenders.sort((a, b) => b.right - a.right).slice(0, 20);
  });

  console.info(JSON.stringify(wide, null, 2));
  await browser.close();
}

void run();
