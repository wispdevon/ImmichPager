import { expect, test, type Locator, type Page } from '@playwright/test';

const origin = 'http://127.0.0.1:3200';
type FixtureAlbum = {
  id: string;
  albumName: string;
  description?: string;
};
type Draft = { id: string; slug: string; draftRevision: number };

async function createDraft(
  page: Page,
  suffix: string,
  blocks: (albums: FixtureAlbum[]) => unknown[],
) {
  await page.goto('/dev-login/alice');
  const albums = (await (
    await page.request.get('/page/api/albums')
  ).json()) as FixtureAlbum[];
  const slug = `composer-polish-${suffix}-${Date.now()}`;
  const created = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: `Composer polish ${suffix}`,
      slug,
      blocks: blocks(albums),
    },
  });
  expect(created.ok()).toBe(true);
  const draft = (await created.json()) as Draft;
  await page.goto(`/page/manage/${draft.id}`);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  return { albums, draft };
}

function albumsBlock(albums: FixtureAlbum[], overrides = {}) {
  return {
    id: 'albums',
    type: 'albums',
    heading: 'A collection of our work',
    albumIds: albums.map((album) => album.id),
    order: 'manual',
    grouping: 'year',
    ...overrides,
  };
}

async function albumNames(group: Locator) {
  return group
    .locator('[data-album-order-row]')
    .evaluateAll((rows) =>
      rows.map(
        (row) => row.querySelector(':scope > span')?.textContent?.trim() ?? '',
      ),
    );
}

async function dragTo(
  page: Page,
  handle: Locator,
  target: Locator,
  placement: 'before' | 'after',
) {
  await handle.scrollIntoViewIfNeeded();
  const sourceBounds = await handle.boundingBox();
  expect(sourceBounds).not.toBeNull();
  await page.mouse.move(
    sourceBounds!.x + sourceBounds!.width / 2,
    sourceBounds!.y + sourceBounds!.height / 2,
  );
  await page.mouse.down();
  await target.scrollIntoViewIfNeeded();
  const targetBounds = await target.boundingBox();
  expect(targetBounds).not.toBeNull();
  await page.mouse.move(
    targetBounds!.x + targetBounds!.width / 2,
    placement === 'before'
      ? targetBounds!.y + 2
      : targetBounds!.y + targetBounds!.height - 2,
    { steps: 10 },
  );
  await page.mouse.up();
}

async function expectControlHasSvg(control: Locator) {
  await expect(control.locator('svg').first()).toBeAttached();
}

test('album reorder rows show prominent matching covers on desktop and phone without crowding selection controls', async ({
  page,
}) => {
  const { albums } = await createDraft(page, 'album-covers', (items) => [
    albumsBlock(items),
  ]);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (!(await page.locator('.inspector-tabs').isVisible()))
      await page.locator('.mobile-settings').click();
    for (const album of albums) {
      const row = page.locator(
        `[data-album-order-row][data-album-id="${album.id}"]`,
      );
      await row.scrollIntoViewIfNeeded();
      const image = row.locator('img');
      await expect(image).toHaveAttribute(
        'src',
        `/page/api/albums/${album.id}/cover`,
      );
      await expect
        .poll(() =>
          image.evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const bounds = await image.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(72);
      expect(bounds!.height).toBeGreaterThanOrEqual(72);
      const title = await row.locator(':scope > span').boundingBox();
      expect(title!.width).toBeGreaterThanOrEqual(120);
      expect(title!.x).toBeGreaterThanOrEqual(bounds!.x + bounds!.width);
    }
    const first = page.locator('[data-album-order-row]').first();
    await first.scrollIntoViewIfNeeded();
    const originalWidth = (await first.locator(':scope > span').boundingBox())!
      .width;
    await page
      .getByRole('button', { name: 'Select albums', exact: true })
      .click();
    await first.getByRole('checkbox').check();
    await expect(first.locator('img')).toBeVisible();
    expect((await first.locator(':scope > span').boundingBox())!.width).toBe(
      originalWidth,
    );
    await page
      .getByRole('button', { name: 'Done selecting', exact: true })
      .click();
  }
});

