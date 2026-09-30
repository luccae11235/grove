import { expect, test } from "@playwright/test";

const portuguesePath = "/pt-br/learn/o-principio-de-markov/";
const englishPath = "/learn/the-markov-principle/";

test("the Markov lesson and its six experiments read naturally in Brazilian Portuguese", async ({ page }) => {
  await page.goto(portuguesePath);
  test.skip(
    (await page.locator('meta[http-equiv="refresh"]').count()) > 0,
    "The draft is excluded from published-only builds.",
  );

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1, name: "O princípio de Markov" })).toBeVisible();
  await expect(page.locator("[data-analytics-lab]")).toHaveCount(6);
  await expect(page.locator("[data-markov-pong-comparison]")).toContainText("Posição + velocidade");
  await expect(page.locator("[data-markov-door-comparison]")).toContainText("Posição + chave");
  await expect(page.locator("[data-markov-checkpoint-comparison]")).toContainText("Posição + próximo");
  await expect(page.locator("[data-markov-synthesis]")).toContainText("Dinâmica ausente");
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`${englishPath}$`));

  const article = await page.locator(".markov-principle-article").innerText();
  for (const english of ["Train agent", "Run agent", "Training speed", "Missing dynamics", "Same position. Same action."]) {
    expect(article).not.toContain(english);
  }

  const pong = page.locator('[data-markov-pong-lab][data-mode="position"]');
  await pong.getByRole("button", { name: "Treinar agente" }).click();
  await expect(pong.getByRole("button", { name: /Pausar|Executar agente/ })).toBeVisible();
});

test("both Markov versions link to each other", async ({ page }) => {
  await page.goto(englishPath);
  await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute("href", new RegExp(`${portuguesePath}$`));
});

test("the Portuguese article and experiments fit a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(portuguesePath);
  test.skip(
    (await page.locator('meta[http-equiv="refresh"]').count()) > 0,
    "The draft is excluded from published-only builds.",
  );

  const bounds = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    visuals: Array.from(document.querySelectorAll<HTMLElement>(
      "[data-analytics-lab], [data-markov-pong-comparison], [data-markov-door-comparison], [data-markov-checkpoint-comparison], [data-markov-synthesis]",
    )).map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    }),
  }));
  expect(bounds.visuals).toHaveLength(10);
  expect(bounds.page).toBe(bounds.viewport);
  expect(bounds.visuals.every(({ left, right }) => left >= 0 && right <= bounds.viewport)).toBe(true);
});
