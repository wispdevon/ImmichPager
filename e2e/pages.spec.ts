import { test, expect } from '@playwright/test';

test('client album grid, year collapse, native viewer and mobile layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1506, height: 900 });
  await page.goto('/page/acme');
  await expect(
    page.getByRole('heading', { name: 'A collection of our work' }),
  ).toBeVisible();
  await expect(page.locator('.album')).toHaveCount(9);
  await expect
    .poll(() =>
      page
        .locator('.cover img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.locator('summary').first().click();
  await expect(page.locator('.album-grid').first()).toBeHidden();
  await page.locator('summary').first().click();
  await page.screenshot({
    path: 'test-results/gallery-desktop.png',
    fullPage: false,
  });
  await page.locator('.album').first().click();
  await expect(page).toHaveURL(/\/s\/pager-/);
  await expect(page.getByText('Native Immich viewer fixture')).toBeVisible();
  await page.goto('/page/acme');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/gallery-mobile.png',
    fullPage: false,
  });
  expect(errors).toEqual([]);
});

test('editor creates, previews and publishes a protected branded page', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await expect(page.getByPlaceholder('Add a title')).toBeVisible();
  await expect(page.getByPlaceholder('Add a description')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('16px GoogleSans')),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/editor-empty.png',
    fullPage: true,
  });
  await page
    .getByLabel('Title', { exact: true })
    .fill('Acme monthly photography');
  await page
    .getByRole('button', { name: 'Page settings', exact: true })
    .click();
  await expect(page.getByLabel('Page slug')).toHaveValue(
    'acme-monthly-photography',
  );
  await page.getByLabel('Page slug').fill('protected-client');
  await page.getByRole('button', { name: 'Close page settings' }).click();
  await page
    .getByRole('button', { name: 'Select albums', exact: true })
    .click();
  await expect(page.getByRole('checkbox')).toHaveCount(9);
  await expect
    .poll(() =>
      page
        .locator('.pick-cover img')
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: 'test-results/album-picker.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Done', exact: true }),
  ).toBeInViewport();
  const pickerBounds = await page.getByRole('dialog').boundingBox();
  expect(pickerBounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: 'test-results/album-picker-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('searchbox', { name: 'Search albums' }).fill('Liberty');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('checkbox').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Select albums', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('button', { name: 'Select albums', exact: true })
    .click();
  await page
    .getByRole('checkbox', { name: 'Include Liberty Family Camp ’26' })
    .check();
  await page.getByRole('button', { name: 'Selected', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByLabel('Description', { exact: true })
    .fill('Our work over the months.');
  await page
    .getByRole('button', { name: 'Page settings', exact: true })
    .click();
  await page.getByLabel('Password protection').selectOption('set');
  await page.getByPlaceholder('At least 4 characters').fill('2468');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Acme monthly photography' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Page published');
  await page
    .getByRole('button', { name: 'Page settings', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Copy client link' }),
  ).toBeVisible();
  const pageId = page.url().split('/').pop()!;
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(
    page.getByRole('button', { name: 'Remove banner', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Appearance').selectOption('light');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  await page.screenshot({ path: 'test-results/editor.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/editor-mobile.png',
    fullPage: true,
  });
  const client = await browser.newContext();
  const visitor = await client.newPage();
  const locked = await visitor.goto('/page/protected-client');
  expect(await locked!.text()).not.toContain('Liberty Family');
  expect(
    (
      await client.request.get(`/page/media/${pageId}/branding/banner`)
    ).status(),
  ).toBe(401);
  await visitor.getByPlaceholder('Password', { exact: true }).fill('wrong');
  await visitor.getByRole('button', { name: 'View albums' }).click();
  await expect(visitor.getByRole('alert')).toHaveText('Incorrect password');
  await visitor.getByPlaceholder('Password', { exact: true }).fill('2468');
  await visitor.getByRole('button', { name: 'View albums' }).click();
  await expect(
    visitor.getByRole('heading', { name: 'Acme monthly photography' }),
  ).toBeVisible();
  await expect(visitor.locator('.banner img')).toBeVisible();
  await visitor.locator('.album').first().click();
  await expect(
    visitor.getByRole('heading', { name: 'Password required' }),
  ).toBeVisible();
  await visitor.getByLabel('Password', { exact: true }).fill('2468');
  await visitor.getByRole('button', { name: 'Submit' }).click();
  await expect(visitor.getByText('Native Immich viewer fixture')).toBeVisible();
  await client.close();
  expect(errors).toEqual([]);
});

test('ownership, same-origin writes, reserved slugs and sidebar integration', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  await expect(
    page.getByRole('link', { name: 'Pages', exact: true }),
  ).toBeVisible();
  const sharingBox = await page
    .getByRole('link', { name: 'Sharing', exact: true })
    .boundingBox();
  const pagerBox = await page
    .getByRole('link', { name: 'Pages', exact: true })
    .boundingBox();
  expect(pagerBox!.y).toBeGreaterThanOrEqual(
    sharingBox!.y + sharingBox!.height,
  );
  expect(pagerBox!.width).toBeGreaterThanOrEqual(170);
  await page.getByRole('link', { name: 'Pages', exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="Client pages"]')
      .getByRole('heading', { name: 'Client pages' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Albums', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  const owner = await page.request.get('/page/api/pages');
  const pages = await owner.json();
  const id = pages[0].id;
  const bob = await browser.newContext();
  await bob.request.get('/dev-login/bob');
  expect((await bob.request.get(`/page/api/pages/${id}`)).status()).toBe(404);
  expect(await (await bob.request.get('/page/api/pages')).json()).toEqual([]);
  const origin = 'http://127.0.0.1:3200';
  expect(
    (
      await page.request.post('/page/api/pages', {
        headers: { origin: 'https://untrusted.example' },
        data: { title: 'Wrong', slug: 'wrong' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post('/page/api/pages', {
        headers: { origin },
        data: { title: 'Reserved', slug: 'manage' },
      })
    ).status(),
  ).toBe(400);
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get('/page/api/pages')).status()).toBe(401);
  await anonymous.close();
  await bob.close();
});

test('publishing recovers after an empty proxy error and oversized branding is rejected before upload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await page
    .getByLabel('Title', { exact: true })
    .fill('Test response recovery');
  await page.route('**/page/api/pages', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 502, body: '' })
      : route.continue(),
  );
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('HTTP 502');
  await expect(page.getByRole('alert')).not.toContainText('JSON');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Test response recovery',
  );
  await expect(page).toHaveURL(/\/manage\/new$/);
  await page.unroute('**/page/api/pages');
  await page
    .getByRole('button', { name: 'Select albums', exact: true })
    .click();
  await page
    .getByRole('checkbox', { name: 'Include Liberty Family Camp ’26' })
    .check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Page published');
  await expect(page).not.toHaveURL(/\/manage\/new$/);
  await page
    .getByRole('button', { name: 'Page settings', exact: true })
    .click();
  let uploads = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/branding/'))
      uploads++;
  });
  await page.getByLabel('Banner', { exact: true }).setInputFiles({
    name: 'too-large.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(7 * 1024 * 1024),
  });
  await expect(page.getByRole('alert')).toContainText('5 MB or smaller');
  expect(uploads).toBe(0);
  expect(errors).toEqual([]);
});
