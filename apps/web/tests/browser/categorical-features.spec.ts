import {expect,test} from '@playwright/test';
const route='/learn/categorical-features/';
test.use({hasTouch:true});
test.beforeEach(async({page})=>{
 await page.goto(route);
 test.skip(await page.locator('[data-categorical-lab]').count()===0,'Editorial draft is absent from published-only builds');
});

test('every method section owns an accessible static figure',async({page})=>{
 const figures=page.locator('[data-encoding-figure]');
 await expect(figures).toHaveCount(23);
 const ids=['ordinal','one-hot','binary','hashing','count','similarity','mean','oof','m-estimate','woe','loo','james-stein','glmm','ordered','entity','pretrained','contextual','id3','cart','hist','lightgbm','xgboost','catboost'];
 for(const id of ids){
  const figure=page.locator(`[data-encoding-figure="${id}"]`);
  await expect(figure.getByRole('img')).toHaveCount(1);
  await expect(figure.locator('figcaption')).not.toBeEmpty();
  await expect(figure.getByRole('combobox')).toHaveCount(0);
 }
});

test('translation playgrounds contain only one selector and direct outputs',async({page})=>{
 await expect(page.locator('[data-translation-family]')).toHaveCount(3);
 for(const family of ['target-free','supervised','learned']){
  const lab=page.locator(`[data-translation-family="${family}"]`);
  await lab.scrollIntoViewIfNeeded();
  await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr');
  await expect(lab.getByRole('combobox')).toHaveCount(1);
  await expect(lab.getByRole('button')).toHaveCount(0);
  await expect(lab.getByRole('table')).toHaveCount(0);
  await expect(lab.locator('details,svg')).toHaveCount(0);
  await expect(lab).not.toContainText('Parent Gini');
 }
 const free=page.locator('[data-translation-family="target-free"]');
 await free.getByRole('combobox').selectOption('similarity');
 await expect(free.locator('[data-translation-input="Cedroo"]')).toContainText('[0.8, 0]');
 await free.getByRole('combobox').selectOption('binary');
 await expect(free.locator('[data-translation-input="Jacarandá"]')).toContainText('[1, 0]');
});

test('supervised and contextual selectors keep training and schematic distinctions',async({page})=>{
 const lab=page.locator('[data-translation-family="supervised"]');
 await lab.scrollIntoViewIfNeeded();
 await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr');
 await lab.getByRole('combobox').selectOption('oof');
 await expect(lab.locator('[data-translation-input="Ipê · record 1"]')).toContainText('0.5');
 await lab.getByRole('combobox').selectOption('loo');
 await expect(lab.locator('[data-translation-input="Ipê · record 10"]')).toContainText('1');
 await lab.getByRole('combobox').selectOption('glmm');
 await expect(lab).toContainText('not a probability');
 const learned=page.locator('[data-translation-family="learned"]');
 await learned.scrollIntoViewIfNeeded();
 await expect(learned.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr');
 await learned.getByRole('combobox').selectOption('contextual');
 await expect(learned.locator('[data-translation-input="Ipê · small specimen"]')).toContainText('[0.2, 0.8]');
 await expect(learned.locator('[data-translation-input="Ipê · medium specimen"]')).toContainText('[0.6, 0.4]');
});

test('figures and compact translations remain legible and operable on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.reload();
 for(const family of ['target-free','supervised','learned']){
  const lab=page.locator(`[data-translation-family="${family}"]`);
  await lab.scrollIntoViewIfNeeded();
  await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr');
  const box=await lab.boundingBox();
  expect(box!.height).toBeLessThan(650);
  expect(box!.x+box!.width).toBeLessThanOrEqual(390);
  const select=lab.getByRole('combobox');
  await select.focus();await select.press('Home');await select.press('ArrowDown');await select.press('Enter');
 }
 for(const figure of await page.locator('[data-encoding-figure]').all()){
  const box=await figure.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await expect(page.locator('.katex-error')).toHaveCount(0);
});
