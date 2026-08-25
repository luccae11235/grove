import { expect, test } from "@playwright/test";

const articlePath = "/learn/is-my-model-good/";

test.beforeEach(async ({ page }) => {
  const response = await page.goto(articlePath);
  test.skip(
    response?.status() === 404,
    "The model-evaluation article is a staging-only draft in published-only builds.",
  );
});

test("the classifier visuals derive every dot from their contextual outcome counts", async ({ page }) => {
  const visuals = page.locator("[data-classification-outcome-visual]");
  const visual = visuals.nth(0);

  await expect(visuals).toHaveCount(3);
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
  await expect(visual.locator(".dot-center")).toHaveCount(0);
  await expect(visual.getByText("one input, one prediction", { exact: true })).toHaveCount(0);
  await expect(visual.getByText("Dot color and fill", { exact: false })).toHaveCount(0);
  await expect(visual.getByText("The enclosing circle shows the model's prediction.", { exact: true })).toBeVisible();

  const screeningVisual = visuals.nth(1);
  await expect(screeningVisual.locator("svg")).toHaveAttribute(
    "aria-label",
    /Screening model routes dots.*Predicted negative circle: 18 actual negatives and 1 actual positive.*Predicted positive circle: 15 actual positives and 7 actual negatives/,
  );
  await expect(screeningVisual).toHaveAttribute("data-predicted-negative-actual-negative", "18");
  await expect(screeningVisual).toHaveAttribute("data-predicted-negative-actual-positive", "1");
  await expect(screeningVisual).toHaveAttribute("data-predicted-positive-actual-negative", "7");
  await expect(screeningVisual).toHaveAttribute("data-predicted-positive-actual-positive", "15");
  await expect(screeningVisual.getByText("Screening model", { exact: true })).toBeVisible();
  await expect(
    screeningVisual.getByText("The circles show who receives further investigation and who does not.", { exact: true }),
  ).toBeVisible();
  await expect(screeningVisual.locator('[data-prediction="negative"] [data-actual-class="positive"]')).toHaveCount(1);
  await expect(screeningVisual.locator('[data-prediction="negative"] [data-actual-class="negative"]')).toHaveCount(18);
  await expect(screeningVisual.locator('[data-prediction="positive"] [data-actual-class="positive"]')).toHaveCount(15);
  await expect(screeningVisual.locator('[data-prediction="positive"] [data-actual-class="negative"]')).toHaveCount(7);

  const spamVisual = visuals.nth(2);
  await expect(spamVisual.locator("svg")).toHaveAttribute(
    "aria-label",
    /Spam filter routes dots.*Predicted negative circle: 20 actual negatives and 8 actual positives.*Predicted positive circle: 10 actual positives and 1 actual negative/,
  );
  await expect(spamVisual).toHaveAttribute("data-predicted-negative-actual-negative", "20");
  await expect(spamVisual).toHaveAttribute("data-predicted-negative-actual-positive", "8");
  await expect(spamVisual).toHaveAttribute("data-predicted-positive-actual-negative", "1");
  await expect(spamVisual).toHaveAttribute("data-predicted-positive-actual-positive", "10");
  await expect(spamVisual.getByText("Spam filter", { exact: true })).toBeVisible();
  await expect(
    spamVisual.getByText("The circles show which messages go to spam and which remain in the inbox.", { exact: true }),
  ).toBeVisible();
  await expect(spamVisual.locator('[data-prediction="negative"] [data-actual-class="positive"]')).toHaveCount(8);
  await expect(spamVisual.locator('[data-prediction="negative"] [data-actual-class="negative"]')).toHaveCount(20);
  await expect(spamVisual.locator('[data-prediction="positive"] [data-actual-class="positive"]')).toHaveCount(10);
  await expect(spamVisual.locator('[data-prediction="positive"] [data-actual-class="negative"]')).toHaveCount(1);

  await expect(page.getByText("[IMAGEM: modelo recebendo", { exact: false })).toHaveCount(0);
  await expect(page.locator('[data-placeholder-kind="image"]')).toHaveCount(0);
  await expect(page.locator(".article-production-placeholder")).toHaveCount(9);
});

test("the classifier visual stays inside the article on desktop and mobile", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();

    const geometries = await page.locator("[data-classification-outcome-visual]").evaluateAll((elements) => elements.map((element) => {
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
        visualWidth: visual.width,
      };
    }));

    expect(geometries).toHaveLength(3);
    for (const geometry of geometries) {
      expect(geometry.visualLeft).toBeGreaterThanOrEqual(geometry.articleLeft - 1);
      expect(geometry.visualRight).toBeLessThanOrEqual(geometry.articleRight + 1);
      expect(geometry.svgLeft).toBeGreaterThanOrEqual(geometry.visualLeft);
      expect(geometry.svgRight).toBeLessThanOrEqual(geometry.visualRight);
      if (viewport.width === 1440) expect(geometry.visualWidth).toBeLessThanOrEqual(521);
    }
  }
});
