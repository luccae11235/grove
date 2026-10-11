import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const path = "/learn/categorical-features/";
const screenshotDir = process.env.CATEGORICAL_SCREENSHOT_DIR;

async function waitForHydration(locator: import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect.poll(() => locator.evaluate((element) => (
    element.closest("astro-island")?.hasAttribute("ssr") ?? true
  ))).toBe(false);
}

test.beforeEach(async ({ page }) => {
  const response = await page.goto(path);
  test.skip(response?.status() === 404, "The categorical-features draft is excluded from published-only builds.");
  expect(response?.status()).toBe(200);
});

test("renders the full draft with six implemented visuals and no editorial placeholders", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "How Trees Read Categorical Features" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("[data-categorical-visual]")).toHaveCount(6);
  expect(await page.locator("[data-categorical-visual]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-categorical-visual")),
  )).toEqual(["split", "encoding", "smoothing", "cross-fitting", "ordered", "embedding"]);
  await expect(page.locator("[data-categorical-figure]")).toHaveCount(3);
  await expect(page.locator("[data-categorical-lab]")).toHaveCount(3);
  const visualIds = await page.locator("[data-categorical-visual] [id]").evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(visualIds).size).toBe(visualIds.length);
  await expect(page.locator("body")).not.toContainText(/\[(?:IMAGEM|ANIMAÇÃO|PLAYGROUND):/);
  await expect(page.getByText("Row 4 cannot use its own answer; a future C visit can use row 4")).toBeVisible();
});

test("codes, columns, and thresholds change the one-split partition without changing the visits", async ({ page }) => {
  const lab = page.locator('[data-categorical-lab="encoding"] > div');
  await waitForHydration(lab);
  await expect(lab).toHaveAttribute("data-encoding-mode", "integer");
  await expect(lab).toHaveAttribute("data-left-rows", "1,2,3,5");
  await expect(lab).toHaveAttribute("data-right-rows", "4,6");
  await lab.getByRole("combobox", { name: "Code for store B" }).selectOption("2");
  await expect(lab).toHaveAttribute("data-left-rows", "1,3,4");
  await expect(lab).toHaveAttribute("data-right-rows", "2,5,6");
  await lab.getByRole("button", { name: "One-hot" }).click();
  await lab.getByRole("combobox", { name: "Encoded column" }).selectOption("C");
  await expect(lab).toHaveAttribute("data-left-rows", "1,2,3,5,6");
  await expect(lab).toHaveAttribute("data-right-rows", "4");
  await lab.getByRole("button", { name: "Binary" }).click();
  await expect(lab).toHaveAttribute("data-left-rows", "1,3,4");
  await lab.getByRole("button", { name: "Frequency" }).click();
  await expect(lab).toHaveAttribute("data-left-rows", "4,6");
  await expect(lab).toHaveAttribute("data-right-rows", "1,2,3,5");
  await expect(lab.getByText("Unseen stores need a separate policy.")).toBeVisible();
  await expect(lab.getByRole("row")).toHaveCount(7);
});

test("smoothing keeps the selected row in the numerator and respects reduced motion", async ({ page }) => {
  const lab = page.locator('[data-categorical-lab="smoothing"] > div');
  await waitForHydration(lab);
  await expect(lab).toHaveAttribute("data-value", "1.000");
  await lab.getByRole("button", { name: "Next step" }).click();
  await expect(lab).toHaveAttribute("data-strength", "1");
  await expect(lab).toHaveAttribute("data-value", "0.750");
  await lab.getByRole("combobox", { name: "Prior weight" }).selectOption("4");
  await expect(lab).toHaveAttribute("data-value", "0.600");
  await expect(lab.getByText("Row 4's own 1 is still in the numerator.")).toBeVisible();
  await lab.getByRole("button", { name: "Reset" }).click();
  await expect(lab).toHaveAttribute("data-value", "1.000");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab.getByRole("button", { name: "Play smoothing animation" })).toBeDisabled();
  await lab.getByRole("button", { name: "Next step" }).click();
  await expect(lab).toHaveAttribute("data-value", "0.750");
});

