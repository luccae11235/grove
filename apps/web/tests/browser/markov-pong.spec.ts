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
  test(`the matched Pong experiments stay trainable on ${viewport.name}`, async ({ page }) => {
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

    const positionLab = page.getByRole("region", {
      name: "Can a position-only agent learn to return the ball?",
    });
    const velocityLab = page.getByRole("region", {
      name: "What changes when velocity is part of the state?",
    });
    await expect(positionLab).toBeVisible();
    await expect(velocityLab).toBeVisible();
    await expect(positionLab).toHaveAttribute("data-mode", "position");
    await expect(velocityLab).toHaveAttribute("data-mode", "velocity");
    await expect(positionLab.getByText("Velocity hidden", { exact: true })).toBeVisible();
    await expect(velocityLab.getByText("Velocity observed", { exact: true })).toBeVisible();

    const ball = positionLab.locator("[data-ball-x]");
    const initialBallX = await ball.getAttribute("data-ball-x");
    await expect(positionLab.getByRole("button", { name: "Move paddle right" })).toHaveCount(0);
    await expect(positionLab.getByRole("button", { name: "Replay final policy" })).toHaveCount(0);

    await positionLab.getByLabel("Training speed in episodes per second").fill("2000");
    await positionLab.getByRole("button", { name: "Train agent" }).click();
    await expect(ball).not.toHaveAttribute("data-ball-x", initialBallX ?? "");
    await expect
      .poll(async () => Number(await positionLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 15_000 })
      .toBe(5_000);
    await expect(positionLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-hit-rate", "36");
    await expect(positionLab.getByText("36%", { exact: true })).toBeVisible();

    await velocityLab.getByLabel("Training speed in episodes per second").fill("2000");
    await velocityLab.getByRole("button", { name: "Train agent" }).click();
    await expect
      .poll(async () => Number(await velocityLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 15_000 })
      .toBe(5_000);
    await expect(velocityLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-hit-rate", "100");
    await expect(velocityLab.getByText("100%", { exact: true })).toBeVisible();

    const comparison = page.locator("[data-markov-pong-comparison]");
    await expect(comparison).toContainText("Position only");
    await expect(comparison).toContainText("36%");
    await expect(comparison).toContainText("Position + velocity");
    await expect(comparison).toContainText("100%");

    const bounds = await velocityLab.evaluate((element) => {
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
