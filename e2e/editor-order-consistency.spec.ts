import { expect, test, type Page, type Locator } from '@playwright/test';
import { effectiveAlbumOrder } from '../src/lib/album-order';
import { applyTheme, builtInThemes } from '../src/lib/themes';
import { parsePageInput } from '../src/lib/contracts';
import { openCustomize, openDesignGroup } from './customize-helper';

const origin = 'http://127.0.0.1:3200';
async function createOrderedDraft(
  page: Page,
  grouping: 'year' | 'none',
  count = 2,
) {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const ids = albums
    .slice(0, count)
    .map((a: { id: string }) => a.id) as string[];
  const response = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'Consistent album order',
      slug: `order-consistency-${grouping}-${Date.now()}`,
      blocks: [
        {
          id: 'albums',
          type: 'albums',
          albumIds: ids,
          order: 'newest',
          grouping,
        },
      ],
    },
  });
  expect(response.ok()).toBe(true);
  const record = await response.json();
  await page.goto(`/page/manage/${record.id}`);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  return {
    record,
    ids,
    albums,
    displayed: effectiveAlbumOrder(ids, albums, 'newest', grouping),
  };
}
async function inspectorIds(page: Page) {
  return page
    .locator('[data-album-order-row]')
    .evaluateAll((rows) => rows.map((n) => (n as HTMLElement).dataset.albumId));
}
async function canvasIds(page: Page) {
  return page
    .frameLocator('[title="Live page canvas"]')
    .locator('.ip-album')
    .evaluateAll((rows) => rows.map((n) => n.id.replace('album-albums-', '')));
}
async function current(page: Page, id: string) {
  return (await page.request.get(`/page/api/pages/${id}`)).json();
}
async function beginDrag(
  page: Page,
  handle: Locator,
  target: Locator,
  position: 'before' | 'after',
) {
  await handle.scrollIntoViewIfNeeded();
  const a = (await handle.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  await page.mouse.move(
    b.x + b.width / 2,
    position === 'before' ? b.y + 2 : b.y + b.height - 2,
    { steps: 8 },
  );
}

for (const grouping of ['year', 'none'] as const) {
  test(`inspector, first move and Manual transition preserve the displayed ${grouping} order`, async ({
    page,
  }) => {
    const { record, ids, displayed } = await createOrderedDraft(page, grouping);
    await expect.poll(() => inspectorIds(page)).toEqual(displayed);
    await expect.poll(() => canvasIds(page)).toEqual(displayed);
    expect((await current(page, record.id)).draftRevision).toBe(
      record.draftRevision,
    );
    // This genuine move returns to the originally stored IDs. It must still commit Manual.
    await page
      .locator(`[data-album-id="${displayed[0]}"] .drag-handle`)
      .press('ArrowDown');
    await expect
      .poll(async () => (await current(page, record.id)).blocks[0])
      .toMatchObject({ order: 'manual', albumIds: ids });
    await expect.poll(() => canvasIds(page)).toEqual(ids);
    await page
      .getByRole('combobox', { name: 'Order', exact: true })
      .selectOption('newest');
    await expect.poll(() => canvasIds(page)).toEqual(displayed);
    await page
      .getByRole('combobox', { name: 'Order', exact: true })
      .selectOption('manual');
    await expect
      .poll(async () => (await current(page, record.id)).blocks[0])
      .toMatchObject({ order: 'manual', albumIds: displayed });
    await expect.poll(() => canvasIds(page)).toEqual(displayed);
  });
}

test('newest-first no-op, cancelled and outside-list drops keep the saved order and mode untouched', async ({
  page,
}) => {
  const { record, ids, displayed } = await createOrderedDraft(page, 'none', 3);
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().endsWith('/' + record.id))
      writes++;
  });
  const row = (id: string) => page.locator(`[data-album-id="${id}"]`);
  const handle = row(displayed[0]).locator('.drag-handle');
  await handle.press('ArrowUp');
  await beginDrag(page, handle, row(displayed[1]), 'before');
  await page.mouse.up();
  await beginDrag(page, handle, row(displayed[1]), 'after');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await beginDrag(page, handle, row(displayed[1]), 'after');
  const bounds = (await page.locator('.album-order-list').boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    Math.max(1, bounds.y - 20),
  );
  await page.mouse.up();
  await page.waitForTimeout(700); // Exceed the autosave debounce to detect accidental mutations.
  expect(writes).toBe(0);
  expect((await current(page, record.id)).blocks[0]).toMatchObject({
    order: 'newest',
    albumIds: ids,
  });
  expect((await current(page, record.id)).draftRevision).toBe(
    record.draftRevision,
  );
  await expect.poll(() => inspectorIds(page)).toEqual(displayed);
});

