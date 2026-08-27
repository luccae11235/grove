import { expect, test } from "@playwright/test";

test("the production article library excludes drafts", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Draft", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", {
    name: /How decision trees learn to predict numbers/,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: /Reward Hacking in Reinforcement Learning/,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: /Why averaging trees makes predictions more stable/,
  })).toHaveCount(0);
  await expect(page.getByRole("link", {
    name: /How the Past Echoes: Understanding ACF and PACF/,
  })).toBeVisible();

  await page.goto("/learn/regression-trees/");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "How decision trees learn to predict numbers",
  })).toBeVisible();

  await page.goto("/learn/reward-hacking/");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Reward Hacking in Reinforcement Learning",
  })).toBeVisible();

  await page.goto("/learn/acf-and-pacf/");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "How the Past Echoes: Understanding ACF and PACF",
  })).toBeVisible();

  await page.goto("/learn/bagging-reduces-tree-variance/");
  await expect(page).toHaveURL(/\/$/);
});

test("the published reading flow is complete in Brazilian Portuguese", async ({ page }) => {
  await page.goto("/");

  const portuguese = page.getByRole("link", { name: "Português (Brasil)", exact: true }).first();
  await expect(portuguese).toBeVisible();
  await portuguese.click();

  await expect(page).toHaveURL(/\/pt-br\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1, name: /Aprendizado de máquina/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Como árvores de decisão aprendem a prever números/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Como inventar o algoritmo de árvore de decisão do zero/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Como o passado ecoa: entendendo ACF e PACF/ })).toBeVisible();

  await page.getByRole("link", { name: /Como árvores de decisão aprendem a prever números/ }).click();
  await expect(page).toHaveURL(/\/pt-br\/learn\/regression-trees\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Como árvores de decisão aprendem a prever números" })).toBeVisible();
  await expect(page.getByText("Experimento 1 · avalie cada divisão")).toBeVisible();
  await expect(page.getByRole("link", { name: "English", exact: true }).first()).toBeVisible();

  await page.goto("/pt-br/learn/decision-trees/");
  await expect(page.getByText(/\blaço(s)?\b/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dois loops e uma memória" })).toBeVisible();
});
