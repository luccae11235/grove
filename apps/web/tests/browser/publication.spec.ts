import { expect, test } from "@playwright/test";

test("the production article library excludes drafts", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Draft", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", {
    name: /How decision trees learn to predict numbers/,
  })).toHaveCount(0);

  await page.goto("/learn/regression-trees/");
  await expect(page).toHaveURL(/\/$/);
});
