import { expect, test } from "@playwright/test";

const route =
  "/pt-br/learn/uma-visao-do-aprendizado-por-reforco-baseada-em-amostras/";

for (const viewport of [
  { name: "desktop", width: 1_440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`the Portuguese RL draft localizes visuals and interactions on ${viewport.name}`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto(route);

    await expect(page.getByRole("heading", {
      level: 1,
      name: "Uma visão do aprendizado por reforço baseada em amostras",
    })).toBeVisible();

    if (viewport.name === "desktop") {
      for (const suffix of ["", "-mobile"]) {
        const response = await page.request.get(
          `/articles/sample-based-rl/pt-BR/on-policy-vs-off-policy${suffix}.svg`,
        );
        expect(response.ok()).toBe(true);
        const svg = await response.text();
        expect(svg).toContain("POLÍTICA COMPORTAMENTAL");
        expect(svg).toContain(">AJUSTE</text>");
        expect(svg).not.toContain(">POLÍTICA DE COMPORTAMENTO</text>");
        expect(svg).not.toContain(">ATUALIZAÇÃO</text>");
      }
    }

    const images = page.locator(".sample-based-rl-article .static-figure img");
    await expect(images).toHaveCount(12);
    for (const [index, image] of (await images.all()).entries()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc))
        .toContain("/articles/sample-based-rl/pt-BR/");
      if (index < 5) {
        await expect
          .poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc))
          .toMatch(/\.png$/);
      }
      await expect(image).toHaveAttribute("alt", /[áàâãéêíóôõúç]|aprendizado|política/i);
    }

    const pong = page.getByRole("region", {
      name: "Qual política acumula mais recompensa?",
    });
    await expect(pong).toBeVisible();
    await expect(pong.getByRole("button", { name: "Executar os dois agentes" })).toBeVisible();

    if (viewport.name === "desktop") {
      const [headingBounds, ledeBounds] = await Promise.all([
        pong.locator("[data-pong-heading]").boundingBox(),
        pong.locator("[data-pong-lede]").boundingBox(),
      ]);
      expect(headingBounds).not.toBeNull();
      expect(ledeBounds).not.toBeNull();
      expect(Math.abs(headingBounds!.y - ledeBounds!.y)).toBeLessThanOrEqual(1);
    }

    const trajectory = page.getByRole("region", {
      name: "Observe o MDP produzir uma trajetória",
    });
    await expect(trajectory).toBeVisible();
    await expect(trajectory.getByRole("button", { name: "Executar o ciclo" })).toBeVisible();

    const pageBounds = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      lang: document.documentElement.lang,
    }));
    expect(pageBounds.lang).toBe("pt-BR");
    expect(pageBounds.scrollWidth).toBe(pageBounds.viewportWidth);
    expect(pageErrors).toEqual([]);
  });
}
