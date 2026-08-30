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
  test(`the ordered-checkpoint experiments expose the reward-state gap on ${viewport.name}`, async ({ page }) => {
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

    await expect(page.locator('[data-checkpoint-figure="environment"]')).toContainText("Three open paths");
    const rewardFigure = page.locator('[data-checkpoint-figure="reward"]');
    await expect(rewardFigure).toContainText("Same move into B");
    await expect(rewardFigure.getByText("+1", { exact: true })).toBeVisible();
    await expect(rewardFigure.getByText("0", { exact: true })).toBeVisible();

    const positionLab = page.getByRole("region", {
      name: "Can position alone learn the ordered route?",
    });
    const progressLab = page.getByRole("region", {
      name: "What changes when task progress is part of the state?",
    });
    await expect(positionLab).toBeVisible();
    await expect(progressLab).toBeVisible();
    await expect(positionLab).toHaveAttribute("data-mode", "position");
    await expect(progressLab).toHaveAttribute("data-mode", "progress");
    await expect(positionLab.getByText("Task progress hidden", { exact: true })).toBeVisible();
    await expect(progressLab.getByText("Next checkpoint observed", { exact: true })).toBeVisible();

    await positionLab.getByLabel("Checkpoint training speed in episodes per second").fill("2000");
    await positionLab.getByRole("button", { name: "Train agent" }).click();
    await expect
      .poll(async () => Number(await positionLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 10_000 })
      .toBe(4_000);
    await expect(positionLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-completion-rate", "0");
    await positionLab.getByRole("button", { name: "Run agent" }).click();
    const positionRun = positionLab.locator("[data-run-complete]");
    await expect.poll(async () => Number(await positionRun.getAttribute("data-run-timeouts")), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    await expect(positionRun).toHaveAttribute("data-run-complete", "0");
    await positionLab.getByRole("button", { name: "Stop agent" }).click();

    await progressLab.getByLabel("Checkpoint training speed in episodes per second").fill("2000");
    await progressLab.getByRole("button", { name: "Train agent" }).click();
    await expect
      .poll(async () => Number(await progressLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 10_000 })
      .toBe(4_000);
    await expect(progressLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-completion-rate", "100");
    await progressLab.getByRole("button", { name: "Run agent" }).click();
    const progressRun = progressLab.locator("[data-run-complete]");
    await expect.poll(async () => Number(await progressRun.getAttribute("data-run-complete")), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    await expect(progressRun).toHaveAttribute("data-run-timeouts", "0");
    await progressLab.getByRole("button", { name: "Stop agent" }).click();

    const comparison = page.locator("[data-markov-checkpoint-comparison]");
    await expect(comparison).toContainText("Position only");
    await expect(comparison).toContainText("0%");
    await expect(comparison).toContainText("Position + next");
    await expect(comparison).toContainText("100%");

    const bounds = await progressLab.evaluate((element) => {
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
