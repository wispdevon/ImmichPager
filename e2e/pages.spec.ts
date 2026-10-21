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

test('autosaves a protected branded page, chooses Immich photos, and publishes explicitly', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: 'test-results/editor-empty.png',
    fullPage: true,
  });
  await page
    .getByLabel('Title', { exact: true })
    .fill('Acme monthly photography');
  await expect(page).not.toHaveURL(/\/manage\/new$/);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Options', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Page URL', exact: true }),
  ).toHaveValue('acme-monthly-photography');
  await page
    .getByRole('textbox', { name: 'Page URL', exact: true })
    .fill('protected-client');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
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
  await page
    .getByRole('checkbox', { name: 'Include Liberty Family Camp ’26' })
    .check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByLabel('Description', { exact: true })
    .fill('Our work over the months.');
  await page
    .getByRole('button', { name: 'Choose logo from Immich', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Select Studio logo.webp' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Load more photos' }).click();
  await expect(page.getByRole('button', { name: /^Select / })).toHaveCount(71);
  await page
    .getByRole('searchbox', { name: 'Search filenames' })
    .fill('Studio logo');
  await expect(page.getByRole('button', { name: /^Select / })).toHaveCount(1);
  await page.screenshot({
    path: 'test-results/photo-picker.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Select Studio logo.webp' }).click();
  await page.getByRole('button', { name: 'Use as logo', exact: true }).click();
  await expect(page.getByAltText('Logo preview')).toBeVisible();
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Banner preview')).toBeVisible();
  const pageId = page.url().split('/').pop()!;
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get('/page/protected-client')).status()).toBe(
    404,
  );
  expect(
    (
      await anonymous.request.get(
        `/page/media/${pageId}/branding/logo?preview=1`,
      )
    ).status(),
  ).toBe(404);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('switch', { name: 'Password protection' }).click();
  await page.getByPlaceholder('At least 4 characters').fill('2468');
  await page.screenshot({ path: 'test-results/options.png', fullPage: true });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(
    gallery.getByRole('heading', { name: 'Acme monthly photography' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Page published');
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
  const visitor = await anonymous.newPage();
  const locked = await visitor.goto('/page/protected-client');
  expect(await locked!.text()).not.toContain('Liberty Family');
  expect(
    (
      await anonymous.request.get(`/page/media/${pageId}/branding/banner`)
    ).status(),
  ).toBe(401);
  await visitor.getByPlaceholder('Password', { exact: true }).fill('wrong');
  await visitor.getByRole('button', { name: 'View albums' }).click();
  await expect(visitor.getByRole('alert')).toHaveText('Incorrect password');
  await visitor.getByPlaceholder('Password', { exact: true }).fill('2468');
  await visitor.getByRole('button', { name: 'View albums' }).click();
  await expect(visitor.locator('.banner img')).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill('Changed privately');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await visitor.reload();
  await expect(
    visitor.getByRole('heading', { name: 'Acme monthly photography' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Page published');
  await visitor.reload();
  await visitor.getByPlaceholder('Password', { exact: true }).fill('2468');
  await visitor.getByRole('button', { name: 'View albums' }).click();
  await expect(
    visitor.getByRole('heading', { name: 'Changed privately' }),
  ).toBeVisible();
  await visitor.locator('.album').first().click();
  await visitor.getByLabel('Password', { exact: true }).fill('2468');
  await visitor.getByRole('button', { name: 'Submit' }).click();
  await expect(visitor.getByText('Native Immich viewer fixture')).toBeVisible();
  await page.goto('/page/manage');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Changed privately' }) })
    .getByRole('button', { name: 'Copy link', exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:3200/page/protected-client',
  );
  await page.screenshot({ path: 'test-results/pages.png', fullPage: true });
  await anonymous.close();
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
      .getByRole('heading', { name: 'Pages', exact: true }),
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
  ).toBe(200);
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get('/page/api/pages')).status()).toBe(401);
  await anonymous.close();
  await bob.close();
});

test('autosave recovers from an empty proxy error and rejects oversized branding before upload', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await page.route('**/page/api/pages', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 502, body: '' })
      : route.continue(),
  );
  await page
    .getByLabel('Title', { exact: true })
    .fill('Test response recovery');
  await expect(page.getByRole('alert')).toContainText('HTTP 502');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Test response recovery',
  );
  await page.unroute('**/page/api/pages');
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(page).not.toHaveURL(/\/manage\/new$/);
  let uploads = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/branding/')) uploads++;
  });
  await page.getByLabel('Banner', { exact: true }).setInputFiles({
    name: 'too-large.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(7 * 1024 * 1024),
  });
  await expect(page.getByRole('alert')).toContainText('5 MB');
  expect(uploads).toBe(0);
});

test('dropped branding creates an untitled draft, Options work on mobile, and stale tabs cannot overwrite edits', async ({
  page,
  context,
}) => {
  await page.goto('/dev-login/alice');
  const count = (await (await page.request.get('/page/api/pages')).json())
    .length;
  await page.goto('/page/manage/new');
  expect(
    (await (await page.request.get('/page/api/pages')).json()).length,
  ).toBe(count);
  const { readFile } = await import('node:fs/promises');
  const bytes = [...(await readFile('fixtures/photos/earthrise.webp'))];
  const transfer = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(data)], 'dropped-logo.webp', {
        type: 'image/webp',
      }),
    );
    return transfer;
  }, bytes);
  await page
    .getByRole('button', { name: 'Choose logo from Immich', exact: true })
    .dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByAltText('Logo preview')).toBeVisible();
  await expect(page).not.toHaveURL(/\/manage\/new$/);
  await page.getByLabel('Title', { exact: true }).fill('Drop and configure');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByRole('option', { name: 'Light', exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/options-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.reload();
  await expect(page.getByAltText('Logo preview')).toBeVisible();
  const other = await context.newPage();
  await other.goto(page.url());
  await page.getByLabel('Title', { exact: true }).fill('First tab saved');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await other
    .getByLabel('Title', { exact: true })
    .fill('Second tab conflicting');
  await expect(other.getByRole('alert')).toContainText('another tab');
  await expect(other.getByLabel('Title', { exact: true })).toHaveValue(
    'Second tab conflicting',
  );
  const id = page.url().split('/').pop();
  expect(
    (await (await page.request.get(`/page/api/pages/${id}`)).json()).title,
  ).toBe('First tab saved');
  await other.close();
});

test('photo picker browses owned albums and favorites and clears selection when switching views', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await page
    .getByRole('button', { name: 'Choose logo from Immich', exact: true })
    .click();
  await page.getByRole('button', { name: 'Select Studio logo.webp' }).click();
  await expect(
    page.getByRole('button', { name: 'Use as logo', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Albums', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Use as logo', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Liberty Family Camp ’26', exact: true })
    .click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /^Select / }),
  ).toHaveCount(8);
  await page.getByRole('switch', { name: 'Favorites only' }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /^Select / }),
  ).toHaveCount(4);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/manage\/new$/);
});