test('an unavailable album cover leaves a readable fallback and working album actions', async ({
  page,
}) => {
  const cspErrors: string[] = [];
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /content security policy/i.test(message.text())
    )
      cspErrors.push(message.text());
  });
  let unavailable = '';
  await page.route('**/page/api/albums/*/cover', (route) =>
    route.request().url().includes(unavailable)
      ? route.fulfill({ status: 404 })
      : route.continue(),
  );
  await createDraft(page, 'cover-fallback', (albums) => {
    unavailable = albums[0].id;
    return [albumsBlock(albums)];
  });
  const row = page.locator(
    `[data-album-order-row][data-album-id="${unavailable}"]`,
  );
  await row.scrollIntoViewIfNeeded();
  await expect(row.getByText('No cover', { exact: true })).toBeVisible();
  await expect(row.locator('img')).toHaveCount(0);
  await row.getByRole('button', { name: /^Actions for / }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Move down', exact: true }),
  ).toBeVisible();
  expect(cspErrors).toEqual([]);
});

test('narrow inspector controls fit and the selected block handle clears its heading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await createDraft(page, 'narrow', (albums) => [albumsBlock(albums)]);

  const inspector = page.locator('.inspector');
  const content = page.getByRole('region', { name: 'Page content' });
  const heading = content.getByRole('textbox', { name: 'Row heading' });
  const style = content.getByRole('radio', { name: 'Cards', exact: true });
  await expect(heading).toBeVisible();
  await expect(style).toBeVisible();

  for (const control of [heading, style]) {
    await control.focus();
    const fits = await control.evaluate((element) => {
      const panel = element.closest('.inspector')!;
      const visibleControl = element.matches('input[type=radio]')
        ? element.closest('label')!
        : element;
      const bounds = visibleControl.getBoundingClientRect();
      const panelBounds = panel.getBoundingClientRect();
      const style = getComputedStyle(visibleControl);
      const ring = Math.max(
        8,
        style.outlineStyle === 'none'
          ? 0
          : parseFloat(style.outlineWidth) +
              Math.max(0, parseFloat(style.outlineOffset)),
      );
      return (
        bounds.left - ring >= panelBounds.left &&
        bounds.right + ring <= panelBounds.right
      );
    });
    expect(
      fits,
      `${await control.getAttribute('aria-label')} and focus ring fit`,
    ).toBe(true);
  }
  expect(
    await inspector
      .locator('.inspector-content')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);

  const frame = page.frameLocator('[title="Live page canvas"]');
  const block = frame.locator('[data-block-id="albums"]');
  const handle = block.locator('.block-handle');
  const editableHeading = block.getByRole('textbox', { name: 'Block heading' });
  await expect(handle).toBeVisible();
  await expect(editableHeading).toBeVisible();
  const overlaps = await handle.evaluate((element) => {
    const a = element.getBoundingClientRect();
    const b = element
      .closest('[data-block-id]')!
      .querySelector<HTMLElement>('[aria-label="Block heading"]')!
      .getBoundingClientRect();
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  });
  expect(overlaps).toBe(false);
});

test('editorial album covers stay compact and show the Immich album description on desktop and phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { albums } = await createDraft(page, 'editorial', (items) => [
    albumsBlock(items, { layout: 'editorial' }),
  ]);
  const album = albums[0];
  expect(
    album.description,
    'fixture exposes the upstream album description',
  ).toBeTruthy();

  const frameElement = page.locator('[title="Live page canvas"]');
  const frame = page.frameLocator('[title="Live page canvas"]');
  const row = frame.getByRole('button', { name: album.albumName, exact: true });
  const cover = row.locator('.cover');
  await expect(
    row.getByText(album.description!, { exact: true }),
  ).toBeVisible();
  const desktopCover = await cover.boundingBox();
  expect(desktopCover).not.toBeNull();
  expect(desktopCover!.width).toBeLessThanOrEqual(320);
  expect(desktopCover!.height).toBeLessThanOrEqual(240);

  await page.screenshot({
    path: 'test-results/composer-polish-editorial-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Phone canvas', exact: true }).click();
  await expect
    .poll(() =>
      frameElement.evaluate((iframe) => iframe.contentWindow?.innerWidth),
    )
    .toBe(390);
  const phoneCover = await cover.boundingBox();
  expect(phoneCover).not.toBeNull();
  expect(phoneCover!.width).toBeLessThanOrEqual(300);
  expect(phoneCover!.height).toBeLessThanOrEqual(225);
  await expect(
    row.getByText(album.description!, { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/composer-polish-editorial-phone.png',
    fullPage: true,
  });
});

