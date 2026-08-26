import { expect, test } from "@playwright/test";

const articlePath = "/learn/is-my-model-good/";

test.beforeEach(async ({ page }) => {
  const response = await page.goto(articlePath);
  test.skip(response?.status() === 404, "The article is hidden in published-only builds.");
});

test("the threshold visuals expose the intended precision and recall tradeoffs", async ({ page }) => {
  const visuals = page.locator("[data-classifier-tradeoff]");
  await expect(visuals).toHaveCount(2);

  const recall = visuals.filter({ has: page.getByText("Move toward higher recall", { exact: true }) });
  await recall.getByRole("button", { name: "Capture more" }).click();
  await expect(recall).toHaveAttribute("data-stage", "target");
  await expect(recall.locator("[data-primary-metric]")).toHaveText("93.8%");
  await expect(recall.locator("[data-tradeoff-summary]")).toContainText("15 of 16 actual positives found");

  const precision = visuals.filter({ has: page.getByText("Move toward higher precision", { exact: true }) });
  await precision.getByRole("button", { name: "More selective" }).click();
  await expect(precision).toHaveAttribute("data-stage", "target");
  await expect(precision.locator("[data-primary-metric]")).toHaveText("88.9%");
  await expect(precision.locator("[data-tradeoff-summary]")).toContainText("8 of 9 positive predictions correct");
});

test("the playground recalculates metrics and changes perspective without moving dots", async ({ page }) => {
  const playground = page.locator("[data-metrics-playground]");
  await expect(playground.locator('[data-metric-value="accuracy"]')).toHaveText("90%");
  await expect(playground.locator('[data-metric-value="precision"]')).toHaveText("90%");
  await expect(playground.locator('[data-metric-value="recall"]')).toHaveText("90%");

  await playground.getByLabel("Try a pattern").selectOption("precision");
  await expect(playground.locator('[data-metric-value="precision"]')).toHaveText("100%");
  await expect(playground.locator('[data-metric-value="recall"]')).toHaveText("20%");

  const positions = await playground.locator(".playground-dot").evaluateAll((dots) =>
    dots.map((dot) => [dot.getAttribute("cx"), dot.getAttribute("cy")]),
  );
  await playground.getByRole("radio", { name: "Red" }).check();
  const positionsAfterToggle = await playground.locator(".playground-dot").evaluateAll((dots) =>
    dots.map((dot) => [dot.getAttribute("cx"), dot.getAttribute("cy")]),
  );
  expect(positionsAfterToggle).toEqual(positions);
  await expect(playground).toHaveAttribute("data-positive", "red");
});

test("every scenario renders the exact classifier distribution described in the article", async ({ page }) => {
  const scenarios = page.locator("[data-scenario-outcome]");
  await expect(scenarios).toHaveCount(6);
  await expect(scenarios.nth(0).locator("svg")).toHaveAttribute("aria-label", /Scenario 1/);

  const expectedDots = [100, 100, 100, 100, 100, 100];
  for (let index = 0; index < expectedDots.length; index += 1) {
    await expect(scenarios.nth(index).locator(".dot")).toHaveCount(expectedDots[index]);
  }
});

test("the playground uses sliders and keeps controls beside the visual on desktop", async ({ page }) => {
  const playground = page.locator("[data-metrics-playground]");
  const sliders = playground.locator('input[type="range"]');
  await expect(sliders).toHaveCount(4);
  await expect(playground.locator('input[type="number"]')).toHaveCount(0);
  await expect(playground.getByLabel("Try a pattern")).toHaveValue("balanced");
  await expect(playground.locator(".prediction-disc").first()).toHaveAttribute("r", "112");

  await sliders.nth(0).fill("30");
  await expect(playground.locator('[data-count-value="gg"]')).toHaveText("30");
  await expect(playground.locator('[data-metric-value="accuracy"]')).toHaveText("88%");

  const visual = await playground.locator(".visual-wrap").boundingBox();
  const controls = await playground.locator(".edit-panel").boundingBox();
  expect(visual).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(controls!.x).toBeGreaterThan(visual!.x);
});

test("all new visual systems remain inside the article at desktop and mobile widths", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const geometries = await page.locator(
      "[data-classifier-tradeoff], .metric-comparison, [data-metrics-playground]",
    ).evaluateAll((elements) => elements.map((element) => {
      const visual = element.getBoundingClientRect();
      const article = element.closest("article")!.getBoundingClientRect();
      return { left: visual.left, right: visual.right, articleLeft: article.left, articleRight: article.right };
    }));
    expect(geometries).toHaveLength(4);
    for (const geometry of geometries) {
      expect(geometry.left).toBeGreaterThanOrEqual(geometry.articleLeft - 1);
      expect(geometry.right).toBeLessThanOrEqual(geometry.articleRight + 1);
    }
  }
});
