import { expect, test } from "@playwright/test";

const article = "/learn/why-regression-trees-stop-at-the-edge/";
const portugueseArticle = "/pt-br/learn/por-que-arvores-de-regressao-param-na-borda/";
test.use({ hasTouch: true });

test("axis slider explores the fitted tree and both tails with keyboard and pointer", async ({ page }) => {
  await page.goto(article);
  test.skip(await page.locator("[data-extrapolation-lab]").count() === 0, "Draft article is absent from the production build");
  const lab = page.locator("[data-extrapolation-lab]");
  const slider = lab.getByRole("slider", { name: "Explore x" });
  const output = lab.locator("[data-prediction-value]");

  await expect(page.locator(".article-meta .difficulty-badge")).toContainText("Foundational");
  await expect(page.locator(".article-meta .quick-read-badge")).toHaveText("Quick read");
  await expect(lab.getByRole("textbox")).toHaveCount(0);
  await expect(slider).toHaveValue("9.5");
  await expect(output).toHaveText("6.65");

  await slider.focus();
  await slider.press("End");
  await expect(slider).toHaveValue("10");
  await expect(output).toHaveText("6.65");
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  await expect(output).toHaveText("2.4");

  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width * 0.55, box!.y + box!.height / 2);
  await expect(lab).toHaveAttribute("data-prediction", "5.2");
  const beforeArrow = Number(await slider.inputValue());
  await slider.press("ArrowRight");
  expect(Number(await slider.inputValue())).toBeCloseTo(beforeArrow + 0.1, 8);
  await expect(output).toHaveText("5.2");
});

test("Portuguese mobile slider and chart stay visible without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(portugueseArticle);
  test.skip(await page.locator("[data-extrapolation-lab]").count() === 0, "Draft article is absent from the production build");
  const lab = page.locator("[data-extrapolation-lab]");
  const slider = lab.getByRole("slider", { name: "Explore x" });
  await expect(page.locator(".article-meta .difficulty-badge")).toContainText("Fundamental");
  await expect(page.locator(".article-meta .quick-read-badge")).toHaveText("Leitura rápida");
  await expect(slider).toBeVisible();
  await slider.focus();
  await slider.press("Home");
  await expect(lab.locator("[data-prediction-value]")).toHaveText("2,4");
  await slider.press("End");
  await expect(lab.locator("[data-prediction-value]")).toHaveText("6,65");
  await slider.scrollIntoViewIfNeeded();
  const track = await slider.boundingBox();
  expect(track).not.toBeNull();
  await page.touchscreen.tap(track!.x + track!.width * 0.9, track!.y + track!.height / 2);
  expect(Number(await slider.inputValue())).toBeGreaterThan(8.2);
  await expect(lab.locator("[data-prediction-value]")).toHaveText("6,65");
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport);
  const bounds = await lab.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(390);
});

test("only the new article has the Quick read marker in the catalog", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".library-card");
  test.skip(await cards.locator(".quick-read-badge").count() === 0, "Draft article is absent from the production build");
  await expect(cards.locator(".quick-read-badge")).toHaveCount(1);
  await expect(cards.filter({ has: page.locator(".quick-read-badge") })).toHaveAttribute("href", article);
  await page.goto("/articles/");
  const topicCards = page.locator(".topic-article");
  await expect(topicCards.locator(".quick-read-badge")).toHaveCount(1);
  await expect(topicCards.filter({ has: page.locator(".quick-read-badge") })).toHaveAttribute("href", article);
  await page.goto("/learn/regression-trees/");
  await expect(page.locator(".quick-read-badge")).toHaveCount(0);
});
