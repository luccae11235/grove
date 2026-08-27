import { expect, test } from "@playwright/test";

const englishRoute = "/learn/is-my-model-good/";
const portugueseRoute = "/pt-br/learn/meu-modelo-e-bom/";

test("both drafts expose the foundational level and each other's locale", async ({ page }) => {
  let response = await page.goto(englishRoute);
  test.skip(response?.status() === 404, "The model-evaluation article is hidden in published-only builds.");

  await expect(page.getByText("Foundational", { exact: true })).toBeVisible();
  await expect(page.getByText("No prior machine-learning knowledge required", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Português (Brasil)", exact: true }).first()).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute(
    "href",
    /\/pt-br\/learn\/meu-modelo-e-bom\/$/,
  );

  response = await page.goto(portugueseRoute);
  expect(response?.ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByText("Fundamental", { exact: true })).toBeVisible();
  await expect(page.getByText("Não exige conhecimento prévio de aprendizado de máquina", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "English", exact: true }).first()).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    "href",
    /\/learn\/is-my-model-good\/$/,
  );
});

test("the complete Portuguese article localizes its visuals and interactions", async ({ page }) => {
  const response = await page.goto(portugueseRoute);
  test.skip(response?.status() === 404, "The Portuguese draft is hidden in published-only builds.");

  await expect(page.getByRole("heading", { level: 1, name: "Meu modelo é bom?" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Cenários" })).toBeVisible();
  await expect(page.locator("[data-classification-outcome-visual]")).toHaveCount(3);
  await expect(page.locator("[data-classifier-tradeoff]")).toHaveCount(2);
  await expect(page.locator("[data-scenario-outcome]")).toHaveCount(6);

  const firstVisual = page.locator("[data-classification-outcome-visual]").first();
  await expect(firstVisual.getByText("Classificador binário", { exact: true })).toBeVisible();
  await expect(firstVisual.getByText("Positivo real", { exact: true })).toBeVisible();
  await expect(firstVisual.locator("svg")).toHaveAttribute(
    "aria-label",
    /Círculo de previsão negativa: 18 negativos reais e 6 positivos reais/,
  );

  const recallTradeoff = page.locator('[data-classifier-tradeoff][data-mode="recall"]');
  await recallTradeoff.getByRole("button", { name: "Capturar mais" }).click();
  await expect(recallTradeoff.locator("[data-tradeoff-summary]")).toContainText(
    "15 de 16 positivos reais encontrados",
  );

  const comparison = page.locator("[data-scenario-model-comparison]");
  await expect(comparison.locator("section").first()).toContainText(
    /Acurácia\s*80%.*Precisão\s*100%.*Recall\s*60%/s,
  );

  const playground = page.locator("[data-metrics-playground]");
  await expect(playground.getByLabel("Experimente um padrão")).toHaveValue("balanced");
  await expect(playground).toContainText("Muda a perspectiva, não os pontos.");
  await playground.getByLabel("Experimente um padrão").selectOption("precision");
  await expect(playground.locator('[data-metric-value="precision"]')).toHaveText("100%");
  await expect(playground.locator('[data-metric-value="recall"]')).toHaveText("20%");
  await playground.getByRole("radio", { name: "Vermelho" }).check();
  await expect(playground.locator("[data-live-summary]")).toContainText("Classe positiva vermelha");
});

test("the Portuguese draft remains contained on desktop and mobile", async ({ page }) => {
  for (const viewport of [
    { width: 1_440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const response = await page.goto(portugueseRoute);
    test.skip(response?.status() === 404, "The Portuguese draft is hidden in published-only builds.");

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      visuals: Array.from(document.querySelectorAll<HTMLElement>(
        "[data-classification-outcome-visual], [data-classifier-tradeoff], .metric-comparison, [data-scenario-model-comparison], [data-metrics-playground]",
      )).map((element) => {
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right };
      }),
    }));

    expect(layout.visuals).toHaveLength(8);
    expect(layout.visuals.every(({ left, right }) => left >= 0 && right <= layout.viewportWidth)).toBe(true);
  }
});
