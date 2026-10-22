import { test, expect, type Page } from '@playwright/test';
import { confirmPublication } from './publication-helper';

async function createBannerDraft(page: Page, slug: string) {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Banner crop test',
      slug,
      albumIds: [albums[0].id],
    },
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  await page.goto(`/page/manage/${record.id}`);
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Banner preview')).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  return slug;
}

test('banner crop preview supports drag and touch while the slider remains keyboard accessible', async ({
  page,
  browser,
}) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  const slug = `banner-crop-${Date.now()}`;
  await createBannerDraft(page, slug);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await confirmPublication(page, 'Publish page');
  await expect(page.getByRole('status')).toContainText('Page published');

  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  visitor.on('pageerror', (error) => browserErrors.push(error.message));
  await visitor.goto(`/page/${slug}`);
  await expect(visitor.locator('.ip-banner img')).toHaveCSS(
    'object-position',
    '50% 50%',
  );

  await page.getByRole('button', { name: 'Options', exact: true }).click();

  const slider = page.getByRole('slider', { name: 'Banner crop position' });
  const crop = page.getByRole('group', { name: 'Banner crop preview' });
  await expect(crop).toBeVisible();
  await crop.screenshot({ path: 'test-results/banner-crop-preview.png' });
  await expect(slider).toHaveValue('50');

  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('51');
  await expect(crop.locator('img')).toHaveCSS('object-position', '50% 51%');

  const box = await crop.boundingBox();
  expect(box).not.toBeNull();
  const startY = box!.y + box!.height / 2;
  await page.mouse.move(box!.x + box!.width / 2, startY);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, startY + 20, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeLessThan(51);
  const pointerPosition = await slider.inputValue();
  await expect(crop.locator('img')).toHaveCSS(
    'object-position',
    `50% ${pointerPosition}%`,
  );

  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await visitor.reload();
  await expect(visitor.locator('.ip-banner img')).toHaveCSS(
    'object-position',
    '50% 50%',
  );
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  const savedPosition = await slider.inputValue();
  await page.reload();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Banner crop position' }),
  ).toHaveValue(savedPosition!);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await confirmPublication(page, 'Update live page');
  await expect(page.getByRole('status')).toContainText('Page published');
  await visitor.reload();
  await expect(visitor.locator('.ip-banner img')).toHaveCSS(
    'object-position',
    `50% ${savedPosition}%`,
  );

  const touchContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const touchPage = await touchContext.newPage();
    touchPage.on('pageerror', (error) => browserErrors.push(error.message));
    await createBannerDraft(touchPage, `${slug}-touch`);
    const touchCrop = touchPage.getByRole('group', {
      name: 'Banner crop preview',
    });
    const touchSlider = touchPage.getByRole('slider', {
      name: 'Banner crop position',
    });
    await expect(touchCrop).toBeVisible();
    await expect
      .poll(() =>
        touchCrop
          .locator('img')
          .evaluate((image) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    await touchCrop.scrollIntoViewIfNeeded();
    const touchBox = await touchCrop.boundingBox();
    expect(touchBox).not.toBeNull();
    expect(touchBox!.x).toBeGreaterThanOrEqual(0);
    expect(touchBox!.y).toBeGreaterThanOrEqual(0);
    expect(touchBox!.y + touchBox!.height).toBeLessThanOrEqual(
      await touchPage.evaluate(() => innerHeight),
    );
    const x = touchBox!.x + touchBox!.width / 2;
    const y = touchBox!.y + touchBox!.height / 2;
    const cdp = await touchContext.newCDPSession(touchPage);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + 20, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(touchSlider).not.toHaveValue('50');
    const touchPosition = await touchSlider.inputValue();
    await expect(touchCrop.locator('img')).toHaveCSS(
      'object-position',
      `50% ${touchPosition}%`,
    );
    await cdp.detach();
  } finally {
    await touchContext.close();
    await visitorContext.close();
  }
  expect(browserErrors).toEqual([]);
});