test("ordered statistics follow the prefix, permutation, inference, unknown category, and reset", async ({ page }) => {
  const lab = page.locator('[data-categorical-lab="ordered"] > div');
  await waitForHydration(lab);
  await expect(lab).toHaveAttribute("data-row-id", "1");
  for (const [id, value, contributors] of [
    ["2", "0.500", ""],
    ["3", "0.750", "1"],
    ["4", "0.500", ""],
    ["5", "0.250", "2"],
    ["6", "0.500", ""],
  ]) {
    await lab.getByRole("button", { name: "Next row" }).click();
    await expect(lab).toHaveAttribute("data-row-id", id);
    await expect(lab).toHaveAttribute("data-value", value);
    await expect(lab).toHaveAttribute("data-contributors", contributors);
  }
  await lab.getByRole("button", { name: "Previous row" }).click();
  await expect(lab).toHaveAttribute("data-row-id", "5");
  await lab.getByRole("combobox", { name: "Permutation" }).selectOption("alternate");
  await expect(lab).toHaveAttribute("data-row-id", "4");
  await expect(lab).toHaveAttribute("data-value", "0.500");
  await lab.getByRole("combobox", { name: "Store focus" }).selectOption("B");
  await expect(lab).toHaveAttribute("data-row-id", "2");
  await lab.getByRole("button", { name: "Next row" }).click();
  await expect(lab).toHaveAttribute("data-row-id", "5");
  await expect(lab).toHaveAttribute("data-contributors", "2");
  await lab.getByRole("button", { name: "New visit" }).click();
  await expect(page.getByRole("heading", { name: "Use permitted training history for a new visit" })).toBeVisible();
  await expect(lab.getByRole("combobox", { name: "Permutation" })).toHaveCount(0);
  await lab.getByRole("combobox", { name: "New visit store" }).selectOption("C");
  await expect(lab).toHaveAttribute("data-value", "0.750");
  await expect(lab).toHaveAttribute("data-contributors", "4");
  await lab.getByRole("combobox", { name: "New visit store" }).selectOption("D");
  await expect(lab).toHaveAttribute("data-value", "0.250");
  await lab.getByRole("combobox", { name: "New visit store" }).selectOption("E");
  await expect(lab).toHaveAttribute("data-value", "0.500");
  await expect(lab).toHaveAttribute("data-contributors", "");
  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await page.addStyleTag({ content: ".site-header, .article-chapters, .skip-link { visibility: hidden !important; }" });
    await page.locator('[data-categorical-visual="ordered"]').screenshot({ path: `${screenshotDir}/categorical-inference-unknown.png` });
  }
  await lab.getByRole("button", { name: "Reset all" }).click();
  await expect(lab).toHaveAttribute("data-mode", "training");
  await expect(lab).toHaveAttribute("data-order", "default");
  await expect(lab).toHaveAttribute("data-row-id", "1");
});

test("automatic steps pause cleanly and reduced motion keeps manual controls available", async ({ page }) => {
  const smoothing = page.locator('[data-categorical-lab="smoothing"] > div');
  await waitForHydration(smoothing);
  await smoothing.getByRole("button", { name: "Play smoothing animation" }).click();
  await expect(smoothing).toHaveAttribute("data-strength", "1", { timeout: 3_500 });
  await smoothing.getByRole("button", { name: "Pause smoothing animation" }).click();
  const stoppedStrength = await smoothing.getAttribute("data-strength");
  await page.waitForTimeout(1_750);
  await expect(smoothing).toHaveAttribute("data-strength", stoppedStrength!);

  const ordered = page.locator('[data-categorical-lab="ordered"] > div');
  await waitForHydration(ordered);
  await ordered.getByRole("button", { name: "Play", exact: true }).click();
  await expect(ordered).toHaveAttribute("data-row-id", "2", { timeout: 3_500 });
  await ordered.getByRole("button", { name: "Pause", exact: true }).click();
  const stoppedRow = await ordered.getAttribute("data-row-id");
  await page.waitForTimeout(1_850);
  await expect(ordered).toHaveAttribute("data-row-id", stoppedRow!);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(ordered.getByRole("button", { name: "Play", exact: true })).toBeDisabled();
  await ordered.getByRole("button", { name: "Next row" }).click();
  await expect(ordered).toHaveAttribute("data-row-id", "3");
});

for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`visual layout and keyboard controls on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.reload();
    if (viewport.name === "mobile") {
      await expect(page.locator("[data-article-chapters]")).toHaveAttribute("data-open", "false");
    }
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const lab = page.locator('[data-categorical-lab="ordered"] > div');
    await waitForHydration(lab);
    await lab.getByRole("button", { name: "Next row" }).focus();
    await page.keyboard.press("Enter");
    await expect(lab).toHaveAttribute("data-row-id", "2");
    await lab.getByRole("button", { name: "Next row" }).click();
    await expect(lab).toHaveAttribute("data-value", "0.750");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.addStyleTag({ content: ".site-header, .article-chapters, .skip-link { visibility: hidden !important; }" });
      for (const kind of ["split", "encoding", "smoothing", "cross-fitting", "ordered", "embedding"]) {
        await page.locator(`[data-categorical-visual="${kind}"]`).screenshot({ path: `${screenshotDir}/categorical-${kind}-${viewport.name}.png` });
      }
    }
  });
}
