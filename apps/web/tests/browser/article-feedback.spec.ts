import { expect, test } from "@playwright/test";

const apiOrigin = "http://127.0.0.1:3001";

test("submits and updates article feedback after analytics rejection", async ({ page }) => {
  await page.goto("/learn/decision-trees");
  await page.getByRole("button", { name: "Reject", exact: true }).click();

  const feedback = page.getByRole("region", { name: "Was this article useful?" });
  await expect(feedback).toBeVisible();
  await feedback.getByText("Yes", { exact: true }).click();
  await feedback.getByLabel("What most influenced your answer? (optional)").selectOption("clear");
  await feedback.getByLabel("Anything else? (optional)").fill("The visual example helped.");
  const created = page.waitForResponse(
    (response) => response.url() === `${apiOrigin}/v1/feedback`
      && response.request().method() === "POST",
  );
  await feedback.getByRole("button", { name: "Submit feedback" }).click();
  expect((await created).status()).toBe(201);
  await expect(feedback.getByRole("status")).toContainText("response was saved");

  await page.reload();
  const restored = page.getByRole("region", { name: "Was this article useful?" });
  await expect(restored.getByLabel("Anything else? (optional)")).toHaveValue("The visual example helped.");
  await restored.getByText("Not really", { exact: true }).click();
  await restored.getByLabel("What most influenced your answer? (optional)").selectOption("confusing");
  const updated = page.waitForResponse(
    (response) => response.url().startsWith(`${apiOrigin}/v1/feedback/`)
      && response.request().method() === "PUT",
  );
  await restored.getByRole("button", { name: "Save changes" }).click();
  expect((await updated).status()).toBe(200);
});

test("feedback copy is localized in Portuguese", async ({ page }) => {
  await page.goto("/pt-br/learn/decision-trees");
  const feedback = page.getByRole("region", { name: "Este artigo foi útil?" });
  await expect(feedback).toBeVisible();
  await expect(feedback.getByText("Não muito", { exact: true })).toBeVisible();
});

test("feedback is not rendered on non-article pages", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("[data-article-feedback]")).toHaveCount(0);
});

test("feedback remains contained and usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/decision-trees");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  const feedback = page.getByRole("region", { name: "Was this article useful?" });
  const box = await feedback.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await feedback.getByText("Not really", { exact: true }).click();
  await expect(feedback.getByRole("button", { name: "Submit feedback" })).toHaveCSS("width", `${box!.width}px`);
});
