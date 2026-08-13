import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1_600, height: 1_000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`the checkpoint editing guide is prominent on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto("/learn/reward-hacking/");
    test.skip(
      response?.status() === 404 ||
        (await page.locator('meta[http-equiv="refresh"]').count()) > 0,
      "Draft article is excluded from production builds.",
    );

    await expect(
      page.getByText(
        "you can also reposition the checkpoints to see how the model learns when the route changes.",
      ),
    ).toBeVisible();

    const proxyPlayground = page.getByRole("region", {
      name: "Checkpoint proxy-reward learning playground",
    });
    const guide = proxyPlayground.getByRole("complementary").filter({
      hasText: "Try changing the route",
    });

    await expect(guide).toBeVisible();
    await expect(guide).toContainText("Drag any checkpoint");
    await expect(guide).toContainText("Learning resets automatically");

    const presentation = await guide.evaluate((element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        backgroundColor: style.backgroundColor,
        borderLeftWidth: style.borderLeftWidth,
        fontSize: Number.parseFloat(style.fontSize),
        left: bounds.left,
        right: bounds.right,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    expect(presentation.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(presentation.borderLeftWidth).toBe("3px");
    expect(presentation.fontSize).toBeGreaterThanOrEqual(11.5);
    expect(presentation.left).toBeGreaterThanOrEqual(0);
    expect(presentation.right).toBeLessThanOrEqual(presentation.viewportWidth);
  });
}
