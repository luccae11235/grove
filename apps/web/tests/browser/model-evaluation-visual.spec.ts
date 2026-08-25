import { expect, test } from "@playwright/test";

const articlePath = "/learn/is-my-model-good/";

test.beforeEach(async ({ page }) => {
  const response = await page.goto(articlePath);
  test.skip(
    response?.status() === 404,
    "The model-evaluation article is a staging-only draft in published-only builds.",
  );
});

test("the first classifier visual derives every dot from configurable outcome counts", async ({ page }) => {
  const visual = page.locator("[data-classification-outcome-visual]");

  await expect(visual).toHaveCount(1);
  await expect(visual.locator("svg")).toHaveAttribute(
    "aria-label",
    /Predicted negative circle: 18 actual negatives and 6 actual positives.*Predicted positive circle: 21 actual positives and 3 actual negatives/,
  );
  await expect(visual).toHaveAttribute("data-predicted-negative-actual-negative", "18");
  await expect(visual).toHaveAttribute("data-predicted-negative-actual-positive", "6");
  await expect(visual).toHaveAttribute("data-predicted-positive-actual-negative", "3");
  await expect(visual).toHaveAttribute("data-predicted-positive-actual-positive", "21");

  const predictedNegative = visual.locator('[data-prediction="negative"]');
  const predictedPositive = visual.locator('[data-prediction="positive"]');
  await expect(predictedNegative.locator('[data-actual-class="negative"]')).toHaveCount(18);
  await expect(predictedNegative.locator('[data-actual-class="positive"]')).toHaveCount(6);
  await expect(predictedPositive.locator('[data-actual-class="negative"]')).toHaveCount(3);
  await expect(predictedPositive.locator('[data-actual-class="positive"]')).toHaveCount(21);

  await expect(page.getByText("[IMAGEM: modelo recebendo", { exact: false })).toHaveCount(0);
  await expect(page.locator(".article-production-placeholder")).toHaveCount(11);
});

test("the classifier visual stays inside the article on desktop and mobile", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();

    const geometry = await page.locator("[data-classification-outcome-visual]").evaluate((element) => {
      const visual = element.getBoundingClientRect();
      const article = element.closest("article")!.getBoundingClientRect();
      const svg = element.querySelector("svg")!.getBoundingClientRect();
      return {
        articleLeft: article.left,
        articleRight: article.right,
        visualLeft: visual.left,
        visualRight: visual.right,
        svgLeft: svg.left,
        svgRight: svg.right,
      };
    });

    expect(geometry.visualLeft).toBeGreaterThanOrEqual(geometry.articleLeft - 1);
    expect(geometry.visualRight).toBeLessThanOrEqual(geometry.articleRight + 1);
    expect(geometry.svgLeft).toBeGreaterThanOrEqual(geometry.visualLeft);
    expect(geometry.svgRight).toBeLessThanOrEqual(geometry.visualRight);
  }
});
