import {expect,test} from '@playwright/test';

const route='/learn/categorical-features/';
test.use({hasTouch:true});
test.beforeEach(async({page})=>{
 await page.goto(route);
 test.skip(await page.locator('[data-categorical-lab]').count()===0,'Editorial draft is absent from published-only builds');
});

test('one-hot, ordinal, binary and similarity preserve the demonstrated evidence',async({page})=>{
 const lab=page.locator('[data-categorical-lab="target-free"]');
 const select=lab.getByLabel('Target-free representation');
 await select.scrollIntoViewIfNeeded();
 await expect(lab.locator('astro-island')).not.toHaveAttribute('ssr');
 await expect(select).toHaveValue('one-hot');
 await expect(lab.locator('[data-partition-left]')).toHaveAttribute('data-partition-left','BCD');
 await select.selectOption('ordinal');
 await expect(lab.locator('[data-partition-left]')).toHaveAttribute('data-partition-left','AB');
 await expect(lab.locator('[data-partition-right]')).toHaveAttribute('data-partition-right','CD');
 await select.selectOption('binary');
 await expect(lab.locator('[data-partition-left]')).toHaveAttribute('data-partition-left','AC');
 await select.selectOption('similarity');
 await expect(lab.locator('[data-mapping-name="Cedroo"] [data-output-column="0"]')).toHaveAttribute('data-output-value','0.8');
 for(const method of ['dummy','base-N','hashing','count','frequency']){
  await select.selectOption(method);
  await expect(lab.locator('[data-target-free-method]')).toHaveAttribute('data-target-free-method',method);
 }
 await lab.getByRole('button',{name:'Reset representation'}).click();
 await select.focus();
 await select.press('Home');
 await select.press('ArrowDown');
 await select.press('Enter');
 await expect(select).toHaveValue('one-hot');
});

test('supervised labels follow OOF, LOO and ordered evidence boundaries',async({page})=>{
 const lab=page.locator('[data-categorical-lab="supervised"]');
 const method=lab.getByLabel('Supervised encoding method');
 const state=lab.locator('[data-supervised-method]');
 await method.scrollIntoViewIfNeeded();
 await expect(lab.locator('astro-island')).not.toHaveAttribute('ssr');
 await expect(state).toHaveAttribute('data-value','0.500');
 await expect(state).toHaveAttribute('data-contributors','3,10');
 await expect(lab.locator('[data-record="1"]')).toHaveAttribute('data-evidence','blocked');
 await method.selectOption('mean');
 await expect(state).toHaveAttribute('data-value','0.750');
 await expect(lab.getByRole('note')).toContainText('Naive training');
 await method.selectOption('loo');
 await lab.getByLabel('Supervised reference record').selectOption('10');
 await expect(state).toHaveAttribute('data-value','1.000');
 await method.selectOption('ordered');
 await lab.getByLabel('Supervised reference record').selectOption('3');
 await expect(state).toHaveAttribute('data-contributors','1');
 await expect(state).toHaveAttribute('data-value','0.667');
 await method.selectOption('m-estimate');
 await lab.getByLabel('Supervised encoding mode').selectOption('inference');
 await lab.getByLabel('Supervised new species').selectOption('E');
 await expect(state).toHaveAttribute('data-value','0.500');
 for(const name of ['james-stein','glmm']){
  await method.selectOption(name);
  await expect(lab.getByText('Hypothetical parameters · no model was trained.')).toBeVisible();
 }
 await lab.getByRole('button',{name:'Reset supervised'}).click();
 await expect(state).toHaveAttribute('data-contributors','3,10');
});

test('learned and native mechanisms expose all snapshots without claiming training',async({page})=>{
 const learned=page.locator('[data-categorical-lab="learned"]');
 const representation=learned.getByLabel('Learned representation');
 await representation.scrollIntoViewIfNeeded();
 await expect(learned.locator('astro-island')).not.toHaveAttribute('ssr');
 await representation.selectOption('pretrained');
 await expect(learned.getByRole('rowheader',{name:/E · unseen category/})).toBeVisible();
 await representation.selectOption('contextual');
 await expect(learned.getByRole('rowheader',{name:/Row 1:/})).toBeVisible();
 await expect(learned.getByRole('rowheader',{name:/Row 3:/})).toBeVisible();
 const native=page.locator('[data-categorical-lab="native"]');
 const mechanism=native.getByLabel('Native tree mechanism');
 await mechanism.scrollIntoViewIfNeeded();
 await expect(native.locator('astro-island')).not.toHaveAttribute('ssr');
 await expect(mechanism).toHaveValue('cart');
 await expect(native.getByText('Yes · A + C',{exact:true})).toBeVisible();
 for(const value of ['id3','c45','hist','lightgbm','xgboost','catboost']){
  await mechanism.selectOption(value);
  await expect(native.locator('[data-native-method]')).toHaveAttribute('data-native-method',value);
 }
 await expect(native.getByText(/Conceptual snapshot, not a trained CatBoost model/)).toBeVisible();
});

test('mobile touch and reduced motion keep the four experiences inside the article',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.reload();
 for(const kind of ['target-free','supervised','learned','native']){
  const lab=page.locator(`[data-categorical-lab="${kind}"]`);
  await lab.scrollIntoViewIfNeeded();
  await expect(lab.locator('astro-island')).not.toHaveAttribute('ssr');
  await expect(lab).toBeVisible();
  const bounds=await lab.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(391);
  const select=lab.getByRole('combobox').first();
  await select.selectOption({index:1});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 const reset=page.getByRole('button',{name:'Reset representation'});
 await reset.scrollIntoViewIfNeeded();
 await reset.tap();
 await expect(page.getByLabel('Target-free representation')).toHaveValue('one-hot');
 await expect(page.locator('h1')).toHaveText('How Trees Read Categorical Features');
 await expect(page.locator('.lesson-body')).not.toContainText('VISUALIZAÇÃO NO PLAYGROUND');
 await expect(page.locator('.lesson-body')).not.toContainText('Abrir a síntese');
 await expect(page.locator('.lesson-body')).not.toContainText('[Explicar');
});

test('every mode is rendered after reload without browser errors',async({page})=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.reload();
 for(const kind of ['target-free','supervised','learned','native']){
  const lab=page.locator(`[data-categorical-lab="${kind}"]`);
  await lab.scrollIntoViewIfNeeded();
  await expect(lab.getByRole('combobox').first()).toBeVisible();
 }
 expect(errors).toEqual([]);
 await expect(page.locator('.katex-error')).toHaveCount(0);
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
});
