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

test("soft routing exposes the threshold exception and an explicit hard-rule mode", async ({ page }) => {
  const playground = page.locator('[data-beyond-cart-playground="soft-routing"]');
  await playground.scrollIntoViewIfNeeded();
  await expect.poll(() => playground.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);

  await expect(playground.getByText("Try one controlled change.", { exact: true })).toBeVisible();
  await expect(playground).toHaveAttribute("data-p-left", "0.450");
  await expect(playground).toHaveAttribute("data-p-right", "0.550");
  await expect(playground).toHaveAttribute("data-prediction", "5.30");

  const input = playground.getByRole("slider", { name: /Input x/i });
  const temperature = playground.getByRole("slider", { name: /Temperature/i });
  await expect(playground.getByRole("slider")).toHaveCount(2);
  await expect(input).toHaveAttribute("data-beyond-cart-axis-slider", "true");
  await expect(temperature.locator("xpath=ancestor::div[contains(@class, 'softControls')]")).toBeVisible();
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

  await temperature.fill("1");
  await input.fill("0.2");
  const axis = await input.boundingBox();
  expect(axis).not.toBeNull();
  if (!axis) return;
  const thumbX = axis.x + 13 + (axis.width - 26) * (3.2 / 6);
  await page.mouse.move(thumbX, axis.y + axis.height / 2);
  await page.mouse.down();
  await page.mouse.move(thumbX - 36, axis.y + axis.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Number(await playground.getAttribute("data-x"))).toBeLessThan(0);
});

test("the architecture builder guides one-axis changes without implying model fitting", async ({ page }) => {
  const builder = page.locator('[data-beyond-cart-playground="architecture-builder"]');
  await builder.scrollIntoViewIfNeeded();
  await expect.poll(() => builder.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);

  await expect(builder).toHaveAttribute("data-dataset", "diagonal");
  await expect(builder).toHaveAttribute("data-sample-count", "36");
  await expect(builder).toHaveAttribute("data-rule-count", "3");
  await expect(builder).toHaveAttribute("data-node-evaluations", "2");
  await expect(builder.getByText(/hand-set example.*not compare training quality/i)).toBeVisible();
  await expect(builder.getByLabel("Surface color scale from prediction zero to prediction one")).toBeVisible();
  await expect(builder.locator("[data-surface-cell]")).toHaveCount(196);
  await expect(builder.locator("[data-point-id]")).toHaveCount(36);
  const cartSurface = await builder.locator("[data-surface-cell]").evaluateAll((cells) => (
    cells.map((cell) => cell.getAttribute("data-prediction-bin")).join("")
  ));

  await builder.getByRole("button", { name: "XOR", exact: true }).click();
  await expect(builder).toHaveAttribute("data-dataset", "xor");
  await expect(builder.locator('[data-point-id^="xor-"]')).toHaveCount(36);
  const xorSurface = await builder.locator("[data-surface-cell]").evaluateAll((cells) => (
    cells.map((cell) => cell.getAttribute("data-prediction-bin")).join("")
  ));
  expect(xorSurface).not.toBe(cartSurface);

  await builder.getByRole("button", { name: "Oblique", exact: true }).click();
  await builder.getByRole("button", { name: "Soft", exact: true }).click();
  await builder.getByRole("button", { name: "Linear", exact: true }).click();
  await expect(builder).toHaveAttribute("data-split", "oblique");
  await expect(builder).toHaveAttribute("data-routing", "soft");
  await expect(builder).toHaveAttribute("data-rules", "independent");
  await expect(builder).toHaveAttribute("data-leaves", "linear");
  await expect(builder).toHaveAttribute("data-rule-count", "3");
  await expect(builder).toHaveAttribute("data-node-evaluations", "3");
  const relaxedSurface = await builder.locator("[data-surface-cell]").evaluateAll((cells) => (
    cells.map((cell) => cell.getAttribute("data-prediction-bin")).join("")
  ));
  expect(relaxedSurface).not.toBe(cartSurface);

  await builder.getByRole("button", { name: "Shared by depth" }).click();
  await expect(builder).toHaveAttribute("data-rules", "shared-by-depth");
  await expect(builder).toHaveAttribute("data-rule-count", "2");
  await expect(builder).toHaveAttribute("data-node-evaluations", "2");
  const sharedRules = await builder.locator('[data-tree-node="left-rule"], [data-tree-node="right-rule"]').evaluateAll((nodes) => (
    nodes.map((node) => node.querySelector("text")?.textContent)
  ));
  expect(sharedRules[0]).toBe(sharedRules[1]);

  await builder.getByRole("button", { name: "Reset to CART", exact: true }).click();
  await expect(builder).toHaveAttribute("data-split", "axis-aligned");
  await expect(builder).toHaveAttribute("data-routing", "hard");
  await expect(builder).toHaveAttribute("data-rules", "independent");
  await expect(builder).toHaveAttribute("data-leaves", "constant");
  await expect(builder).toHaveAttribute("data-rule-count", "3");

  await builder.getByRole("button", { name: "Offset steps", exact: true }).click();
  await expect(builder).toHaveAttribute("data-dataset", "offset-steps");
  await expect(builder.locator('[data-point-id^="offset-steps-"]')).toHaveCount(36);
});

