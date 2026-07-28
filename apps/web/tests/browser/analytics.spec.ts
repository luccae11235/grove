import { createHmac, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const apiOrigin = "http://127.0.0.1:3001";
const linkSecret = "observability-test-secret-at-least-32-characters";

test("makes no analytics request before a choice and persists rejection", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(apiOrigin)) requests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(250);
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(requests).toEqual([]);
});

test("acceptance starts collection and withdrawal deletes the browser profile", async ({ page }) => {
  const visitorRequest = page.waitForResponse(
    (response) => response.url() === `${apiOrigin}/v1/visitors`
      && response.request().method() === "POST",
  );
  const pageViewRequest = page.waitForResponse(
    (response) => response.url() === `${apiOrigin}/v1/events`,
  );
  await page.goto("/learn/decision-trees");
  await page.getByRole("button", { name: "Accept measurement" }).click();
  expect((await visitorRequest).status()).toBe(201);
  expect((await pageViewRequest).status()).toBe(200);
  const visitorId = await page.evaluate(() => localStorage.getItem("grove-analytics-visitor"));
  expect(visitorId).toMatch(/^[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Measurement settings" }).click();
  const revocation = page.waitForResponse(
    (response) => response.url() === `${apiOrigin}/v1/visitors/${visitorId}`
      && response.request().method() === "DELETE",
  );
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  expect((await revocation).status()).toBe(204);
  expect(await page.evaluate(() => localStorage.getItem("grove-analytics-visitor"))).toBeNull();
});

test("Portuguese consent copy is localized", async ({ page }) => {
  await page.goto("/pt-br/privacy");
  await expect(page.getByRole("button", { name: "Aceitar medição" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recusar", exact: true })).toBeVisible();
});

test("a consented confirmation browser consumes and removes a valid link fragment", async ({ page }) => {
  const subscriberId = randomUUID();
  const token = identityToken(subscriberId);
  const linkResponse = page.waitForResponse(
    (response) => response.url() === `${apiOrigin}/v1/identity/link`,
  );
  await page.goto(`/newsletter/confirmed#grove-link=${encodeURIComponent(token)}`);
  await page.getByRole("button", { name: "Accept measurement" }).click();
  expect((await linkResponse).status()).toBe(200);
  await expect.poll(() => page.url()).not.toContain("grove-link");
});

test("reading navigation remains usable after either consent choice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.getByRole("link", { name: /How to invent the decision tree/ }).click();
  await expect(page).toHaveURL(/\/learn\/decision-trees$/);
  await expect(page.getByRole("heading", {
    name: /How to invent the decision tree algorithm from scratch/,
  })).toBeVisible();
});

function identityToken(subscriberId: string) {
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    subscriberId,
    expiresAt: Math.floor(Date.now() / 1000) + 15 * 60,
    nonce: randomUUID(),
  })).toString("base64url");
  const signature = createHmac("sha256", linkSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