test('composer and viewer controls render SVG icons', async ({ page }) => {
  const { albums, draft } = await createDraft(page, 'icons', (items) => [
    albumsBlock(items.slice(0, 1)),
  ]);
  for (const name of ['Content', 'Design']) {
    const tab = page.getByRole('button', {
      name: `${name} inspector`,
      exact: true,
    });
    await expectControlHasSvg(tab);
    await tab.click();
  }
  await page
    .getByRole('button', { name: 'Content inspector', exact: true })
    .click();
  await expectControlHasSvg(
    page.getByRole('button', { name: /Reorder albums row 1/ }),
  );
  for (const name of ['Desktop canvas', 'Tablet canvas', 'Phone canvas'])
    await expectControlHasSvg(page.getByRole('button', { name, exact: true }));

  const published = await page.request.post(
    `/page/api/pages/${draft.id}/publish`,
    {
      headers: { origin },
      data: { expectedDraftRevision: draft.draftRevision },
    },
  );
  expect(published.ok()).toBe(true);
  await page.goto(`/page/${draft.slug}`);
  await page
    .getByRole('button', { name: albums[0].albumName, exact: true })
    .click();
  const expanded = page.getByRole('region', { name: 'Expanded album' });
  await expanded
    .getByRole('button', { name: /Open photo/ })
    .first()
    .click();
  const viewer = page.getByRole('dialog', { name: 'Photo viewer' });
  await expect(viewer).toBeVisible();
  const viewerControls = [
    viewer.getByRole('button', { name: 'Play slideshow', exact: true }),
    viewer.getByRole('link', { name: 'Download original', exact: true }),
    viewer.getByRole('button', { name: 'Full screen', exact: true }),
    viewer.getByRole('button', { name: 'Close photo viewer', exact: true }),
    viewer.getByRole('button', { name: 'Previous photo', exact: true }),
    viewer.getByRole('button', { name: 'Next photo', exact: true }),
  ];
  for (const control of viewerControls) await expectControlHasSvg(control);
  await expect(viewer.locator('img')).toHaveClass(/loaded/);
  await page.screenshot({
    path: 'test-results/composer-polish-viewer-icons.png',
    animations: 'disabled',
  });
});

test('manual album drag commits once on release and Escape cancels the next drag', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  const { draft } = await createDraft(page, 'drag', (albums) => [
    albumsBlock(albums),
  ]);
  const groups = page.locator('.order-year');
  const year2026 = groups.filter({
    has: page.getByRole('heading', { name: '2026', exact: true }),
  });
  const year2025 = groups.filter({
    has: page.getByRole('heading', { name: '2025', exact: true }),
  });
  const before = await albumNames(year2026);
  const otherYearBefore = await albumNames(year2025);
  expect(before.length).toBeGreaterThan(2);
  let pageWrites = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'PUT' &&
      request.url().includes(`/page/api/pages/${draft.id}`)
    )
      pageWrites++;
  });

  const firstHandle = page.getByRole('button', {
    name: /Reorder Liberty Family Camp/,
  });
  const lastRow = year2026.locator('[data-album-order-row]').last();
  await firstHandle.scrollIntoViewIfNeeded();
  const firstBounds = await firstHandle.boundingBox();
  expect(firstBounds).not.toBeNull();
  await page.mouse.move(
    firstBounds!.x + firstBounds!.width / 2,
    firstBounds!.y + firstBounds!.height / 2,
  );
  await page.mouse.down();
  await lastRow.scrollIntoViewIfNeeded();
  const lastBounds = await lastRow.boundingBox();
  expect(lastBounds).not.toBeNull();
  await page.mouse.move(
    lastBounds!.x + lastBounds!.width / 2,
    lastBounds!.y + lastBounds!.height - 2,
    { steps: 10 },
  );
  await page.waitForTimeout(700);
  expect(pageWrites).toBe(0);
  await page.mouse.up();
  await expect
    .poll(() => albumNames(year2026))
    .toEqual([...before.slice(1), before[0]]);
  await expect.poll(() => albumNames(year2025)).toEqual(otherYearBefore);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect.poll(() => pageWrites).toBe(1);

  const committedOrder = await albumNames(year2026);
  const source = page.getByRole('button', {
    name: new RegExp(`Reorder ${committedOrder.at(-1)}`),
  });
  const target = year2026.locator('[data-album-order-row]').first();
  await source.scrollIntoViewIfNeeded();
  const sourceBounds = await source.boundingBox();
  expect(sourceBounds).not.toBeNull();
  await page.mouse.move(
    sourceBounds!.x + sourceBounds!.width / 2,
    sourceBounds!.y + sourceBounds!.height / 2,
  );
  await page.mouse.down();
  await target.scrollIntoViewIfNeeded();
  const targetBounds = await target.boundingBox();
  expect(targetBounds).not.toBeNull();
  await page.mouse.move(
    targetBounds!.x + targetBounds!.width / 2,
    targetBounds!.y + 2,
    { steps: 8 },
  );
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(() => albumNames(year2026)).toEqual(committedOrder);
  await page.waitForTimeout(700);
  expect(pageWrites).toBe(1);
});

