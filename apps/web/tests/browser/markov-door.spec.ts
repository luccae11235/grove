import { expect, test } from "@playwright/test";

const articlePath = "/learn/the-markov-principle/";

test.beforeEach(async ({ page }) => {
  const response = await page.goto(articlePath);
  test.skip(
    response?.status() === 404,
    "The Markov principle article is a draft in published-only builds.",
  );
});

for (const viewport of [
  { name: "desktop", width: 1_440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`the door and key experiments expose the memory gap on ${viewport.name}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });

    if (viewport.name === "mobile") {
      await page
        .getByRole("complementary", { name: "In this article" })
        .getByRole("button", { name: "Close chapters" })
        .click();
    }

    await expect(page.locator('[data-door-key-figure="environment"]')).toBeVisible();
    await expect(page.locator('[data-door-key-figure="state"]')).toContainText("Position alone merges these two states");

    const positionLab = page.getByRole("region", {
      name: "Can position alone encode the return route?",
    });
    const memoryLab = page.getByRole("region", {
      name: "What changes when the key is part of the state?",
    });
    await expect(positionLab).toBeVisible();
    await expect(memoryLab).toBeVisible();
    await expect(positionLab).toHaveAttribute("data-mode", "position");
    await expect(memoryLab).toHaveAttribute("data-mode", "memory");
    await expect(positionLab.getByText("Key status hidden", { exact: true })).toBeVisible();
    await expect(memoryLab.getByText("Key remembered", { exact: true })).toBeVisible();

    await positionLab.getByLabel("Door training speed in episodes per second").fill("1500");
    await expect(positionLab).toHaveAttribute("data-training-frame-ms", "21");
    await positionLab.getByRole("button", { name: "Train agent" }).click();
    await expect(positionLab).toHaveAttribute("data-training", "true");
    await expect
      .poll(async () => Number(await positionLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 10_000 })
      .toBe(3_000);
    await expect(positionLab).toHaveAttribute("data-training", "false");
    await expect(positionLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-success-rate", "0");
    await positionLab.getByRole("button", { name: "Run agent" }).click();
    const positionRun = positionLab.locator("[data-run-goals]");
    await expect.poll(async () => Number(await positionRun.getAttribute("data-run-timeouts")), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    await expect(positionRun).toHaveAttribute("data-run-goals", "0");
    await positionLab.getByRole("button", { name: "Stop agent" }).click();

    await memoryLab.getByLabel("Door training speed in episodes per second").fill("1500");
    await expect(memoryLab).toHaveAttribute("data-training-frame-ms", "21");
    await memoryLab.getByRole("button", { name: "Train agent" }).click();
    await expect
      .poll(async () => Number(await memoryLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 10_000 })
      .toBe(3_000);
    await expect(memoryLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-success-rate", "100");
    await memoryLab.getByRole("button", { name: "Run agent" }).click();
    const memoryRun = memoryLab.locator("[data-run-goals]");
    await expect.poll(async () => Number(await memoryRun.getAttribute("data-run-goals")), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    await expect(memoryRun).toHaveAttribute("data-run-timeouts", "0");
    await memoryLab.getByRole("button", { name: "Stop agent" }).click();

    const comparison = page.locator("[data-markov-door-comparison]");
    await expect(comparison).toContainText("Position only");
    await expect(comparison).toContainText("0%");
    await expect(comparison).toContainText("Position + key");
    await expect(comparison).toContainText("100%");

    const bounds = await memoryLab.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
    expect(bounds.scrollWidth).toBe(bounds.viewportWidth);
    expect(pageErrors).toEqual([]);
  });
}
