import { expect, test } from "@playwright/test";

const articlePath = "/learn/beyond-cart-tree-architectures/";

test.beforeEach(async ({ page }) => {
  const response = await page.goto(articlePath);
  test.skip(
    response?.status() === 404,
    "The Beyond CART article is a draft in published-only builds.",
  );
});

test("the article replaces every editorial note with the complete visual sequence", async ({ page }) => {
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Beyond CART: Decision Trees Don’t Have to Look Like CART",
  })).toBeVisible();

  const expectedKinds = [
    "architecture-anatomy",
    "split-geometry",
    "hard-routing",
    "soft-routing",
    "rule-sharing",
    "batch-evaluation",
    "model-leaves",
    "design-space",
    "architecture-builder",
    "tradeoff-map",
  ];
  await expect(page.locator("[data-beyond-cart-lab]")).toHaveCount(expectedKinds.length);
  expect(await page.locator("[data-beyond-cart-lab]").evaluateAll((elements) => (
    elements.map((element) => element.getAttribute("data-beyond-cart-lab"))
  ))).toEqual(expectedKinds);

  await expect(page.locator("[data-beyond-cart-figure]")).toHaveCount(6);
  await expect(page.locator("[data-beyond-cart-animation]")).toHaveCount(2);
  await expect(page.locator("[data-beyond-cart-playground]")).toHaveCount(2);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\[(?:IMAGE|ANIMATION|PLAYGROUND):/);
});

test("soft routing becomes the hard CART limit and keeps its calculation synchronized", async ({ page }) => {
  const playground = page.locator('[data-beyond-cart-playground="soft-routing"]');
  await playground.scrollIntoViewIfNeeded();
  await expect.poll(() => playground.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);

  await expect(playground).toHaveAttribute("data-p-left", "0.731");
  await expect(playground).toHaveAttribute("data-p-right", "0.269");
  await expect(playground).toHaveAttribute("data-prediction", "3.61");

  const input = playground.getByRole("slider", { name: /Input x/i });
  const temperature = playground.getByRole("slider", { name: /Temperature/i });
  await input.fill("0");
  await expect(playground).toHaveAttribute("data-p-left", "0.500");
  await expect(playground).toHaveAttribute("data-p-right", "0.500");
  await expect(playground).toHaveAttribute("data-prediction", "5.00");

  await input.fill("-0.1");
  await temperature.fill("0");
  await expect(playground).toHaveAttribute("data-routing-mode", "hard");
  await expect(playground).toHaveAttribute("data-p-left", "1.000");
  await expect(playground).toHaveAttribute("data-p-right", "0.000");
  await expect(playground).toHaveAttribute("data-prediction", "2.00");

  await input.fill("0.1");
  await expect(playground).toHaveAttribute("data-p-left", "0.000");
  await expect(playground).toHaveAttribute("data-p-right", "1.000");
  await expect(playground).toHaveAttribute("data-prediction", "8.00");
});

test("the architecture builder composes all four choices from one computed state", async ({ page }) => {
  const builder = page.locator('[data-beyond-cart-playground="architecture-builder"]');
  await builder.scrollIntoViewIfNeeded();
  await expect.poll(() => builder.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);

  await expect(builder).toHaveAttribute("data-preset", "cart");
  await expect(builder).toHaveAttribute("data-parameter-count", "7");
  await expect(builder).toHaveAttribute("data-node-evaluations", "2");
  await expect(builder.locator("[data-surface-cell]")).toHaveCount(196);
  const cartSurface = await builder.locator("[data-surface-cell]").evaluateAll((cells) => (
    cells.map((cell) => cell.getAttribute("data-prediction-bin")).join("")
  ));

  await builder.getByRole("button", { name: "Highly relaxed" }).click();
  await expect(builder).toHaveAttribute("data-preset", "relaxed");
  await expect(builder).toHaveAttribute("data-split", "oblique");
  await expect(builder).toHaveAttribute("data-routing", "soft");
  await expect(builder).toHaveAttribute("data-rules", "independent");
  await expect(builder).toHaveAttribute("data-leaves", "linear");
  await expect(builder).toHaveAttribute("data-parameter-count", "24");
  await expect(builder).toHaveAttribute("data-node-evaluations", "3");
  const relaxedSurface = await builder.locator("[data-surface-cell]").evaluateAll((cells) => (
    cells.map((cell) => cell.getAttribute("data-prediction-bin")).join("")
  ));
  expect(relaxedSurface).not.toBe(cartSurface);

  await builder.getByRole("button", { name: "Shared by depth" }).click();
  await expect(builder).toHaveAttribute("data-preset", "custom");
  await expect(builder).toHaveAttribute("data-rules", "shared-by-depth");
  await expect(builder).toHaveAttribute("data-parameter-count", "20");
  await expect(builder).toHaveAttribute("data-node-evaluations", "2");
  const sharedRules = await builder.locator('[data-tree-node="left-rule"], [data-tree-node="right-rule"]').evaluateAll((nodes) => (
    nodes.map((node) => node.querySelector("text")?.textContent)
  ));
  expect(sharedRules[0]).toBe(sharedRules[1]);

  await builder.getByRole("button", { name: "CART", exact: true }).click();
  await expect(builder).toHaveAttribute("data-preset", "cart");
  await expect(builder).toHaveAttribute("data-parameter-count", "7");
});

