import { expect, test } from "@playwright/test";

test("the complete ACF and PACF lesson is available in Brazilian Portuguese", async ({ page }) => {
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pt-br/learn/acf-e-pacf/");

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Como o passado ecoa: entendendo ACF e PACF",
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "English", exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-analytics-lab]")).toHaveCount(4);
  await expect(page.locator(".acf-article img")).toHaveCount(12);
  await expect(page.getByText("Vendas ao longo do tempo")).toBeVisible();
  await expect(page.getByText("Construa a série")).toBeVisible();

  const visualSources = await page.locator(".acf-article img").evaluateAll((images) =>
    images.map((image) => image.getAttribute("src")),
  );
  expect(visualSources).toHaveLength(12);
  expect(visualSources.every((source) => source?.includes("/acf-pacf/pt-br/"))).toBe(true);

  const text = await page.locator("body").innerText();
  expect(text).not.toContain("Sales over time");
  expect(text).not.toContain("Scan pairs");
  expect(text).not.toContain("Build the series");
  expect(text).not.toContain("Middle values predict both ends");

  await page.getByRole("button", { name: "Construir série" }).click();
  await expect(page.getByText("160 de 160 observações")).toBeVisible();
  await expect(page.getByRole("button", { name: "Repetir", exact: true })).toBeVisible();

  for (const lab of [
    "autocorrelation-scan",
    "synthetic-ar1-autocorrelation",
    "synthetic-ar1-partial-autocorrelation",
  ]) {
    const range = page.locator(`[data-analytics-lab="${lab}"] input[type="range"]`);
    await range.evaluate((input: HTMLInputElement) => {
      input.value = "100";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  await expect(page.getByText(/O lag 1 está completo\. O resultado foi salvo/).first()).toBeVisible();
  await expect(page.getByText(/O lag 1 está completo\. A PACF foi salva/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Repetir varredura" })).toHaveCount(3);
});

test("the English ACF and PACF lesson exposes its Brazilian Portuguese translation", async ({ page }) => {
  await page.goto("/learn/acf-and-pacf/");

  await expect(
    page.getByRole("link", { name: "Português (Brasil)", exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute(
    "href",
    /\/pt-br\/learn\/acf-e-pacf\/$/,
  );
});

test("the Portuguese ACF and PACF lesson remains contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pt-br/learn/acf-e-pacf/");

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    labs: Array.from(document.querySelectorAll<HTMLElement>("[data-analytics-lab]"))
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right };
      }),
  }));

  expect(layout.labs).toHaveLength(4);
  expect(layout.pageWidth).toBe(layout.viewportWidth);
  expect(layout.labs.every(({ left, right }) => left >= 0 && right <= layout.viewportWidth)).toBe(true);
});
