import { expect, test } from "@playwright/test";

const articlePath = "/learn/bagging-reduces-tree-variance/";

test("the revised article uses two matched experiments and places static explanations where needed", async ({ page }) => {
  await page.goto(articlePath);

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Why averaging trees makes predictions more stable",
  })).toBeVisible();

  const visuals = page.locator("[data-bagging-visual]");
  await expect(visuals).toHaveCount(4);
  await expect(page.locator('[data-bagging-visual="variance"]')).toHaveCount(1);
  await expect(page.locator('[data-bagging-visual="ensemble"]')).toHaveCount(1);
  await expect(page.getByRole("img", { name: "Sampling six observations with replacement" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Three tree predictions become one ensemble prediction" })).toBeVisible();

  const overviewFollowsBagging = await page.evaluate(() => {
    const heading = document.querySelector("#bagging");
    const overview = document.querySelector('[data-bagging-visual="overview"]');
    return Boolean(heading && overview && (heading.compareDocumentPosition(overview) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(overviewFollowsBagging).toBe(true);
});

test("math renders once with KaTeX and remains contained", async ({ page }) => {
  await page.goto(articlePath);

  await expect(page.locator(".katex-error")).toHaveCount(0);
  const math = page.locator(".katex").first();
  await expect(math).toBeVisible();
  const styles = await math.evaluate((element) => {
    const mathml = element.querySelector<HTMLElement>(".katex-mathml");
    const visual = element.querySelector<HTMLElement>(".katex-html");
    if (!mathml || !visual) throw new Error("Expected both accessible and visual KaTeX layers.");
    const mathmlStyle = getComputedStyle(mathml);
    return {
      visualFont: getComputedStyle(visual).fontFamily,
      mathmlPosition: mathmlStyle.position,
      mathmlWidth: mathmlStyle.width,
      mathmlHeight: mathmlStyle.height,
      mathmlOverflow: mathmlStyle.overflow,
    };
  });
  expect(styles.visualFont).toContain("KaTeX");
  expect(styles.mathmlPosition).toBe("absolute");
  expect(styles.mathmlWidth).toBe("1px");
  expect(styles.mathmlHeight).toBe("1px");
  expect(styles.mathmlOverflow).toBe("hidden");
});

test("one-tree episodes learn, predict, and feed the histogram", async ({ page }) => {
  await page.goto(articlePath);
  const experiment = page.locator('[data-bagging-visual="variance"]');

  await expect(experiment).toHaveAttribute("data-phase", "idle");
  await expect(experiment).toHaveAttribute("data-history-count", "0");
  await experiment.getByRole("button", { name: "Run one episode" }).click();
  await expect(experiment).toHaveAttribute("data-phase", "fitting", { timeout: 2_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "0");
  await expect(experiment).toHaveAttribute("data-phase", "committed", { timeout: 7_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "1");
  await expect(experiment.getByText(/Episode 1 added/)).toBeVisible();

  await experiment.getByRole("button", { name: "Show data process" }).click();
  await expect(experiment.locator("[data-process-layer]")).toBeVisible();

  await experiment.getByRole("button", { name: "1×" }).click();
  await experiment.getByRole("button", { name: "Play" }).click();
  await expect(experiment).toHaveAttribute("data-history-count", "2", { timeout: 3_000 });
  await experiment.getByRole("button", { name: "Pause" }).click();
  const pausedCount = await experiment.getAttribute("data-history-count");
  await page.waitForTimeout(1_200);
  await expect(experiment).toHaveAttribute("data-history-count", pausedCount!);
});

test("the bagged experiment keeps fair histories for each selected tree count", async ({ page }) => {
  await page.goto(articlePath);
  const experiment = page.locator('[data-bagging-visual="ensemble"]');

  await experiment.getByRole("button", { name: "2", exact: true }).click();
  await expect(experiment).toHaveAttribute("data-tree-count", "2");
  await experiment.getByRole("button", { name: "Run one episode" }).click();
  await expect(experiment).toHaveAttribute("data-phase", "committed", { timeout: 7_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "1");

  await experiment.getByRole("button", { name: "5", exact: true }).click();
  await expect(experiment).toHaveAttribute("data-tree-count", "5");
  await expect(experiment).toHaveAttribute("data-history-count", "1");
  await experiment.getByRole("button", { name: "25", exact: true }).click();
  await expect(experiment).toHaveAttribute("data-tree-count", "25");
  await expect(experiment).toHaveAttribute("data-history-count", "1");
});

test("both experiments stay within the article measure on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(articlePath);

  const desktop = await page.evaluate(() => {
    const articleWidth = document.querySelector<HTMLElement>(".lesson-body")!.getBoundingClientRect().width;
    return {
      articleWidth,
      widths: Array.from(document.querySelectorAll<HTMLElement>('[data-bagging-visual="variance"], [data-bagging-visual="ensemble"]'))
        .map((element) => element.getBoundingClientRect().width),
    };
  });
  expect(desktop.widths).toHaveLength(2);
  expect(desktop.widths.every((width) => Math.abs(width - desktop.articleWidth) < 1)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobile = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    visualsContained: Array.from(document.querySelectorAll<HTMLElement>("[data-bagging-visual]"))
      .every((element) => element.scrollWidth <= element.clientWidth + 1),
    displayMathContained: Array.from(document.querySelectorAll<HTMLElement>(".bagging-article .katex-display"))
      .every((element) => element.getBoundingClientRect().width <= document.documentElement.clientWidth),
  }));
  expect(mobile.pageWidth).toBe(mobile.viewportWidth);
  expect(mobile.visualsContained).toBe(true);
  expect(mobile.displayMathContained).toBe(true);
});

test("reduced motion disables autoplay but preserves a stepped episode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(articlePath);
  const experiment = page.locator('[data-bagging-visual="variance"]');

  await expect(experiment.getByRole("button", { name: "Play" })).toBeDisabled();
  await page.waitForTimeout(1_100);
  await expect(experiment).toHaveAttribute("data-history-count", "0");
  await experiment.getByRole("button", { name: "Run one episode" }).click();
  await expect(experiment).toHaveAttribute("data-phase", "committed", { timeout: 4_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "1");
});
