import { expect, test } from "@playwright/test";

test("ACF breakout playgrounds match the article reading width", async ({ page }) => {
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  await page.goto("/learn/acf-and-pacf/");
  test.skip(await page.locator('meta[http-equiv="refresh"]').count() > 0, "Draft article is excluded from production builds.");

  const widths = await page.evaluate(() => ({
    article: document.querySelector<HTMLElement>(".acf-article")?.getBoundingClientRect().width,
    breakouts: Array.from(document.querySelectorAll<HTMLElement>(".acf-playground-breakout"))
      .map((element) => element.getBoundingClientRect().width),
    inline: document.querySelector<HTMLElement>(".acf-inline-playground")
      ?.getBoundingClientRect().width,
  }));

  expect(widths.article).toBe(720);
  expect(widths.inline).toBe(widths.article);
  expect(widths.breakouts).toEqual([widths.article, widths.article]);
});

test("ACF playgrounds remain contained on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/acf-and-pacf/");
  test.skip(await page.locator('meta[http-equiv="refresh"]').count() > 0, "Draft article is excluded from production builds.");

  const layout = await page.evaluate(() => ({
    breakoutWidths: Array.from(document.querySelectorAll<HTMLElement>(".acf-playground-breakout"))
      .map((element) => element.getBoundingClientRect().width),
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));

  expect(layout.breakoutWidths).toHaveLength(2);
  expect(layout.breakoutWidths.every((width) => width <= layout.viewportWidth)).toBe(true);
  expect(layout.pageWidth).toBe(layout.viewportWidth);
});
