import { expect, test } from "@playwright/test";

const articlePath = "/learn/sample-based-view-of-reinforcement-learning/";

test.beforeEach(async ({ page }) => {
  const response = await page.goto(articlePath);
  test.skip(
    response?.status() === 404,
    "The sample-based RL article is a staging-only draft in published-only builds.",
  );
});

const visuals = [
  [".sample-based-rl-roadmap", "conceptual-shortcut"],
  [".sample-based-rl-learning-paradigms", "learning-paradigms"],
  [".sample-based-rl-pong-policy", "pong-policy"],
  [".sample-based-rl-policy-update", "policy-update"],
  [".sample-based-rl-learning-cycle", "sample-learning-cycle"],
  [".sample-based-rl-mc-td", "monte-carlo-vs-td"],
  [".sample-based-rl-policy-roles", "on-policy-vs-off-policy"],
  [".sample-based-rl-value-policy", "value-vs-policy-learning"],
  [
    ".sample-based-rl-representation",
    "tabular-vs-function-approximation",
  ],
] as const;

for (const viewport of [
  { name: "desktop", width: 1_440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`the RL visuals stay legible and contained on ${viewport.name}`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize(viewport);
    for (const [selector, filename] of visuals) {
      const figure = page.locator(selector);
      const image = figure.locator("img");
      const rasterVisual = [
        "conceptual-shortcut",
        "learning-paradigms",
        "pong-policy",
      ].includes(filename);

      await figure.scrollIntoViewIfNeeded();
      await expect(figure).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate((element) => (element as HTMLImageElement).currentSrc),
        )
        .toContain(
          viewport.name === "mobile"
            ? `${filename}-mobile.${rasterVisual ? "png" : "svg"}`
            : `${filename}.${rasterVisual ? "png" : "svg"}`,
        );

      const bounds = await figure.evaluate((element) => {
        const imageElement = element.querySelector("img");
        if (!imageElement) throw new Error("RL figure is missing its image");
        const figureRect = element.getBoundingClientRect();
        const imageRect = imageElement.getBoundingClientRect();
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
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      const maximumWidth =
        filename === "pong-policy"
          ? 680
          : rasterVisual
            ? 720
            : 760;
      expect(bounds.figure.width, `${filename} figure width`).toBeLessThanOrEqual(
        Math.min(maximumWidth, viewport.width),
      );
      expect(bounds.image.left).toBeGreaterThanOrEqual(bounds.figure.left);
      expect(bounds.image.right).toBeLessThanOrEqual(bounds.figure.right);
      expect(bounds.image.width / bounds.image.height).toBeCloseTo(
        filename === "conceptual-shortcut"
          ? viewport.name === "mobile"
            ? 2 / 3
            : 1774 / 560
          : filename === "pong-policy"
            ? viewport.name === "mobile"
              ? 1 / 2
              : 2
            : filename === "sample-learning-cycle"
              ? viewport.name === "mobile"
                ? 1024 / 1380
                : 1774 / 700
              : filename === "monte-carlo-vs-td"
                ? viewport.name === "mobile"
                  ? 1024 / 1840
                  : 1774 / 1040
                : viewport.name === "mobile"
                  ? 2 / 3
                  : 2,
        1,
      );
      expect(bounds.figure.left).toBeGreaterThanOrEqual(0);
      expect(bounds.figure.right).toBeLessThanOrEqual(bounds.viewportWidth);
      expect(bounds.scrollWidth).toBe(bounds.viewportWidth);
    }

    expect(pageErrors).toEqual([]);
  });
}