test('the first multi-album drag materializes newest order and retains displayed selection order', async ({
  page,
}) => {
  const { record, displayed } = await createOrderedDraft(page, 'year', 4);
  await page
    .getByRole('button', { name: 'Select to reorder', exact: true })
    .click();
  const row = (id: string) => page.locator(`[data-album-id="${id}"]`);
  await row(displayed[1]).getByRole('checkbox').check();
  await row(displayed[0]).getByRole('checkbox').check();
  await beginDrag(
    page,
    row(displayed[0]).locator('.drag-handle'),
    row(displayed[3]),
    'after',
  );
  await page.mouse.up();
  const expected = [displayed[2], displayed[3], displayed[0], displayed[1]];
  await expect
    .poll(async () => (await current(page, record.id)).blocks[0])
    .toMatchObject({ order: 'manual', albumIds: expected });
  await expect.poll(() => inspectorIds(page)).toEqual(expected);
  await expect.poll(() => canvasIds(page)).toEqual(expected);
  await expect(page.locator('.order-row.selected')).toHaveCount(2);
});

test('photo actions work without opening metadata and Text exposes only effective controls', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const photos = (
    await (await page.request.get('/page/api/photos')).json()
  ).items.slice(1, 4);
  const input = applyTheme(
    parsePageInput({
      title: 'Media actions',
      slug: 'accessible-photo-actions',
      blocks: [
        { id: 'text', type: 'text', heading: 'A note' },
        {
          id: 'photos',
          type: 'photos',
          photos: photos.map((photo: { id: string }) => ({ id: photo.id })),
        },
      ],
    }),
    builtInThemes[0],
  );
  const response = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: input,
  });
  expect(response.ok()).toBe(true);
  const record = await response.json();
  await page.goto(`/page/manage/${record.id}`);
  await expect(
    page.getByRole('checkbox', { name: 'Use theme layout' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('combobox', { name: 'Alignment', exact: true }),
  ).toBeVisible();
  await page.locator('.select-row').nth(1).click();
  await expect(
    page.getByRole('checkbox', { name: 'Use theme layout' }),
  ).toHaveAccessibleDescription(
    'Changing layout settings customizes this row.',
  );
  await expect(page.locator('.photo-settings[open]')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Actions for photo 1', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Move down', exact: true }).click();
  await expect
    .poll(async () =>
      (await current(page, record.id)).blocks[1].photos.map(
        (photo: { id: string }) => photo.id,
      ),
    )
    .toEqual([photos[1].id, photos[0].id, photos[2].id]);
  await expect(page.locator('.photo-settings[open]')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Actions for photo 1', exact: true })
    .click();
  await page
    .getByRole('menuitem', { name: 'Remove photo', exact: true })
    .click();
  await expect(page.locator('.photo-item')).toHaveCount(2);
  await expect(page.locator('.photo-settings summary').first()).toBeFocused();
  await page.locator('.photo-settings summary').first().press('Enter');
  await expect(
    page
      .locator('.photo-settings[open]')
      .getByLabel('Caption', { exact: true }),
  ).toBeVisible();
  await page
    .locator('.photo-settings[open]')
    .getByLabel('Caption', { exact: true })
    .fill('A meaningful caption');
  await expect
    .poll(
      async () => (await current(page, record.id)).blocks[1].photos[0].caption,
    )
    .toBe('A meaningful caption');
  await expect(
    page.getByRole('radio', { name: 'Justified', exact: true }),
  ).toHaveAccessibleDescription('Even rows preserving photo proportions');
});

test('touch resets, row actions and illustrated choices remain usable at 320px', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await createOrderedDraft(page, 'none');
    await page.locator('.mobile-settings').click();
    const arrows = page.locator('.block-bar button[aria-label^="Move row"]');
    for (const arrow of await arrows.all()) {
      const bounds = (await arrow.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await expect(
      page.getByRole('radio', { name: 'Cards', exact: true }),
    ).toHaveAccessibleDescription('Album covers with titles below');
    await openCustomize(page);
    await expect(
      page.getByRole('button', { name: 'Reset all customization' }),
    ).toContainText('Reset all');
    await openDesignGroup(page, 'layout');
    await expect(
      page.locator('[data-design-group="layout"] .setting-label svg'),
    ).toHaveCount(7);
    const width = page.getByRole('slider', {
      name: 'Content width',
      exact: true,
    });
    await width.press('ArrowRight');
    const reset = page.getByRole('button', {
      name: 'Reset Content width to default',
      exact: true,
    });
    const bounds = (await reset.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await reset.tap();
    await expect(width).toBeFocused();
    expect(
      await page
        .locator('.design-panel')
        .evaluate((n) => n.scrollWidth <= n.clientWidth),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
