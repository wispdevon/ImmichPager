import { expect, test, type Page } from '@playwright/test';
import { confirmPublication } from './publication-helper';

async function createManualDraft(page: Page, slug: string) {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Manual album order',
      slug,
      albumIds: albums.map((album: { id: string }) => album.id),
      order: 'manual',
    },
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  await page.goto(`/page/manage/${record.id}`);
  if (!(await page.locator('.inspector-tabs').isVisible()))
    await page.locator('.mobile-settings').click();
  await page
    .getByRole('button', { name: 'Content inspector', exact: true })
    .click();
  return albums;
}

async function albumNames(group: ReturnType<Page['locator']>) {
  return group
    .locator('[data-album-order-row]')
    .evaluateAll((rows) =>
      rows.map(
        (row) => row.querySelector(':scope > span')?.textContent?.trim() ?? '',
      ),
    );
}

test('manual album order supports drag and keyboard without crossing years and publishes explicitly', async ({
  page,
  browser,
}) => {
  const slug = `album-order-${Date.now()}`;
  await createManualDraft(page, slug);

  const groups = page.locator('.order-year');
  await expect(groups.locator('h3')).toHaveText(['2026', '2025']);
  const year2026 = groups.filter({
    has: page.getByRole('heading', { name: '2026', exact: true }),
  });
  const year2025 = groups.filter({
    has: page.getByRole('heading', { name: '2025', exact: true }),
  });
  await expect(year2026.locator('[data-album-order-row]')).toHaveCount(8);
  await expect(year2025.locator('[data-album-order-row]')).toHaveCount(1);

  const source = page.getByRole('button', {
    name: /Reorder Liberty Family Camp/,
  });
  const target = year2026
    .locator('[data-album-order-row]')
    .filter({ hasText: 'Captured by Me' });
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  await expect(source).toBeInViewport();
  await expect(target).toBeInViewport();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + targetBox!.height / 2 + 4,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(() => albumNames(year2026))
    .toEqual([
      'Captured by Me',
      'Liberty Family Camp ’26',
      'Photos Day 1 — The One Camp',
      'Alive · April gathering',
      'The summer collection',
      'A new perspective',
      'February stories',
      'The year begins',
    ]);

  await page
    .getByRole('button', { name: /Reorder Liberty Family Camp/ })
    .press('ArrowDown');
  await expect
    .poll(() => albumNames(year2026))
    .toEqual([
      'Captured by Me',
      'Photos Day 1 — The One Camp',
      'Liberty Family Camp ’26',
      'Alive · April gathering',
      'The summer collection',
      'A new perspective',
      'February stories',
      'The year begins',
    ]);
  await page
    .getByRole('button', {
      name: 'Actions for Liberty Family Camp ’26',
      exact: true,
    })
    .click();
  const moveUp = page.getByRole('menuitem', {
    name: 'Move up',
    exact: true,
  });
  await moveUp.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => albumNames(year2026))
    .toEqual([
      'Captured by Me',
      'Liberty Family Camp ’26',
      'Photos Day 1 — The One Camp',
      'Alive · April gathering',
      'The summer collection',
      'A new perspective',
      'February stories',
      'The year begins',
    ]);
  await page
    .getByRole('button', { name: 'Actions for Captured by Me', exact: true })
    .click();
  await expect(
    page.getByRole('menuitem', { name: 'Move up', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(await albumNames(year2025)).toEqual(['December, together']);

  const anonymous = await browser.newPage();
  expect((await anonymous.request.get(`/page/${slug}`)).status()).toBe(404);
  if (await page.getByRole('button', { name: 'Close settings' }).isVisible())
    await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.reload();
  if (!(await page.locator('.inspector-tabs').isVisible()))
    await page.locator('.mobile-settings').click();
  await page
    .getByRole('button', { name: 'Content inspector', exact: true })
    .click();
  const reloaded2026 = page.locator('.order-year').filter({
    has: page.getByRole('heading', { name: '2026', exact: true }),
  });
  await expect(await albumNames(reloaded2026)).toEqual([
    'Captured by Me',
    'Liberty Family Camp ’26',
    'Photos Day 1 — The One Camp',
    'Alive · April gathering',
    'The summer collection',
    'A new perspective',
    'February stories',
    'The year begins',
  ]);
  if (await page.getByRole('button', { name: 'Close settings' }).isVisible())
    await page.getByRole('button', { name: 'Close settings' }).click();
  await confirmPublication(page, 'Publish page');
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'Page published',
  );

  await anonymous.goto(`/page/${slug}`);
  const publicGroups = anonymous.locator('.ip-year-group');
  await expect(publicGroups.locator('.ip-year-heading .year-title')).toHaveText(
    ['2026', '2025'],
  );
  await expect(
    publicGroups.nth(0).locator('.ip-album-info h3').first(),
  ).toHaveText('Captured by Me');
  await expect(
    publicGroups.nth(0).locator('.ip-album-info h3').nth(1),
  ).toHaveText('Liberty Family Camp ’26');
  await expect(publicGroups.nth(1).locator('.ip-album-info h3')).toHaveText([
    'December, together',
  ]);
  await anonymous.close();
});

test('touch dragging reorders albums within a year', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await createManualDraft(page, `album-order-touch-${Date.now()}`);
    const year2026 = page.locator('.order-year').filter({
      has: page.getByRole('heading', { name: '2026', exact: true }),
    });
    const before = await albumNames(year2026);
    const source = page.getByRole('button', {
      name: /Reorder Liberty Family Camp/,
    });
    const target = year2026
      .locator('[data-album-order-row]')
      .filter({ hasText: 'Captured by Me' });
    await source.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    const cdp = await context.newCDPSession(page);
    const x = sourceBox!.x + sourceBox!.width / 2;
    const y = sourceBox!.y + sourceBox!.height / 2;
    const targetY = targetBox!.y + targetBox!.height / 2 + 4;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: targetY, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(() => albumNames(year2026))
      .toEqual(['Captured by Me', before[0], ...before.slice(2)]);
    await cdp.detach();
  } finally {
    await context.close();
  }
});
