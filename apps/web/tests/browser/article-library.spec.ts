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
