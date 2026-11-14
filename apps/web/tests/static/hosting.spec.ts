import { expect, test } from "@playwright/test";

const base = process.env.BASE_PATH ?? "/";
const origin = process.env.SITE_URL ?? "https://aflora.page";
const path = (route: string) => `${base.replace(/\/$/, "")}/${route}`;

test("static reading has RSS, no email promises and valid sharing metadata", async ({ page }) => {
  for (const locale of ["", "pt-br/"]) {
    await page.goto(path(locale));
    await expect(page.locator('input[type="email"], [data-newsletter-signup], [data-analytics-consent], [data-article-feedback]')).toHaveCount(0);
    await expect(page.getByText(/Get the next article by email|Receba o próximo artigo por e-mail/)).toHaveCount(0);
    await expect(page.locator('.hero-actions a[href$="rss.xml"]')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL(path(locale), origin).href);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new URL(path("og/aflora-card.png"), origin).href);
    await expect(page.locator('.library-card-status')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("old newsletter action links retire honestly without API calls", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", request => {
    if (request.method() === "POST" || /\/v1\/|railway\.app|api\.aflora/.test(request.url())) apiRequests.push(request.url());
  });
  for (const locale of ["", "pt-br/"]) {
    for (const route of ["confirm", "confirmed", "manage", "unsubscribe"]) {
      await page.goto(path(`${locale}newsletter/${route}/?token=old-token&status=expired`));
      await expect(page.locator("[data-newsletter-retired]")).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.locator('[data-newsletter-retired] a[href$="rss.xml"]')).toBeVisible();
    }
  }
  expect(apiRequests).toEqual([]);
});

test("article labs and Portuguese navigation work without a backend", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(path("learn/decision-trees/"));
  await expect(page.locator("h1")).toBeVisible();
  const lab = page.locator('[data-analytics-lab="threshold-intuition"]');
  await lab.getByRole("button", { name: "Reveal the clearest first division" }).click();
  await expect(lab.getByText("After checking every possible position,", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Português (Brasil)", exact: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.locator('[data-newsletter-signup], [data-analytics-consent], [data-article-feedback]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("RSS, sitemap, revision and 404 are static files", async ({ request }) => {
  for (const route of ["rss.xml", "pt-br/rss.xml", "sitemap-index.xml", "404.html", "version.json"]) {
    const response = await request.get(path(route));
    expect(response.ok(), route).toBe(true);
  }
  const version = await (await request.get(path("version.json"))).json();
  expect(version.mode).toBe("static");
  expect((await request.get(path("newsletter/email/invent-a-decision-tree/"))).status()).toBe(404);
  expect((await request.get(path("newsletter/email/invent-a-decision-tree.txt"))).status()).toBe(404);
  expect((await (await request.get(path("newsletter/manifest.json"))).json()).issues).toEqual([]);
  expect((await request.get(path("newsletter/2026/001/invent-a-decision-tree/"))).ok()).toBe(true);
});

test("published article images and licensing links stay within the deployment base", async ({ page, request }) => {
  const images = new Set<string>();
  for (const route of ["learn/acf-and-pacf/", "pt-br/learn/acf-e-pacf/", "learn/sample-based-view-of-reinforcement-learning/", "pt-br/learn/uma-visao-do-aprendizado-por-reforco-baseada-em-amostras/"]) {
    await page.goto(path(route));
    for (const src of await page.locator('img[src]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).getAttribute("src")!))) {
      expect(src.startsWith(base), src).toBe(true);
      images.add(src);
    }
    for (const srcset of await page.locator('[srcset]').evaluateAll(nodes => nodes.map(node => node.getAttribute("srcset")!))) {
      for (const candidate of srcset.split(",")) {
        const src = candidate.trim().split(/\s+/)[0];
        expect(src.startsWith(base), src).toBe(true);
        images.add(src);
      }
    }
  }
  expect(images.size).toBeGreaterThan(10);
  await Promise.all([...images].map(async src => expect((await request.get(src)).ok(), src).toBe(true)));
  for (const route of ["about/", "pt-br/about/"]) {
    await page.goto(path(route));
    await expect(page.locator('a[href$="/licensing/"]')).toHaveAttribute("href", path("licensing/"));
  }
});

test("mobile reading and historical data contact remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path("pt-br/"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/aflora-240-mobile.png", fullPage: true });
  for (const locale of ["", "pt-br/"]) {
    await page.goto(path(`${locale}privacy/`));
    if (process.env.PUBLIC_PRIVACY_CONTACT_EMAIL) {
      await expect(page.locator('article a[href^="mailto:"]')).toHaveAttribute("href", `mailto:${process.env.PUBLIC_PRIVACY_CONTACT_EMAIL}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(path(""));
  await page.screenshot({ path: "/tmp/aflora-240-desktop.png", fullPage: true });
});