test('manual album drag moves a checked selection together while preserving selection order', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await createDraft(page, 'group-drag', (items) => [albumsBlock(items)]);
  const group = page.locator('.order-year').filter({
    has: page.getByRole('heading', { name: '2026', exact: true }),
  });
  const before = await albumNames(group);
  const selectedNames = before.slice(0, 2);
  await expect(group.getByRole('checkbox')).toHaveCount(0);
  const firstRow = group.locator('[data-album-order-row]').first();
  await expect(firstRow.getByRole('button')).toHaveCount(2);
  expect((await firstRow.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  expect(
    (await firstRow.locator(':scope > span').boundingBox())!.width,
  ).toBeGreaterThanOrEqual(150);
  await page
    .getByRole('button', { name: 'Select albums', exact: true })
    .click();
  for (const name of selectedNames) {
    const checkbox = page.getByRole('checkbox', {
      name: `Select ${name} for reordering`,
      exact: true,
    });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }

  const source = page.getByRole('button', {
    name: new RegExp(`Reorder ${selectedNames[0]}`),
  });
  const target = group.locator('[data-album-order-row]').last();
  await dragTo(page, source, target, 'after');
  await expect
    .poll(() => albumNames(group))
    .toEqual([...before.slice(2), ...selectedNames]);
  await expect(
    page.getByRole('checkbox', {
      name: `Select ${selectedNames[0]} for reordering`,
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', {
      name: `Select ${selectedNames[1]} for reordering`,
      exact: true,
    }),
  ).toBeChecked();
});

test('album dragging scrolls to a distant destination and dropping outside cancels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 600 });
  await createDraft(page, 'scroll-drag', (albums) => [albumsBlock(albums)]);
  const group = page
    .locator('.order-year')
    .filter({ has: page.getByRole('heading', { name: '2026', exact: true }) });
  const before = await albumNames(group);
  const list = page.locator('.album-order-list');
  const handle = page.getByRole('button', {
    name: /Reorder Liberty Family Camp/,
  });
  await handle.scrollIntoViewIfNeeded();
  const start = await handle.boundingBox();
  const bounds = await list.boundingBox();
  await page.mouse.move(
    start!.x + start!.width / 2,
    start!.y + start!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    start!.x + start!.width / 2,
    Math.min(bounds!.y + bounds!.height - 8, 580),
    { steps: 8 },
  );
  await expect
    .poll(() => list.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  const last = group.locator('[data-album-order-row]').last();
  await expect
    .poll(async () => {
      const row = await last.boundingBox();
      const current = await list.boundingBox();
      return (
        !!row &&
        !!current &&
        row.y + row.height <= Math.min(current.y + current.height, 600)
      );
    })
    .toBe(true);
  const target = await last.boundingBox();
  await page.mouse.move(
    target!.x + target!.width / 2,
    target!.y + target!.height - 2,
  );
  await page.mouse.up();
  await expect
    .poll(() => albumNames(group))
    .toEqual([...before.slice(1), before[0]]);
  const committed = await albumNames(group);
  await handle.scrollIntoViewIfNeeded();
  const again = await handle.boundingBox();
  await page.mouse.move(
    again!.x + again!.width / 2,
    again!.y + again!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(800, 200, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => albumNames(group)).toEqual(committed);
});
