import { expect, test, type Page } from "@playwright/test";

const articlePath = "/learn/the-markov-principle/";

async function openArticle(page: Page) {
  const response = await page.goto(articlePath);
  test.skip(
    response?.status() === 404,
    "The Markov principle article is a draft in published-only builds.",
  );
}

for (const viewport of [
  { name: "desktop", width: 1_440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`the matched Pong experiments stay trainable on ${viewport.name}`, async ({ page }) => {
    await openArticle(page);
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
    const positionCourt = positionLab.locator("[data-launch-index]");
    await expect(positionLab.getByRole("button", { name: "Move paddle right" })).toHaveCount(0);
    await expect(positionLab.getByRole("button", { name: "Replay final policy" })).toHaveCount(0);

    await positionLab.getByLabel("Training speed in episodes per second").fill("2000");
    await expect(positionLab).toHaveAttribute("data-training-frame-ms", "18");
    await positionLab.getByRole("button", { name: "Train agent" }).click();
    await expect(positionLab).toHaveAttribute("data-training", "true");
    await expect(ball).not.toHaveAttribute("data-ball-x", initialBallX ?? "");
    await expect
      .poll(async () => Number(await positionLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 15_000 })
      .toBe(5_000);
    await expect(positionLab).toHaveAttribute("data-training", "false");
    await expect(positionLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-hit-rate", "36");
    await expect(positionLab.getByText("36%", { exact: true })).toBeVisible();
    await expect(positionCourt).not.toHaveAttribute("data-launch-index", "0");
    await positionLab.getByRole("button", { name: "Run agent" }).click();
    const positionRun = positionLab.locator("[data-run-hits]");
    await expect.poll(async () =>
      Number(await positionRun.getAttribute("data-run-hits")) +
      Number(await positionRun.getAttribute("data-run-misses")),
    { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    await expect.poll(async () => Number(await positionRun.getAttribute("data-run-misses"))).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => Number(await positionCourt.getAttribute("data-launch-index"))).toBeGreaterThan(0);
    await positionLab.getByRole("button", { name: "Stop agent" }).click();

    await velocityLab.getByLabel("Training speed in episodes per second").fill("2000");
    await expect(velocityLab).toHaveAttribute("data-training-frame-ms", "18");
    await velocityLab.getByRole("button", { name: "Train agent" }).click();
    await expect
      .poll(async () => Number(await velocityLab.locator("[data-training-episodes]").getAttribute("data-training-episodes")), { timeout: 15_000 })
      .toBe(5_000);
    await expect(velocityLab.locator("[data-training-episodes]")).toHaveAttribute("data-active-hit-rate", "100");
    await expect(velocityLab.getByText("100%", { exact: true })).toBeVisible();
    await velocityLab.getByRole("button", { name: "Run agent" }).click();
    const velocityRun = velocityLab.locator("[data-run-hits]");
    await expect.poll(async () => Number(await velocityRun.getAttribute("data-run-hits")), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    await expect(velocityRun).toHaveAttribute("data-run-misses", "0");
    const velocityCourt = velocityLab.locator("[data-launch-index]");
    await expect(velocityCourt).toHaveAttribute("data-launch-index", "0");
    await expect(velocityCourt).toHaveAttribute("data-ball-vy", "-1");
    await expect(velocityLab.locator("[data-velocity-x][data-velocity-y]")).toHaveCount(1);
    await velocityLab.getByRole("button", { name: "Stop agent" }).click();

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

test("a paddle hit rebounds on the next playback step without a pause", async ({ page }) => {
  await page.clock.install();
  await openArticle(page);
  const lab = page.getByRole("region", { name: "What changes when velocity is part of the state?" });
  await lab.getByLabel("Training speed in episodes per second").fill("2000");
  await lab.getByRole("button", { name: "Train agent" }).click();
  await expect(lab.getByRole("button", { name: "Run agent" })).toBeVisible({ timeout: 15_000 });
  await page.clock.pauseAt(new Date());
  await lab.getByRole("button", { name: "Run agent" }).click();
  const court = lab.locator("[data-launch-index]");
  const ball = lab.locator("[data-ball-y]");
  for (let step = 0; step < 20; step += 1) {
    await page.clock.runFor(110);
    if (await court.getAttribute("data-outcome") === "hit") break;
  }
  await expect(court).toHaveAttribute("data-outcome", "hit");
  const contactY = Number(await ball.getAttribute("data-ball-y"));
  await page.clock.runFor(110);
  await lab.getByRole("button", { name: "Stop agent" }).click();
  await expect(court).toHaveAttribute("data-outcome", "playing");
  await expect(court).toHaveAttribute("data-ball-vy", "-1");
  expect(Number(await ball.getAttribute("data-ball-y"))).toBeLessThan(contactY);
  await expect(court).toHaveAttribute("data-launch-index", "0");
  expect(Number(await lab.locator("[data-run-hits]").getAttribute("data-run-hits"))).toBeGreaterThanOrEqual(1);
});
