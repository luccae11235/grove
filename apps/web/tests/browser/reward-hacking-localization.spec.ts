import { expect, test } from "@playwright/test";

test("the complete Reward Hacking lesson is available in Brazilian Portuguese", async ({ page }) => {
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  await page.goto("/pt-br/learn/reward-hacking/");
  test.skip(
    (await page.locator('meta[http-equiv="refresh"]').count()) > 0,
    "Draft article is excluded from production builds.",
  );

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Reward hacking no aprendizado por reforço",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "English", exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-analytics-lab]")).toHaveCount(7);
  await expect(page.getByText("Experimente mudar a rota").first()).toBeVisible();
  await expect(page.getByText("Sala de entrega de pacotes").first()).toBeVisible();
  await expect(page.getByText("O que o controlador espera").first()).toBeVisible();

  const text = await page.locator("body").innerText();
  expect(text).toContain("loop dos checkpoints");
  expect(text).not.toMatch(/\blaç(?:o|os|a|as)\b/i);
  expect(text).not.toContain("Ready to learn");
  expect(text).not.toContain("Training speed");
  expect(text).not.toContain("Run learned agent");
  expect(text).not.toContain("100% speed");
  expect(text).not.toContain("Q(state,");
});

test("the Portuguese lesson and playgrounds remain contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pt-br/learn/reward-hacking/");
  test.skip(
    (await page.locator('meta[http-equiv="refresh"]').count()) > 0,
    "Draft article is excluded from production builds.",
  );

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    labs: Array.from(document.querySelectorAll<HTMLElement>("[data-analytics-lab]")).map(
      (element) => {
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right };
      },
    ),
  }));

  expect(layout.labs).toHaveLength(7);
  expect(layout.pageWidth).toBe(layout.viewportWidth);
  expect(layout.labs.every(({ left, right }) => left >= 0 && right <= layout.viewportWidth)).toBe(true);
});
