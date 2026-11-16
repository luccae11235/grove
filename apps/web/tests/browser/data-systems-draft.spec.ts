import { expect, test, type Page } from "@playwright/test";

const article = "/pt-br/rascunhos/sistemas-de-dados/";

async function openDraft(page: Page) {
  const response = await page.goto(article);
  if (process.env.EXPECT_DATA_SYSTEMS_DRAFT !== "true") {
    test.skip(response?.status() === 404, "Review drafts are excluded from this build");
  }
  expect(response?.status()).toBe(200);
}

test("the full Portuguese draft embeds eight independent native scenes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openDraft(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Como escolher a arquitetura de um sistema de dados");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  const body = page.locator("article.data-systems-article");
  await expect(body.locator(".data-systems-visual")).toHaveCount(8);
  await expect(body.locator("iframe")).toHaveCount(0);
  await expect(body).not.toContainText("[VISUALIZATION:");
  await expect(body).not.toContainText("[PLAYGROUND:");
  const ids = await body.locator("[id]").evaluateAll(nodes => nodes.map(node => node.id));
  expect(new Set(ids).size).toBe(ids.length);

  const query = body.locator(".query-visual");
  const hosting = body.locator(".responsibilities");
  const update = body.locator(".update-visual");
  await query.getByRole("button", { name: "Confirmadas por tipo · março", exact: true }).click();
  await expect(query.locator('[id$="drill-count"]')).toHaveText("3");
  await expect(query.locator('[id$="saw-count"]')).toHaveText("2");
  await hosting.getByRole("button", { name: "Banco gerenciado", exact: true }).click();
  await expect(hosting.locator('[data-owner="updates"]')).toHaveText("Provedor conforme contrato");
  await expect(hosting.locator('[data-owner="access"]')).toHaveText("Organização");
  await expect(query.getByRole("button", { name: "Confirmadas por tipo · março", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(update.locator('[id$="origin-state"]')).toHaveText("confirmada");
  expect(errors).toEqual([]);
});

test("the story distinguishes delayed data, uncertain responses and pending decisions", async ({ page }) => {
  await openDraft(page);
  const update = page.locator(".update-visual");
  await update.getByRole("button", { name: "2. Cancelar", exact: true }).click();
  await expect(update.locator('[id$="origin-state"]')).toHaveText("cancelada");
  await expect(update.locator('[id$="report-state"]')).toHaveText("confirmada");
  await update.getByRole("button", { name: "3. Atualizar relatório", exact: true }).click();
  await expect(update.locator('[id$="report-state"]')).toHaveText("cancelada");

  const copies = page.locator(".copies");
  await copies.getByRole("button", { name: "Todas as unidades", exact: true }).click();
  await expect(copies.locator('[id$="part-b"]')).toHaveClass(/queried/);
  await expect(copies.locator('[id$="partition-result"]')).toContainText("reunir");

  const missing = page.locator(".missing");
  await missing.getByRole("button", { name: "Revelar o que ocorreu", exact: true }).click();
  await expect(missing.locator('[id$="server-one"]')).toHaveText("Reserva não registrada");
  await expect(missing.locator('[id$="server-two"]')).toHaveText("Reserva registrada");
  await expect(missing.locator(".client .state")).toHaveText(["Sem confirmação", "Sem confirmação"]);

  const correction = page.locator(".correction");
  await correction.getByRole("button", { name: "Corrigir o registro", exact: true }).click();
  await expect(correction.locator('[id$="source-value"]')).toContainText("No prazo");
  await expect(correction.locator('[id$="attempt-value"]')).toHaveText("Reserva bloqueada");
  await correction.getByRole("button", { name: "Atualizar e reavaliar", exact: true }).click();
  await expect(correction.locator('[id$="attempt-value"]')).toHaveText("Reserva permitida");

  const policy = page.locator(".policy");
  const fact = await policy.locator(".fact").innerText();
  await policy.getByRole("button", { name: "Bloquear por atraso", exact: true }).click();
  await expect(policy.locator('[id$="outcome"]')).toHaveText("Bloqueio automático");
  await policy.getByRole("button", { name: "Avaliar o contexto", exact: true }).click();
  await expect(policy.locator('[id$="outcome"]')).toHaveText("Decisão pendente de avaliação");
  await expect(policy.locator('[id$="detail"]')).toContainText("não foi liberada");
  expect(await policy.locator(".fact").innerText()).toBe(fact);
});

test("the integrated article fits a phone and native controls work with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDraft(page);
  for (const scene of await page.locator(".data-systems-visual").all()) {
    await scene.scrollIntoViewIfNeeded();
    const bounds = await scene.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(361);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const contextButton = page.locator(".policy").getByRole("button", { name: "Avaliar o contexto", exact: true });
  await contextButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('.policy [id$="outcome"]')).toHaveText("Decisão pendente de avaliação");
  const reveal = page.locator(".missing").getByRole("button");
  await reveal.focus();
  await page.keyboard.press("Space");
  await expect(reveal).toHaveAttribute("aria-expanded", "true");
});