test("hard routing uses the dot on the input axis while batch playback keeps its steps", async ({ page }) => {
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

  const input = hardRouting.getByRole("slider", { name: /Input x on the tree axis/i });
  await expect(hardRouting.getByRole("slider")).toHaveCount(1);
  await expect(hardRouting.getByRole("button")).toHaveCount(0);
  await expect(input).toHaveAttribute("data-beyond-cart-axis-slider", "true");
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-branch", "left");
  await expect(hardRouting.getByText(/Observation x = −0\.05 follows the left branch/)).toBeVisible();
  await input.focus();
  await page.keyboard.press("ArrowRight");
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-branch", "right");
  await expect(hardRouting.getByText(/Observation x = 0\.0 follows the right branch/)).toBeVisible();
  await expect(hardRouting.getByText("Current prediction: 8", { exact: true })).toBeVisible();

  await input.fill("-0.05");
  await input.scrollIntoViewIfNeeded();
  const axis = await input.boundingBox();
  expect(axis).not.toBeNull();
  if (!axis) return;
  const thumbX = axis.x + 13 + (axis.width - 26) * (1.45 / 3);
  await page.mouse.move(thumbX, axis.y + axis.height / 2);
  await page.mouse.down();
  await page.mouse.move(thumbX + 25, axis.y + axis.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-branch", "right");

  await batch.getByRole("button", { name: "Next" }).click();
  await batch.getByRole("button", { name: "Next" }).click();
  await expect(batch).toHaveAttribute("data-beyond-cart-step", "2");
  await expect(batch.getByText("Depth two · 3 of 4", { exact: true })).toBeVisible();
  await expect(batch.getByText("A + B only", { exact: true })).toBeVisible();
  await expect(batch.getByText("C + D only", { exact: true })).toBeVisible();
  await expect(batch.getByText("one test · A–D stay aligned", { exact: true })).toBeVisible();
  await batch.getByRole("button", { name: "Next" }).click();
  await expect(batch.getByText(/A reaches LL, B reaches LR, C reaches RL, and D reaches RR/)).toBeVisible();
  await batch.getByRole("button", { name: "Reset" }).click();
  await expect(batch).toHaveAttribute("data-beyond-cart-step", "0");
});

test("reduced motion preserves direct routing control and manual batch steps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();

  const hardRouting = page.locator('[data-beyond-cart-animation="hard-routing"]');
  const batch = page.locator('[data-beyond-cart-animation="batch-evaluation"]');
  await hardRouting.scrollIntoViewIfNeeded();
  await expect.poll(() => hardRouting.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);
  await hardRouting.getByRole("slider", { name: /Input x/i }).fill("0.05");
  await expect(hardRouting).toHaveAttribute("data-beyond-cart-branch", "right");

  await batch.scrollIntoViewIfNeeded();
  await expect.poll(() => batch.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? false
  ))).toBe(false);
  await expect(batch.locator("[data-beyond-cart-play]")).toBeDisabled();
  await batch.locator("[data-beyond-cart-next]").click();
  await expect(batch).toHaveAttribute("data-beyond-cart-step", "1");
  await expect(batch.getByText(/Timed play is off/)).toBeVisible();
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
