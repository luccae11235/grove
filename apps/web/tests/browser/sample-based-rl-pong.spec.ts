import { expect, test } from "@playwright/test";

const articlePath = "/learn/sample-based-view-of-reinforcement-learning/";

test.beforeEach(async ({ page }) => {
  const response = await page.goto(articlePath);
  test.skip(
    response?.status() === 404,
    "The sample-based RL article is a staging-only draft in published-only builds.",
  );
});

for (const viewport of [
  { name: "desktop", width: 1_440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`the Pong policies reveal different rewards on ${viewport.name}`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await expect(page.getByText("Draft", { exact: true })).toHaveCount(0);
    const transitionFigure = page.locator(
      ".sample-based-rl-transition-dynamics",
    );
    const transitionImage = transitionFigure.locator("img");
    const lab = page.getByRole("region", {
      name: "Which policy gathers more reward?",
    });
    const useful = lab.locator('[data-pong-policy="useful"]');
    const weak = lab.locator('[data-pong-policy="weak"]');

    if (viewport.name === "mobile") {
      await page
        .getByRole("complementary", { name: "In this article" })
        .getByRole("button", { name: "Close chapters" })
        .click();
    }

    await page.waitForTimeout(250);
    expect(pageErrors).toEqual([]);
    await transitionFigure.scrollIntoViewIfNeeded();
    await expect(transitionFigure).toBeVisible();

    const transitionBounds = await transitionFigure.evaluate((figure) => {
      const image = figure.querySelector("img");
      if (!image) throw new Error("Transition illustration is missing its image");
      const figureRect = figure.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      return {
        figure: {
          left: figureRect.left,
          right: figureRect.right,
          width: figureRect.width,
        },
        image: {
          left: imageRect.left,
          right: imageRect.right,
          width: imageRect.width,
          height: imageRect.height,
        },
      };
    });

    expect(transitionBounds.figure.width).toBeLessThanOrEqual(
      Math.min(760, viewport.width),
    );
    expect(transitionBounds.image.left).toBeGreaterThanOrEqual(
      transitionBounds.figure.left,
    );
    expect(transitionBounds.image.right).toBeLessThanOrEqual(
      transitionBounds.figure.right,
    );
    expect(
      transitionBounds.image.width / transitionBounds.image.height,
    ).toBeCloseTo(viewport.name === "mobile" ? 0.5 : 2, 1);
    await expect
      .poll(() =>
        transitionImage.evaluate(
          (image) => (image as HTMLImageElement).currentSrc,
        ),
      )
      .toContain(
        viewport.name === "mobile"
          ? "transition-dynamics-mobile.png"
          : "transition-dynamics.png",
      );

    await expect(lab).toBeVisible();
    await expect(useful).toHaveAttribute("data-action", "RIGHT");
    await expect(weak).toHaveAttribute("data-action", "LEFT");
    await expect(useful).toHaveAttribute("data-reward", "0");
    await expect(weak).toHaveAttribute("data-reward", "0");

    await lab.getByRole("button", { name: "Run both agents" }).click();

    await expect
      .poll(async () => Number(await useful.getAttribute("data-reward")))
      .toBeGreaterThan(0);
    await expect
      .poll(async () => Number(await weak.getAttribute("data-reward")))
      .toBeLessThan(0);

    const bounds = await lab.evaluate((element) => {
      const labRect = element.getBoundingClientRect();
      const panels = Array.from(
        element.querySelectorAll<HTMLElement>("[data-pong-policy]"),
      ).map((panel) => {
        const rect = panel.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      });
      return {
        labLeft: labRect.left,
        labRight: labRect.right,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        panels,
      };
    });

    expect(bounds.labLeft).toBeGreaterThanOrEqual(0);
    expect(bounds.labRight).toBeLessThanOrEqual(bounds.viewportWidth);
    expect(bounds.scrollWidth).toBe(bounds.viewportWidth);
    for (const panel of bounds.panels) {
      expect(panel.left).toBeGreaterThanOrEqual(bounds.labLeft);
      expect(panel.right).toBeLessThanOrEqual(bounds.labRight);
      expect(panel.width).toBeGreaterThan(0);
    }

    await lab.getByRole("button", { name: "Pause agents" }).click();
    await lab.getByRole("button", { name: "Reset" }).click();
    await expect(useful).toHaveAttribute("data-reward", "0");
    await expect(weak).toHaveAttribute("data-reward", "0");
  });
}
