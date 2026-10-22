import { expect, test, type Locator } from '@playwright/test';

async function focusRingContrast(album: Locator) {
  return album.evaluate((element) => {
    const channels = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (value: string) => {
      const linear = channels(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const outline = luminance(getComputedStyle(element).outlineColor);
    const background = luminance(
      getComputedStyle(document.querySelector('.gallery')!).backgroundColor,
    );
    return (
      (Math.max(outline, background) + 0.05) /
      (Math.min(outline, background) + 0.05)
    );
  });
}

async function albumTrackWidths(grid: Locator) {
  return grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(' ').map(parseFloat),
  );
}

async function titleTextContrast(album: Locator) {
  return album.locator('h3').evaluate((heading) => {
    const channels = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (value: string) => {
      const linear = channels(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const foreground = luminance(getComputedStyle(heading).color);
    const background = luminance(
      getComputedStyle(document.querySelector('.gallery')!).backgroundColor,
    );
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
}

test('public gallery browsing, responsive layout, and year navigation work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/page/acme');

  await expect(page.locator('.album')).toHaveCount(9);
  const desktopTrackWidths = await albumTrackWidths(
    page.locator('.album-grid').first(),
  );
  expect(desktopTrackWidths.length).toBeGreaterThan(1);
  expect(Math.min(...desktopTrackWidths)).toBeGreaterThanOrEqual(224);
  await expect(page.locator('.year-title').first()).toHaveCSS(
    'font-size',
    '30px',
  );
  await expect(page.locator('.group-count').first()).toHaveCSS(
    'font-size',
    '16px',
  );
  const firstAlbum = page.locator('.album').first();
  await expect(firstAlbum).toHaveCSS('padding', '20px');
  await expect(firstAlbum).toHaveCSS('border-top-left-radius', '16px');
  await expect(firstAlbum).toHaveCSS('transition-duration', '0s');
  await expect(firstAlbum.locator('h3')).toHaveCSS('font-size', '18px');
  await expect(firstAlbum.locator('.album-info p').first()).toHaveCSS(
    'font-size',
    '14px',
  );
  const metadata = firstAlbum.locator('.album-metadata');
  await expect(metadata.locator('.item-count')).toHaveText(/\d+ items?/);
  await expect(metadata.locator('.shared-separator')).toHaveText('•');
  await expect(metadata.locator('.shared').locator('span').last()).toHaveText(
    'Shared',
  );
  const metadataGaps = await metadata.evaluate((element) => {
    const count = element.querySelector('.item-count')!.getBoundingClientRect();
    const shared = element.querySelector('.shared')!;
    const sharedBounds = shared.getBoundingClientRect();
    const separator = shared
      .querySelector('.shared-separator')!
      .getBoundingClientRect();
    const label = shared.lastElementChild!.getBoundingClientRect();
    return {
      countToShared: sharedBounds.left - count.right,
      bulletToLabel: label.left - separator.right,
      metadataColumnGap: getComputedStyle(element).columnGap,
      sharedGap: getComputedStyle(shared).columnGap,
    };
  });
  expect(metadataGaps.countToShared).toBeGreaterThanOrEqual(7.9);
  expect(metadataGaps.bulletToLabel).toBeGreaterThanOrEqual(7.9);
  expect(metadataGaps.metadataColumnGap).toBe('8px');
  expect(metadataGaps.sharedGap).toBe('8px');
  const cover = firstAlbum.locator('.cover');
  const coverBox = await cover.boundingBox();
  expect(coverBox).not.toBeNull();
  expect(Math.abs(coverBox!.width - coverBox!.height)).toBeLessThan(1);
  await expect(page.getByLabel('Album name')).toBeVisible();
  await expect(page.getByLabel('Month')).toBeVisible();
  await expect(page.getByLabel('Jump to year')).toBeVisible();
  await expect(page.getByLabel('Month')).toHaveValue('');
  await expect(page.getByLabel('Month').locator('option')).toHaveCount(13);
  await expect(page.getByLabel('Month').locator('option').first()).toHaveText(
    'All months',
  );
  await page.screenshot({
    path: 'test-results/native-gallery-desktop-dark.png',
  });

  const defaultSurface = await firstAlbum.evaluate((album) => ({
    background: getComputedStyle(album).backgroundColor,
    border: getComputedStyle(album).borderColor,
  }));
  expect(defaultSurface.background).toMatch(/rgba\(0, 0, 0, 0\)/);
  await firstAlbum.hover();
  const hoveredSurface = await firstAlbum.evaluate((album) => ({
    background: getComputedStyle(album).backgroundColor,
    border: getComputedStyle(album).borderColor,
  }));
  expect(hoveredSurface.background).not.toBe(defaultSurface.background);
  expect(hoveredSurface.border).not.toBe(defaultSurface.border);
  await page.mouse.move(0, 0);

  for (let step = 0; step < 5; step++) await page.keyboard.press('Tab');
  await expect(firstAlbum).toBeFocused();
  expect(
    await firstAlbum.evaluate((album) => album.matches(':focus-visible')),
  ).toBe(true);
  await expect(firstAlbum).toHaveCSS('outline-style', 'solid');
  expect(await focusRingContrast(firstAlbum)).toBeGreaterThanOrEqual(3);
  expect(await titleTextContrast(firstAlbum)).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: 'test-results/native-gallery-focus-dark.png' });

  for (const [width, expectedColumns] of [
    [1024, 4],
    [768, 3],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    const trackWidths = await albumTrackWidths(
      page.locator('.album-grid').first(),
    );
    expect(trackWidths).toHaveLength(expectedColumns);
    expect(Math.min(...trackWidths)).toBeGreaterThanOrEqual(224);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const phoneTrackWidths = await albumTrackWidths(
    page.locator('.album-grid').first(),
  );
  expect(phoneTrackWidths).toHaveLength(1);
  await expect(page.locator('.shared').first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/native-gallery-mobile-dark.png',
    fullPage: false,
  });

  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByLabel('Album name').fill('  fAmIlY cAmP  ');
  await expect(page.locator('.album')).toHaveCount(1);
  await expect(page.locator('.album h3')).toHaveText('Liberty Family Camp ’26');
  await expect(page.getByText('1 of 9 albums')).toBeVisible();
  await expect(page.locator('.visually-hidden[role="status"]')).toHaveText(
    '1 album shown for fAmIlY cAmP',
  );

  await page.getByLabel('Album name').fill('no album with this name');
  await expect(
    page.getByRole('heading', { name: 'No matching albums' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Album name')).toHaveValue('');
  await expect(page.getByLabel('Month')).toHaveValue('');
  await expect(page.locator('.album')).toHaveCount(9);

  await page.getByLabel('Month').selectOption('10');
  await expect(page.locator('.album')).toHaveCount(1);
  await expect(page.locator('.album h3')).toHaveText('Captured by Me');
  await page.getByLabel('Album name').fill('captured');
  await page.getByLabel('Month').selectOption('5');
  await expect(
    page.getByRole('heading', { name: 'No matching albums' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.album')).toHaveCount(9);

  await page.locator('#ip-year-2025 summary').click();
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', false);
  await page.getByLabel('Jump to year').selectOption('2025');
  const yearPosition = await page
    .locator('#ip-year-2025')
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(yearPosition).toBeGreaterThanOrEqual(0);
  expect(yearPosition).toBeLessThan(640);
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', true);
  await expect(page.locator('#ip-year-2025 summary')).toBeFocused();
  await page.locator('#ip-year-2025 summary').click();
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', false);
  await page.locator('#ip-year-2025 summary').click();
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', true);

  await page.setViewportSize({ width: 620, height: 800 });
  await page.getByLabel('Album name').fill('captured');
  await expect(
    page.getByRole('button', { name: 'Clear filters' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.setViewportSize({ width: 320, height: 640 });

  for (const label of ['Album name', 'Month', 'Jump to year']) {
    const box = await page.getByLabel(label).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('single-album browse summaries use singular labels before and after filtering', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const slug = `single-album-summary-${Date.now()}`;
  let pageId: string | undefined;

  try {
    const created = await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'Single album summary check',
        slug,
        albumIds: [albums[0].id],
        clientUi: { showBrowsingControls: true },
      },
    });
    expect(created.ok()).toBe(true);
    const draft = await created.json();
    pageId = draft.id;
    const published = await page.request.post(
      `/page/api/pages/${pageId}/publish`,
      { headers, data: { expectedDraftRevision: draft.draftRevision } },
    );
    expect(published.ok()).toBe(true);

    await page.goto(`/page/${slug}`);
    const summary = page.locator('.browse-summary');
    await expect(summary).toHaveText('1 album');

    await page.getByLabel('Album name').fill(albums[0].albumName);
    await expect(summary).toHaveText('1 of 1 album');

    await page.getByLabel('Album name').fill('no matching album');
    await expect(summary).toHaveText('0 of 1 album');
  } finally {
    await page.goto('/dev-login/alice');
    if (pageId)
      await page.request.delete(`/page/api/pages/${pageId}`, { headers });
  }
});

test('light client galleries retain the same responsive album presentation', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const createdPageIds: string[] = [];
  const albums = await (await page.request.get('/page/api/albums')).json();
  try {
    const created = await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'Light gallery reference',
        slug: 'native-gallery-light-reference',
        theme: 'light',
        albumIds: [albums[0].id, albums[1].id],
        clientUi: { showBrowsingControls: true },
      },
    });
    expect(created.ok()).toBe(true);
    const draft = await created.json();
    createdPageIds.push(draft.id);
    const published = await page.request.post(
      `/page/api/pages/${draft.id}/publish`,
      { headers, data: { expectedDraftRevision: draft.draftRevision } },
    );
    expect(published.ok()).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/page/native-gallery-light-reference');
    await expect(page.locator('.gallery')).toHaveClass(/light/);
    await expect(page.locator('.gallery')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await expect(page.locator('.album')).toHaveCount(2);
    const desktopTrackWidths = await albumTrackWidths(
      page.locator('.album-grid'),
    );
    expect(Math.min(...desktopTrackWidths)).toBeGreaterThanOrEqual(224);
    await page.screenshot({
      path: 'test-results/native-gallery-desktop-light.png',
    });

    const firstAlbum = page.locator('.album').first();
    await firstAlbum.hover();
    await expect(firstAlbum.locator('h3')).toHaveCSS(
      'color',
      'rgb(66, 80, 175)',
    );
    expect(await titleTextContrast(firstAlbum)).toBeGreaterThanOrEqual(4.5);
    await page.mouse.move(0, 0);

    for (let step = 0; step < 4; step++) await page.keyboard.press('Tab');
    await expect(firstAlbum).toBeFocused();
    expect(
      await firstAlbum.evaluate((album) => album.matches(':focus-visible')),
    ).toBe(true);
    await expect(firstAlbum).toHaveCSS('outline-style', 'solid');
    await expect(firstAlbum.locator('h3')).toHaveCSS(
      'color',
      'rgb(66, 80, 175)',
    );
    expect(await focusRingContrast(firstAlbum)).toBeGreaterThanOrEqual(3);
    expect(await titleTextContrast(firstAlbum)).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({
      path: 'test-results/native-gallery-focus-light.png',
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/page/native-gallery-light-reference');
    const phoneAlbum = page.locator('.album').first();
    const phoneTrackWidths = await albumTrackWidths(
      page.locator('.album-grid'),
    );
    expect(phoneTrackWidths).toHaveLength(1);
    expect(await phoneAlbum.evaluate((album) => album.matches(':hover'))).toBe(
      false,
    );
    expect(
      await phoneAlbum.evaluate(
        (album) => getComputedStyle(album).backgroundColor,
      ),
    ).toMatch(/rgba\(0, 0, 0, 0\)/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/native-gallery-mobile-light.png',
    });

    await page.goto('/dev-login/alice');
    const customAccentCreated = await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'Custom accent reference',
        slug: 'native-gallery-custom-accent',
        theme: 'light',
        accent: '#0f766e',
        albumIds: [albums[0].id],
        clientUi: { showBrowsingControls: true },
      },
    });
    expect(customAccentCreated.ok()).toBe(true);
    const customAccentDraft = await customAccentCreated.json();
    createdPageIds.push(customAccentDraft.id);
    const customAccentPublished = await page.request.post(
      `/page/api/pages/${customAccentDraft.id}/publish`,
      {
        headers,
        data: { expectedDraftRevision: customAccentDraft.draftRevision },
      },
    );
    expect(customAccentPublished.ok()).toBe(true);
    await page.goto('/page/native-gallery-custom-accent');
    const customAccentAlbum = page.locator('.album').first();
    await customAccentAlbum.hover();
    await expect(customAccentAlbum.locator('h3')).toHaveCSS(
      'color',
      'rgb(15, 118, 110)',
    );
    expect(await titleTextContrast(customAccentAlbum)).toBeGreaterThanOrEqual(
      4.5,
    );

    await page.goto('/dev-login/alice');
    const systemCreated = await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'System gallery reference',
        slug: 'native-gallery-system-reference',
        theme: 'system',
        albumIds: [albums[0].id],
        clientUi: { showBrowsingControls: true },
      },
    });
    expect(systemCreated.ok()).toBe(true);
    const systemDraft = await systemCreated.json();
    createdPageIds.push(systemDraft.id);
    const systemPublished = await page.request.post(
      `/page/api/pages/${systemDraft.id}/publish`,
      { headers, data: { expectedDraftRevision: systemDraft.draftRevision } },
    );
    expect(systemPublished.ok()).toBe(true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/page/native-gallery-system-reference');
    await expect(page.locator('.gallery')).toHaveClass(/system/);
    for (let step = 0; step < 4; step++) await page.keyboard.press('Tab');
    const systemAlbum = page.locator('.album').first();
    await expect(systemAlbum).toBeFocused();
    for (const [scheme, background] of [
      ['light', 'rgb(255, 255, 255)'],
      ['dark', 'rgb(0, 0, 0)'],
    ] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expect(page.locator('.gallery')).toHaveCSS(
        'background-color',
        background,
      );
      expect(await focusRingContrast(systemAlbum)).toBeGreaterThanOrEqual(3);
      if (scheme === 'light') {
        await expect(systemAlbum.locator('h3')).toHaveCSS(
          'color',
          'rgb(66, 80, 175)',
        );
      }
      expect(await titleTextContrast(systemAlbum)).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({
        path: `test-results/native-gallery-system-${scheme}.png`,
      });
    }
  } finally {
    await page.goto('/dev-login/alice');
    for (const id of createdPageIds.reverse()) {
      await page.request.delete(`/page/api/pages/${id}`, { headers });
    }
  }
});
