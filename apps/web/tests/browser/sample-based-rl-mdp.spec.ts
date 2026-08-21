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
  test(`the MDP loop produces one ordered sample on ${viewport.name}`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    const figure = page.locator(".sample-based-rl-mdp-loop");
    const image = figure.locator("img");
    const returnsFigure = page.locator(".sample-based-rl-discounted-returns");
    const returnsImage = returnsFigure.locator("img");
    const machine = page.getByRole("region", {
      name: "Watch the MDP produce a trajectory",
    });
    const rail = machine.locator("[data-mdp-trajectory-rail]");

    if (viewport.name === "mobile") {
      await page
        .getByRole("complementary", { name: "In this article" })
        .getByRole("button", { name: "Close chapters" })
        .click();
    }

    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((element) => (element as HTMLImageElement).currentSrc),
      )
      .toContain(viewport.name === "mobile" ? "mdp-loop-mobile.png" : "mdp-loop.png");

    const figureBounds = await figure.evaluate((element) => {
      const imageElement = element.querySelector("img");
      if (!imageElement) throw new Error("MDP figure is missing its image");
      const figureRect = element.getBoundingClientRect();
      const imageRect = imageElement.getBoundingClientRect();
      return {
        figure: { left: figureRect.left, right: figureRect.right, width: figureRect.width },
        image: {
          left: imageRect.left,
          right: imageRect.right,
          width: imageRect.width,
          height: imageRect.height,
        },
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(figureBounds.figure.width).toBeLessThanOrEqual(
      Math.min(760, viewport.width),
    );
    expect(figureBounds.image.left).toBeGreaterThanOrEqual(figureBounds.figure.left);
    expect(figureBounds.image.right).toBeLessThanOrEqual(figureBounds.figure.right);
    expect(figureBounds.image.width / figureBounds.image.height).toBeCloseTo(
      viewport.name === "mobile" ? 2 / 3 : 2,
      1,
    );

    await returnsFigure.scrollIntoViewIfNeeded();
    await expect(returnsFigure).toBeVisible();
    await expect
      .poll(() =>
        returnsImage.evaluate(
          (element) => (element as HTMLImageElement).currentSrc,
        ),
      )
      .toContain(
        viewport.name === "mobile"
          ? "discounted-returns-aligned-mobile.svg"
          : "discounted-returns-aligned.svg",
      );
    const returnsBounds = await returnsFigure.evaluate((element) => {
      const imageElement = element.querySelector("img");
      if (!imageElement) throw new Error("Return illustration is missing its image");
      const figureRect = element.getBoundingClientRect();
      const imageRect = imageElement.getBoundingClientRect();
      return {
        figure: { left: figureRect.left, right: figureRect.right, width: figureRect.width },
        image: {
          left: imageRect.left,
          right: imageRect.right,
          width: imageRect.width,
          height: imageRect.height,
        },
      };
    });
    expect(returnsBounds.figure.width).toBeLessThanOrEqual(
      Math.min(760, viewport.width),
    );
    expect(returnsBounds.image.left).toBeGreaterThanOrEqual(returnsBounds.figure.left);
    expect(returnsBounds.image.right).toBeLessThanOrEqual(returnsBounds.figure.right);
    expect(returnsBounds.image.width / returnsBounds.image.height).toBeCloseTo(
      viewport.name === "mobile" ? 2 / 3 : 2,
      1,
    );

    await machine.scrollIntoViewIfNeeded();
    await expect(machine).toBeVisible();

    const calloutSpacing = await machine.evaluate((element) => {
      const policy = element.querySelector<HTMLElement>("[data-mdp-policy-callout]");
      const actionPath = element.querySelector<SVGPathElement>("[data-mdp-action-path]");
      const responses = element.querySelector<HTMLElement>("[data-mdp-response-callouts]");
      const responsePath = element.querySelector<SVGPathElement>("[data-mdp-response-path]");
      if (!policy || !actionPath || !responses || !responsePath) {
        throw new Error("MDP diagram spacing targets are missing");
      }
      const policyRect = policy.getBoundingClientRect();
      const actionRect = actionPath.getBoundingClientRect();
      const responsesRect = responses.getBoundingClientRect();
      const responseRect = responsePath.getBoundingClientRect();
      return {
        policyGap: actionRect.top - policyRect.bottom,
        responseGap: responsesRect.top - responseRect.bottom,
      };
    });
    expect(calloutSpacing.policyGap).toBeGreaterThanOrEqual(8);
    expect(calloutSpacing.responseGap).toBeGreaterThanOrEqual(8);

    await expect(rail.locator("[data-token-kind]")).toHaveText(["s0"]);
    await machine.getByRole("button", { name: "Run the loop" }).click();

    await expect(machine).toHaveAttribute("data-phase", "policy");
    await expect(rail.locator("[data-token-kind]")).toHaveText(["s0", "a0"]);
    await expect(machine).toHaveAttribute("data-phase", "reward");
    await expect(rail.locator("[data-token-kind]")).toHaveText([
      "s0",
      "a0",
      "r1",
    ]);
    await expect(machine).toHaveAttribute("data-phase", "transition");
    await expect(rail.locator("[data-token-kind]")).toHaveText([
      "s0",
      "a0",
      "r1",
      "s1",
    ]);
    await machine.getByRole("button", { name: "Pause loop" }).click();

    const machineBounds = await machine.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(machineBounds.left).toBeGreaterThanOrEqual(0);
    expect(machineBounds.right).toBeLessThanOrEqual(machineBounds.viewportWidth);
    expect(machineBounds.scrollWidth).toBe(machineBounds.viewportWidth);
    expect(figureBounds.scrollWidth).toBe(figureBounds.viewportWidth);
    expect(pageErrors).toEqual([]);

    await machine.getByRole("button", { name: "Reset" }).click();
    await expect(rail.locator("[data-token-kind]")).toHaveText(["s0"]);
  });
}
