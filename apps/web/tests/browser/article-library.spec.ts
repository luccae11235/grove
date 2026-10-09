import { expect, test } from "@playwright/test";

test("topic selection shows only the chosen English articles and supports keyboard navigation", async ({ page }) => {
  await page.goto("/articles/");

  const tree = page.getByRole("tab", { name: /Decision trees/ });
  const reinforcement = page.getByRole("tab", { name: /Reinforcement learning/ });
  const time = page.getByRole("tab", { name: /Time series/ });

  await expect(tree).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: /Decision trees/ })).toBeVisible();
  await reinforcement.click();
  await expect(page).toHaveURL(/#topic-reinforcement-learning$/);
  await expect(reinforcement).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: /Reinforcement learning/ })).toBeVisible();
  await expect(page.locator("#topic-tree-based-machine-learning")).toBeHidden();
  await expect(page.getByRole("link", { name: /Reward Hacking in Reinforcement Learning/ })).toBeVisible();

  await reinforcement.press("ArrowDown");
  await expect(time).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: /How the Past Echoes/ })).toBeVisible();
  await page.reload();
  await expect(time).toHaveAttribute("aria-selected", "true");
});

test("Portuguese topic selection stays within the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pt-br/artigos/");

  await page.getByRole("tab", { name: /Aprendizado por reforço/ }).click();
  await expect(page.getByRole("tabpanel", { name: /Aprendizado por reforço/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Reward hacking/i })).toBeVisible();
  await expect(page.locator("#topic-tree-based-machine-learning")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("both catalogs link to the published model evaluation and Markov articles", async ({ page }) => {
  await page.goto("/articles/");
  await page.getByRole("tab", { name: /Foundations and evaluation/ }).click();
  await page.getByRole("link", { name: /Is My Model Good\?/ }).click();
  await expect(page).toHaveURL(/\/learn\/is-my-model-good\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Is My Model Good?" })).toBeVisible();

  await page.goto("/pt-br/artigos/");
  await page.getByRole("tab", { name: /Fundamentos e avaliação/ }).click();
  await page.getByRole("link", { name: /Meu modelo é bom\?/ }).click();
  await expect(page).toHaveURL(/\/pt-br\/learn\/meu-modelo-e-bom\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Meu modelo é bom?" })).toBeVisible();

  await page.goto("/articles/");
  await page.getByRole("tab", { name: /Reinforcement learning/ }).click();
  await page.getByRole("link", { name: "The Markov Principle" }).click();
  await expect(page).toHaveURL(/\/learn\/the-markov-principle\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "The Markov Principle" })).toBeVisible();

  await page.goto("/pt-br/artigos/");
  await page.getByRole("tab", { name: /Aprendizado por reforço/ }).click();
  await page.getByRole("link", { name: "O princípio de Markov" }).click();
  await expect(page).toHaveURL(/\/pt-br\/learn\/o-principio-de-markov\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "O princípio de Markov" })).toBeVisible();
});
