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
  test(`the shared Pong experiment stays playable on ${viewport.name}`, async ({ page }) => {
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

    const lab = page.getByRole("region", {
      name: "What changes when the agent can see velocity?",
    });
    await expect(lab).toBeVisible();
    await expect(lab).toHaveAttribute("data-mode", "position");
    await expect(lab.getByText("velocity hidden")).toBeVisible();

    const ball = lab.locator("[data-ball-x]");
    const paddle = lab.locator("[data-paddle-x]");
    const initialBallX = await ball.getAttribute("data-ball-x");
    const initialPaddleX = await paddle.getAttribute("data-paddle-x");
    await lab.getByRole("button", { name: "Move paddle right" }).click();
    await expect(ball).not.toHaveAttribute("data-ball-x", initialBallX ?? "");
    await expect(paddle).not.toHaveAttribute("data-paddle-x", initialPaddleX ?? "");

    await lab.getByLabel("Playback speed").selectOption("fast");
    await lab.getByRole("button", { name: "Train both agents" }).click();
    await expect
      .poll(async () => Number(await lab.locator("[data-training-episodes]").getAttribute("data-training-episodes")))
      .toBe(5_000);
    await expect(lab.getByText("Position only · 36%")).toBeVisible();
    await expect(lab.getByText("+ velocity · 100%")).toBeVisible();

    await lab.getByLabel(/^Position \+ velocity/).check();
    await expect(lab).toHaveAttribute("data-mode", "velocity");
    await expect(lab.getByText(/velocity \(\+1, \+1\)/)).toBeVisible();
    await expect(lab.getByRole("button", { name: "Watch learned policy" })).toBeEnabled();
    await lab.getByRole("button", { name: "Watch learned policy" }).click();
    await expect.poll(async () => lab.getAttribute("data-mode")).toBe("velocity");

    const bounds = await lab.evaluate((element) => {
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