test("both animations support explicit steps and timed playback", async ({ page }) => {
  const hardRouting = page.locator('[data-beyond-cart-animation="hard-routing"]');
  const batch = page.locator('[data-beyond-cart-animation="batch-evaluation"]');
  await hardRouting.scrollIntoViewIfNeeded();
  await expect.poll(() => hardRouting.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);
  await batch.scrollIntoViewIfNeeded();
  await expect.poll(() => batch.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);

  await expect(hardRouting).toHaveAttribute("data-beyond-cart-frame", "0");
  await hardRouting.getByRole("button", { name: "Next" }).click();
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-frame", "1");
  await hardRouting.locator("[data-beyond-cart-scrubber]").fill("4");
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-branch", "right");
  await expect(hardRouting.getByText("Current prediction: 8", { exact: true })).toBeVisible();
  await hardRouting.getByRole("button", { name: "Reset" }).click();
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-frame", "0");

  await hardRouting.getByRole("button", { name: "Play", exact: true }).click();
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-playing", "true");
  await expect.poll(async () => Number(await hardRouting.getAttribute("data-beyond-cart-frame")), {
    timeout: 2_500,
  }).toBeGreaterThan(0);
  await hardRouting.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-playing", "false");

  await batch.getByRole("button", { name: "Next" }).click();
  await batch.getByRole("button", { name: "Next" }).click();
  await expect(batch).toHaveAttribute("data-beyond-cart-step", "2");
  await expect(batch.getByText("Depth two · 3 of 4", { exact: true })).toBeVisible();
  await batch.getByRole("button", { name: "Reset" }).click();
  await expect(batch).toHaveAttribute("data-beyond-cart-step", "0");
});

test("reduced motion disables timed play while preserving manual explanation steps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();

  for (const kind of ["hard-routing", "batch-evaluation"]) {
    const animation = page.locator(`[data-beyond-cart-animation="${kind}"]`);
    await animation.scrollIntoViewIfNeeded();
    await expect.poll(() => animation.evaluate((element) => (
      element.closest("astro-island")?.hasAttribute("ssr") ?? false
    ))).toBe(false);
    await expect(animation.locator("[data-beyond-cart-play]")).toBeDisabled();
    await animation.locator("[data-beyond-cart-next]").click();
  }
  await expect(page.locator('[data-beyond-cart-animation="hard-routing"]')).toHaveAttribute("data-beyond-cart-frame", "1");
  await expect(page.locator('[data-beyond-cart-animation="batch-evaluation"]')).toHaveAttribute("data-beyond-cart-step", "1");
  await expect(page.getByText(/Timed play is off/)).toHaveCount(2);
});

for (const viewport of [
  { name: "desktop", width: 1_440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`all ten visuals remain contained on ${viewport.name}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize(viewport);
    await page.reload();

    const geometry = await page.locator("[data-beyond-cart-lab]").evaluateAll((visuals) => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      boxes: visuals.map((visual) => {
        const rect = visual.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    }));
    expect(geometry.boxes).toHaveLength(10);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.boxes.every((box) => box.left >= -0.5)).toBe(true);
    expect(geometry.boxes.every((box) => box.right <= geometry.viewportWidth + 0.5)).toBe(true);
    expect(geometry.boxes.every((box) => box.width > 0)).toBe(true);
    expect(pageErrors).toEqual([]);
  });
}
