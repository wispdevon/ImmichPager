import { test, expect, type Page } from '@playwright/test';
import { setHeaderText } from './header-editor';
import { confirmPublication } from './publication-helper';

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
  await setHeaderText(page, 'Title', 'Acme monthly photography');
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
  await setHeaderText(page, 'Description', 'Our work over the months.');
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
  const firstReview = page.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(
    firstReview.getByRole('heading', { name: 'Albums to publish' }),
  ).toBeVisible();
  await expect(firstReview).toContainText('Liberty Family Camp ’26');
  expect(await firstReview.innerText()).not.toContain('2468');
  await firstReview
    .getByRole('button', { name: 'Publish page', exact: true })
    .click();
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
  await setHeaderText(page, 'Title', 'Changed privately');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await visitor.reload();
  await expect(
    visitor.getByRole('heading', { name: 'Acme monthly photography' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  const updateReview = page.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(updateReview).toContainText('Page title');
  await updateReview
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(updateReview).toHaveCount(0);
  await visitor.reload();
  await expect(
    visitor.getByRole('heading', { name: 'Acme monthly photography' }),
  ).toBeVisible();
  await confirmPublication(page, 'Update live page');
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
  const ownerDraft = await (
    await page.request.get(`/page/api/pages/${id}`)
  ).json();
  const reviewUrl = `/page/api/pages/${id}/publication-review?expectedDraftRevision=${ownerDraft.draftRevision}`;
  const reviewResponse = await page.request.get(reviewUrl);
  expect(reviewResponse.ok()).toBe(true);
  expect(JSON.stringify(await reviewResponse.json())).not.toMatch(
    /passwordHash|native-cookie|shareId|"key"/i,
  );
  expect(
    (
      await page.request.get(`/page/api/pages/${id}/publication-review`)
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.get(
        `/page/api/pages/${id}/publication-review?expectedDraftRevision=${ownerDraft.draftRevision - 1}`,
      )
    ).status(),
  ).toBe(409);
  const bob = await browser.newContext();
  await bob.request.get('/dev-login/bob');
  expect((await bob.request.get(`/page/api/pages/${id}`)).status()).toBe(404);
  expect((await bob.request.get(reviewUrl)).status()).toBe(404);
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
  expect((await anonymous.request.get(reviewUrl)).status()).toBe(401);
  await anonymous.close();
  await bob.close();
});

test('duplicates only appearance and branding into a private draft', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  const origin = 'http://127.0.0.1:3200';
  let sourceResponse = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'A source design for Acme',
      slug: 'source-design-for-acme',
      description: 'A description that belongs only to the source page.',
      albumIds: ['00000000-0000-4000-8000-000000000001'],
      theme: 'light',
      background: '#112233',
      foreground: '#ddeeff',
      accent: '#abcdef',
      alignment: 'center',
      headerLayout: 'overlay',
      headerSize: 'tall',
      logoSize: 112,
      titleSize: 3.5,
      descriptionSize: 1.25,
      headerSpacing: 3.5,
      customCss: ':scope { --pager-accent: #abcdef; }',
      bannerPosition: 28,
      order: 'manual',
    },
  });
  expect(sourceResponse.ok()).toBe(true);
  let source = await sourceResponse.json();
  for (const kind of ['logo', 'banner']) {
    sourceResponse = await page.request.post(
      `/page/api/pages/${source.id}/branding/${kind}`,
      {
        headers: { origin },
        data: {
          assetId: '10000000-0000-4000-8000-000000000001',
          expectedDraftRevision: source.draftRevision,
        },
      },
    );
    expect(sourceResponse.ok()).toBe(true);
    source = await sourceResponse.json();
  }
  sourceResponse = await page.request.post(
    `/page/api/pages/${source.id}/publish`,
    {
      headers: { origin },
      data: {
        password: 'source-pin',
        passwordMode: 'set',
        expectedDraftRevision: source.draftRevision,
      },
    },
  );
  expect(sourceResponse.ok()).toBe(true);
  source = await sourceResponse.json();
  expect(source.publishedSlug).toBe('source-design-for-acme');
  expect(source.hasPassword).toBe(true);

  const sharesBefore = await (
    await page.request.get('/api/shared-links')
  ).json();
  await page.goto('/page/manage');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const sourceRow = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'A source design for Acme' }),
  });
  await sourceRow
    .getByRole('button', {
      name: 'Duplicate design for A source design for Acme',
    })
    .click();
  await expect(page).toHaveURL(/\/page\/manage\/[0-9a-f-]+$/);
  const duplicateId = page.url().split('/').pop()!;
  await expect(
    page.getByRole('button', { name: 'Edit title, Add a title', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Edit description, Add a description',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByAltText('Logo preview')).toBeVisible();
  await expect(page.getByAltText('Banner preview')).toBeVisible();
  const duplicateResponse = await page.request.get(
    `/page/api/pages/${duplicateId}`,
  );
  expect(duplicateResponse.ok()).toBe(true);
  const duplicate = await duplicateResponse.json();
  expect(duplicate).toMatchObject({
    title: '',
    description: '',
    slug: '',
    albumIds: [],
    order: 'newest',
    theme: 'light',
    background: '#112233',
    foreground: '#ddeeff',
    accent: '#abcdef',
    alignment: 'center',
    headerLayout: 'overlay',
    headerSize: 'tall',
    logoSize: 112,
    titleSize: 3.5,
    descriptionSize: 1.25,
    headerSpacing: 3.5,
    customCss: ':scope { --pager-accent: #abcdef; }',
    bannerPosition: 28,
    logo: true,
    banner: true,
    status: 'draft',
    publishedSlug: null,
    publishedRevision: null,
    hasPassword: false,
  });
  expect(duplicate).not.toHaveProperty('passwordHash');
  expect(duplicate).not.toHaveProperty('key');
  expect(duplicate).not.toHaveProperty('password');
  expect(await (await page.request.get('/api/shared-links')).json()).toEqual(
    sharesBefore,
  );
  expect(
    (await page.request.get('/page/source-design-for-acme')).status(),
  ).toBe(200);

  const bob = await browser.newContext();
  await bob.request.get('/dev-login/bob');
  const denied = await bob.request.post(
    `/page/api/pages/${source.id}/duplicate`,
    { headers: { origin }, data: {} },
  );
  expect(denied.status()).toBe(404);
  expect(await (await bob.request.get('/page/api/pages')).json()).toEqual([]);
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
  await setHeaderText(page, 'Title', 'Test response recovery');
  await expect(page.getByRole('alert')).toContainText('HTTP 502');
  await expect(
    page.getByRole('button', { name: 'Edit title, Test response recovery' }),
  ).toBeVisible();
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
  await setHeaderText(page, 'Title', 'Drop and configure');
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
  await setHeaderText(page, 'Title', 'First tab saved');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await setHeaderText(other, 'Title', 'Second tab conflicting');
  await expect(other.getByRole('alert')).toContainText('another tab');
  await expect(
    other.getByRole('button', {
      name: 'Edit title, Second tab conflicting',
    }),
  ).toBeVisible();
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
