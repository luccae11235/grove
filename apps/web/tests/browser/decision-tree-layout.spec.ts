import { expect, test } from "@playwright/test";

const routes = ["/learn/decision-trees/", "/learn/regression-trees/"];

for (const route of routes) {
  test(`${route} keeps teaching visuals on the reading measure`, async ({ page }) => {
    await page.setViewportSize({ width: 1_600, height: 1_000 });
    await page.goto(route);

    const layout = await page.evaluate(() => {
      const articleWidth = document.querySelector<HTMLElement>(".lesson-body")
        ?.getBoundingClientRect().width;
      const teachingObjects = Array.from(document.querySelectorAll<HTMLElement>(
        ".decision-tree-figure, .regression-static, .decision-tree-interactive",
      ));

      return {
        articleWidth,
        objects: teachingObjects.map((element) => ({
          width: element.getBoundingClientRect().width,
          scrollWidth: element.scrollWidth,
        })),
      };
    });

    expect(layout.articleWidth).toBe(720);
    expect(layout.objects.length).toBeGreaterThan(0);
    expect(layout.objects.every(({ width }) => width === layout.articleWidth)).toBe(true);
    expect(layout.objects.every(({ width, scrollWidth }) => scrollWidth <= Math.ceil(width))).toBe(true);
  });

  test(`${route} remains contained on a narrow screen`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      objects: Array.from(document.querySelectorAll<HTMLElement>(
        ".decision-tree-figure, .regression-static, .decision-tree-interactive",
      )).map((element) => ({
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        width: element.getBoundingClientRect().width,
        scrollWidth: element.scrollWidth,
      })),
    }));

    expect(layout.objects.length).toBeGreaterThan(0);
    expect(layout.pageWidth).toBe(layout.viewportWidth);
    expect(layout.objects.every(({ left, right }) => left >= 0 && right <= layout.viewportWidth)).toBe(true);
    expect(layout.objects.every(({ width, scrollWidth }) => scrollWidth <= Math.ceil(width))).toBe(true);
  });
}
