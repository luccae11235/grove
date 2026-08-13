import { expect, test } from "@playwright/test";

const articlePath = "/learn/bagging-reduces-tree-variance/";

test("the revised article uses two matched experiments and places static explanations where needed", async ({ page }) => {
  await page.goto(articlePath);

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Why averaging trees makes predictions more stable",
  })).toBeVisible();
  await expect(page.getByText("No coding required", { exact: true })).toBeVisible();
  await expect(page.getByText("2 guided experiments", { exact: true })).toBeVisible();
  await expect(page.getByText(/recurring sine curve/i)).toHaveCount(0);
  await expect(page.getByRole("heading", {
    level: 2,
    name: "The patient did not change. The prediction did.",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Why did the standard deviation stop near 0.17?",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "What has the hospital gained?",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Can you diagnose stability from a new chart?",
  })).toHaveCount(0);

  const toyExampleFollowsItsIntroduction = await page.evaluate(() => {
    const sectionText = (heading: Element | null) => {
      const parts: string[] = [];
      let current = heading?.nextElementSibling;
      while (current && current.tagName !== "H2") {
        parts.push(current.textContent ?? "");
        current = current.nextElementSibling;
      }
      return parts.join(" ");
    };
    const opening = sectionText(document.querySelector("#same-question-different-tree"));
    const modelVariance = sectionText(document.querySelector("#model-variance"));
    return Boolean(
      opening
      && modelVariance
      && !opening.includes("sine curve")
      && modelVariance.includes("simple toy example")
      && modelVariance.includes("sine curve"),
    );
  });
  expect(toyExampleFollowsItsIntroduction).toBe(true);

  const visuals = page.locator("[data-bagging-visual]");
  await expect(visuals).toHaveCount(5);
  await expect(page.locator('[data-bagging-visual="variance"]')).toHaveCount(1);
  await expect(page.locator('[data-bagging-visual="ensemble"]')).toHaveCount(1);
  await expect(page.getByRole("img", { name: "Sampling six observations with replacement" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Three tree predictions become one ensemble prediction" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Prediction standard deviation by number of averaged trees" })).toBeVisible();

  const guidancePrecedesExperiments = await page.evaluate(() => {
    const firstPrediction = Array.from(document.querySelectorAll("p")).find((element) =>
      element.textContent?.includes("Before you run it, predict the shape"),
    );
    const ensemblePrediction = Array.from(document.querySelectorAll("p")).find((element) =>
      element.textContent?.includes("Before you run the experiment, predict the comparison"),
    );
    const singleTreeExperiment = document.querySelector('[data-bagging-visual="variance"]');
    const ensembleExperiment = document.querySelector('[data-bagging-visual="ensemble"]');

    return Boolean(
      firstPrediction
      && ensemblePrediction
      && singleTreeExperiment
      && ensembleExperiment
      && (firstPrediction.compareDocumentPosition(singleTreeExperiment) & Node.DOCUMENT_POSITION_FOLLOWING)
      && (ensemblePrediction.compareDocumentPosition(ensembleExperiment) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });
  expect(guidancePrecedesExperiments).toBe(true);

  const overviewFollowsBagging = await page.evaluate(() => {
    const heading = document.querySelector("#bagging");
    const overview = document.querySelector('[data-bagging-visual="overview"]');
    return Boolean(heading && overview && (heading.compareDocumentPosition(overview) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(overviewFollowsBagging).toBe(true);
});

test("math renders once with KaTeX and remains contained", async ({ page }) => {
  await page.goto(articlePath);

  await expect(page.locator(".katex-error")).toHaveCount(0);
  const math = page.locator(".katex").first();
  await expect(math).toBeVisible();
  const styles = await math.evaluate((element) => {
    const mathml = element.querySelector<HTMLElement>(".katex-mathml");
    const visual = element.querySelector<HTMLElement>(".katex-html");
    if (!mathml || !visual) throw new Error("Expected both accessible and visual KaTeX layers.");
    const mathmlStyle = getComputedStyle(mathml);
    return {
      visualFont: getComputedStyle(visual).fontFamily,
      mathmlPosition: mathmlStyle.position,
      mathmlWidth: mathmlStyle.width,
      mathmlHeight: mathmlStyle.height,
      mathmlOverflow: mathmlStyle.overflow,
    };
  });
  expect(styles.visualFont).toContain("KaTeX");
  expect(styles.mathmlPosition).toBe("absolute");
  expect(styles.mathmlWidth).toBe("1px");
  expect(styles.mathmlHeight).toBe("1px");
  expect(styles.mathmlOverflow).toBe("hidden");

  const notationGeometry = await page.locator(".katex-display").evaluateAll((equations) => {
    const equationFor = (source: string) => equations.find((equation) =>
      equation.querySelector("annotation")?.textContent?.includes(source),
    );
    const derivation = equationFor("\\begin{aligned}");
    const boxedResult = equationFor("\\boxed{");
    const accentBody = derivation?.querySelector<HTMLElement>(".accent-body");
    const box = boxedResult?.querySelector<HTMLElement>(".fbox");
    if (!accentBody || !box) throw new Error("Expected the overbar and boxed-result geometry.");

    return {
      accentPosition: getComputedStyle(accentBody).position,
      accentWidth: accentBody.getBoundingClientRect().width,
      boxWidth: box.getBoundingClientRect().width,
      boxHeight: box.getBoundingClientRect().height,
    };
  });
  expect(notationGeometry.accentPosition).toBe("relative");
  expect(notationGeometry.accentWidth).toBeLessThan(1);
  expect(notationGeometry.boxWidth).toBeGreaterThan(150);
  expect(notationGeometry.boxHeight).toBeGreaterThan(30);
});

test("one-tree episodes learn, predict, and feed the histogram", async ({ page }) => {
  await page.goto(articlePath);
  const experiment = page.locator('[data-bagging-visual="variance"]');

  await expect(experiment).toHaveAttribute("data-phase", "idle");
  await expect(experiment).toHaveAttribute("data-history-count", "0");
  await experiment.getByRole("button", { name: "Run one episode" }).click();
  await expect(experiment).toHaveAttribute("data-phase", "fitting", { timeout: 2_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "0");
  await expect(experiment).toHaveAttribute("data-phase", "committed", { timeout: 7_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "1");
  await expect(experiment.getByText(/Episode 1 added/)).toBeVisible();
  const firstMean = await experiment.getAttribute("data-prediction-mean");
  expect(Number.isFinite(Number(firstMean))).toBe(true);
  await expect(experiment.locator("[data-running-mean]")).toHaveAttribute("data-running-mean", firstMean!);
  await expect(experiment).not.toHaveAttribute("data-prediction-standard-deviation", /.+/);

  await experiment.getByRole("button", { name: "Show data process" }).click();
  await expect(experiment.locator("[data-process-layer]")).toBeVisible();

  const speedSlider = experiment.getByRole("slider", { name: "Episode speed" });
  await speedSlider.evaluate((element) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "50");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(experiment).toHaveAttribute("data-speed", "1");
  await speedSlider.evaluate((element) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "100");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(experiment).toHaveAttribute("data-speed", "10");
  await experiment.getByRole("button", { name: "Play" }).click();
  await expect.poll(async () => Number(await experiment.getAttribute("data-history-count")), {
    timeout: 4_000,
  }).toBeGreaterThanOrEqual(20);
  await experiment.getByRole("button", { name: "Pause" }).click();
  const pausedCount = await experiment.getAttribute("data-history-count");
  const adaptiveBins = Number(await experiment.getAttribute("data-histogram-bins"));
  expect(adaptiveBins).toBeGreaterThan(10);
  await expect(experiment.locator("[data-histogram-bin]")).toHaveCount(adaptiveBins);
  expect(Number.isFinite(Number(await experiment.getAttribute("data-prediction-mean")))).toBe(true);
  expect(Number.isFinite(Number(await experiment.getAttribute("data-prediction-standard-deviation")))).toBe(true);
  await expect(experiment.locator("[data-standard-deviation]")).toHaveCount(1);
  await page.waitForTimeout(500);
  await expect(experiment).toHaveAttribute("data-history-count", pausedCount!);
});

test("the bagged experiment keeps fair histories for each selected tree count", async ({ page }) => {
  await page.goto(articlePath);
  const experiment = page.locator('[data-bagging-visual="ensemble"]');
  await expect.poll(() => experiment.evaluate((element) =>
    element.closest("astro-island")?.hasAttribute("ssr") ?? false,
  )).toBe(false);

  await experiment.getByRole("button", { name: /^2 trees,/ }).click();
  await expect(experiment).toHaveAttribute("data-tree-count", "2");
  await experiment.getByRole("button", { name: "Run one episode" }).click();
  await expect(experiment).toHaveAttribute("data-phase", "committed", { timeout: 7_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "1");

  await experiment.getByRole("button", { name: /^5 trees,/ }).click();
  await expect(experiment).toHaveAttribute("data-tree-count", "5");
  await expect(experiment).toHaveAttribute("data-history-count", "1");
  await experiment.getByRole("button", { name: /^25 trees,/ }).click();
  await expect(experiment).toHaveAttribute("data-tree-count", "25");
  await expect(experiment).toHaveAttribute("data-history-count", "1");

  const speedSlider = experiment.getByRole("slider", { name: "Episode speed" });
  await speedSlider.evaluate((element) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "100");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await experiment.getByRole("button", { name: "Play" }).click();
  await expect.poll(async () => Number(await experiment.getAttribute("data-history-count")), {
    timeout: 5_000,
  }).toBeGreaterThanOrEqual(25);
  await experiment.getByRole("button", { name: "Pause" }).click();

  const oneTreeSd = Number(await experiment.getByRole("button", { name: /^1 tree,/ }).getAttribute("data-tree-standard-deviation"));
  const twentyFiveTreeSd = Number(await experiment.getByRole("button", { name: /^25 trees,/ }).getAttribute("data-tree-standard-deviation"));
  expect(Number.isFinite(oneTreeSd)).toBe(true);
  expect(Number.isFinite(twentyFiveTreeSd)).toBe(true);
  expect(twentyFiveTreeSd).toBeLessThan(oneTreeSd);
});

test("the static comparison uses computed predictions and shows lower spread for larger ensembles", async ({ page }) => {
  await page.goto(articlePath);
  const comparison = page.locator('[data-bagging-visual="standard-deviation-comparison"]');

  await expect(comparison).toHaveAttribute("data-comparison-episodes", "240");
  const points = comparison.locator("[data-tree-count][data-standard-deviation]");
  await expect(points).toHaveCount(25);
  const first = Number(await comparison.locator('[data-tree-count="1"]').getAttribute("data-standard-deviation"));
  const last = Number(await comparison.locator('[data-tree-count="25"]').getAttribute("data-standard-deviation"));
  expect(Number.isFinite(first)).toBe(true);
  expect(Number.isFinite(last)).toBe(true);
  expect(last).toBeLessThan(first);
});

test("both experiments stay within the article measure on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(articlePath);

  const desktop = await page.evaluate(() => {
    const articleWidth = document.querySelector<HTMLElement>(".lesson-body")!.getBoundingClientRect().width;
    return {
      articleWidth,
      widths: Array.from(document.querySelectorAll<HTMLElement>('[data-bagging-visual="variance"], [data-bagging-visual="ensemble"]'))
        .map((element) => element.getBoundingClientRect().width),
    };
  });
  expect(desktop.widths).toHaveLength(2);
  expect(desktop.widths.every((width) => Math.abs(width - desktop.articleWidth) < 1)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobile = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    visualsContained: Array.from(document.querySelectorAll<HTMLElement>("[data-bagging-visual]"))
      .every((element) => element.scrollWidth <= element.clientWidth + 1),
    displayMathContained: Array.from(document.querySelectorAll<HTMLElement>(".bagging-article .katex-display"))
      .every((element) => element.getBoundingClientRect().width <= document.documentElement.clientWidth),
  }));
  expect(mobile.pageWidth).toBe(mobile.viewportWidth);
  expect(mobile.visualsContained).toBe(true);
  expect(mobile.displayMathContained).toBe(true);
});

test("reduced motion disables autoplay but preserves a stepped episode", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(articlePath);
  const experiment = page.locator('[data-bagging-visual="variance"]');

  await expect(experiment.getByRole("button", { name: "Play" })).toBeDisabled();
  await expect(experiment.getByRole("slider", { name: "Episode speed" })).toBeDisabled();
  await page.waitForTimeout(1_100);
  await expect(experiment).toHaveAttribute("data-history-count", "0");
  await experiment.getByRole("button", { name: "Run one episode" }).click();
  await expect(experiment).toHaveAttribute("data-phase", "committed", { timeout: 4_000 });
  await expect(experiment).toHaveAttribute("data-history-count", "1");
});
