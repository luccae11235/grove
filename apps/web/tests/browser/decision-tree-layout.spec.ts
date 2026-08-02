import { expect, test } from "@playwright/test";

const routes = ["/learn/decision-trees/", "/learn/regression-trees/"];

for (const route of routes) {
  test(`${route} keeps teaching visuals on their intended measure`, async ({ page }) => {
    await page.setViewportSize({ width: 1_600, height: 1_000 });
    await page.goto(route);
    test.skip(await page.locator('meta[http-equiv="refresh"]').count() > 0, "Draft article is excluded from production builds.");

    const layout = await page.evaluate(() => {
      const articleWidth = document.querySelector<HTMLElement>(".lesson-body")
        ?.getBoundingClientRect().width;
      const teachingObjects = Array.from(document.querySelectorAll<HTMLElement>(
        ".decision-tree-figure, .regression-static, .decision-tree-interactive",
      ));

      return {
        articleWidth,
        objects: teachingObjects.map((element) => ({
          isRegressionWorkspace: element.classList.contains("regression-tree-workspace"),
          width: element.getBoundingClientRect().width,
          scrollWidth: element.scrollWidth,
        })),
      };
    });

    expect(layout.articleWidth).toBe(720);
    expect(layout.objects.length).toBeGreaterThan(0);
    expect(layout.objects.every(({ isRegressionWorkspace, width }) => (
      isRegressionWorkspace ? width === 1_160 : width === layout.articleWidth
    ))).toBe(true);
    expect(layout.objects.every(({ width, scrollWidth }) => scrollWidth <= Math.ceil(width))).toBe(true);
  });

  test(`${route} remains contained on a narrow screen`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    test.skip(await page.locator('meta[http-equiv="refresh"]').count() > 0, "Draft article is excluded from production builds.");

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

test("regression playgrounds keep synchronized views compact on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  await page.goto("/learn/regression-trees/");
  test.skip(await page.locator('meta[http-equiv="refresh"]').count() > 0, "Draft article is excluded from production builds.");

  const layout = await page.evaluate(() => {
    const workspaces = Array.from(document.querySelectorAll<HTMLElement>(".regression-tree-workspace"));
    const growth = workspaces[0];
    const features = workspaces[1];
    const growthPanels = growth?.querySelectorAll<HTMLElement>("[class*='plotPanel'], [class*='treePanel']");
    const table = features?.querySelector<HTMLElement>("[role='region'][aria-label='Greenhouse training data']");
    const tableHeader = table?.querySelector<HTMLElement>("thead th");
    const chaptersPanel = document.querySelector<HTMLElement>(".article-chapters-panel");

    return {
      workspaceWidths: workspaces.map((workspace) => workspace.getBoundingClientRect().width),
      workspaceRightEdges: workspaces.map((workspace) => workspace.getBoundingClientRect().right),
      chaptersPanelLeft: chaptersPanel?.getBoundingClientRect().left ?? null,
      growthPanelTops: growthPanels ? Array.from(growthPanels).map((panel) => panel.getBoundingClientRect().top) : [],
      table: table ? {
        clientHeight: table.clientHeight,
        scrollHeight: table.scrollHeight,
        overflowY: getComputedStyle(table).overflowY,
      } : null,
      tableHeaderPosition: tableHeader ? getComputedStyle(tableHeader).position : null,
    };
  });

  expect(layout.workspaceWidths).toEqual([1_160, 1_160]);
  expect(layout.chaptersPanelLeft).not.toBeNull();
  expect(layout.workspaceRightEdges.every((right) => right < (layout.chaptersPanelLeft ?? 0))).toBe(true);
  expect(layout.growthPanelTops).toHaveLength(2);
  expect(Math.abs(layout.growthPanelTops[0] - layout.growthPanelTops[1])).toBeLessThan(2);
  expect(layout.table).not.toBeNull();
  expect(layout.table?.scrollHeight).toBeGreaterThan(layout.table?.clientHeight ?? 0);
  expect(layout.table?.clientHeight).toBeLessThanOrEqual(150);
  expect(layout.table?.overflowY).toBe("auto");
  expect(layout.tableHeaderPosition).toBe("sticky");
});
