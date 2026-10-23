import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { DraftEditorPage } from '../src/lib/contracts';

const headers = { origin: 'http://127.0.0.1:3200' };

async function create(page: Page, suffix: string) {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const response = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Visibility collection',
      description: 'Preserved description',
      slug: `visibility-${suffix}`,
      albumIds: albums
        .filter((album: { ownerId: string }) => album.ownerId === 'alice')
        .map((album: { id: string }) => album.id),
    },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as DraftEditorPage;
}

async function save(page: Page, draft: DraftEditorPage, values: object) {
  const response = await page.request.put(`/page/api/pages/${draft.id}`, {
    headers,
    data: { ...draft, ...values, expectedDraftRevision: draft.draftRevision },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as DraftEditorPage;
}

test('each client element can be hidden without losing content or album names', async ({
  page,
}) => {
  let draft = await create(page, 'elements');
  try {
    for (const kind of ['logo', 'banner']) {
      const response = await page.request.post(
        `/page/api/pages/${draft.id}/branding/${kind}`,
        {
          headers,
          multipart: {
            expectedDraftRevision: String(draft.draftRevision),
            image: {
              name: 'earthrise.webp',
              mimeType: 'image/webp',
              buffer: readFileSync('fixtures/photos/earthrise.webp'),
            },
          },
        },
      );
      expect(response.ok()).toBe(true);
      draft = await response.json();
    }
    draft = await save(page, draft, {
      clientUi: { ...draft.clientUi, showBrowsingControls: true },
    });
    const original = { ...draft.clientUi };
    const switches = [
      ['showBanner', '.ip-banner'],
      ['showLogo', '.ip-logo'],
      ['showTitle', '.ip-title'],
      ['showDescription', '.ip-description'],
      ['showBrowsingControls', '.browse-controls'],
      ['showAlbumSearch', '.search-control'],
      [
        'showMonthFilter',
        '.browse-controls input[type="month"], .browse-controls select[aria-label="Month"]',
      ],
      [
        'showYearNavigation',
        '.browse-controls select[aria-label="Jump to year"]',
      ],
      ['showResultsCount', '.browse-summary'],
      ['showAlbums', '.ip-album'],
      ['showAlbumCovers', '.ip-cover'],
      ['showAlbumTitles', '.ip-album h3'],
      ['showAlbumDates', '.ip-album-info > p:not(.album-metadata)'],
      ['showAlbumItemCounts', '.item-count'],
      ['showSharedLabels', '.shared'],
      ['showYearHeadings', '.ip-year-heading'],
      ['showYearCounts', '.group-count'],
    ] as const;
    for (const [key, selector] of switches) {
      draft = await save(page, draft, {
        clientUi: { ...original, [key]: false },
      });
      await page.goto(`/page/manage/${draft.id}/preview`);
      if (key === 'showMonthFilter')
        await expect(page.getByLabel('Month', { exact: true })).toHaveCount(0);
      else if (key === 'showYearNavigation')
        await expect(page.getByLabel('Jump to year')).toHaveCount(0);
      else await expect(page.locator(selector)).toHaveCount(0);
      expect(draft.title).toBe('Visibility collection');
      expect(draft.description).toBe('Preserved description');
      expect(draft.logo).toBe(true);
      expect(draft.banner).toBe(true);
    }
    draft = await save(page, draft, {
      clientUi: { ...original, showBranding: false, showAlbumTitles: false },
    });
    const published = await page.request.post(
      `/page/api/pages/${draft.id}/publish`,
      {
        headers,
        data: { expectedDraftRevision: draft.draftRevision },
      },
    );
    expect(published.ok()).toBe(true);
    await page.goto(`/page/${draft.slug}`);
    await expect(
      page.getByRole('link', { name: 'ImmichPager', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Source & license' }),
    ).toBeVisible();
    const firstAlbum = page.locator('.ip-album').first();
    await expect(firstAlbum).toHaveAccessibleName(/.+/);
    await firstAlbum.focus();
    await expect(firstAlbum).toBeFocused();
    await expect(firstAlbum.locator('h3')).toHaveCount(0);
    draft = await save(page, draft, {
      clientUi: {
        ...original,
        showBanner: false,
        showLogo: false,
        showTitle: false,
        showDescription: false,
      },
    });
    await page.goto(`/page/manage/${draft.id}/preview`);
    await expect(page.locator('.ip-hero')).toHaveCount(0);
  } finally {
    await page.request.delete(`/page/api/pages/${draft.id}`, { headers });
  }
});

test('hidden headings retain year navigation and noncollapsible albums stay expanded', async ({
  page,
}) => {
  let draft = await create(page, 'years');
  try {
    draft = await save(page, draft, {
      clientUi: {
        ...draft.clientUi,
        showBrowsingControls: true,
        showYearHeadings: false,
      },
    });
    await page.goto(`/page/manage/${draft.id}/preview`);
    const names = await page.locator('.ip-album h3').allTextContents();
    await expect(page.locator('.ip-year-heading')).toHaveCount(0);
    const year = page.getByLabel('Jump to year');
    const value = await year.locator('option').last().getAttribute('value');
    await year.selectOption(value!);
    const group = page.locator(`#ip-year-${value}`);
    await expect(group).toBeInViewport();
    expect(await page.locator('.ip-album h3').allTextContents()).toEqual(names);
    draft = await save(page, draft, {
      clientUi: {
        ...draft.clientUi,
        showYearHeadings: true,
        allowYearCollapse: false,
      },
    });
    await page.reload();
    await expect(page.locator('.ip-year-heading').first()).toBeVisible();
    await expect(page.locator('summary')).toHaveCount(0);
    for (const album of await page.locator('.ip-album').all())
      await expect(album).toBeVisible();
  } finally {
    await page.request.delete(`/page/api/pages/${draft.id}`, { headers });
  }
});

test('new pages omit browsing from keyboard order and reject invisible album cards', async ({
  page,
}) => {
  const draft = await create(page, 'defaults');
  try {
    expect(draft.clientUi.showBrowsingControls).toBe(false);
    const response = await page.request.put(`/page/api/pages/${draft.id}`, {
      headers,
      data: {
        ...draft,
        expectedDraftRevision: draft.draftRevision,
        clientUi: {
          ...draft.clientUi,
          showAlbumCovers: false,
          showAlbumTitles: false,
        },
      },
    });
    expect(response.status()).toBe(400);
    const published = await page.request.post(
      `/page/api/pages/${draft.id}/publish`,
      {
        headers,
        data: { expectedDraftRevision: draft.draftRevision },
      },
    );
    expect(published.ok()).toBe(true);
    await page.goto(`/page/${draft.slug}`);
    await expect(page.locator('.browse-controls')).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(page.locator('.ip-year-heading').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('.ip-album').first()).toBeFocused();
  } finally {
    await page.request.delete(`/page/api/pages/${draft.id}`, { headers });
  }
});

test('visual settings render in the gallery and authored variables override their defaults', async ({
  page,
}) => {
  let draft = await create(page, 'visuals');
  try {
    draft = await save(page, draft, {
      galleryStyle: {
        ...draft.galleryStyle,
        fontFamily: 'system',
        cardTitleSize: 1.5,
        cardRadius: 24,
        gridRowGap: 32,
        gridColumnGap: 12,
        coverAspectRatio: 1.5,
        hoverTreatment: 'lift',
      },
      customCss:
        ':scope { --pager-card-radius: 4px; --pager-card-title-size: 1.25rem; --pager-background: #112233; }',
    });
    await page.goto(`/page/manage/${draft.id}/preview`);
    await expect(page.locator('.ip-gallery')).toHaveCSS(
      'background-color',
      'rgb(17, 34, 51)',
    );
    await expect(page.locator('.ip-gallery')).toHaveCSS(
      'font-family',
      'system-ui, sans-serif',
    );
    await expect(page.locator('.ip-cover').first()).toHaveCSS(
      'border-radius',
      '4px',
    );
    await expect(page.locator('.ip-album h3').first()).toHaveCSS(
      'font-size',
      '20px',
    );
    await expect(page.locator('.ip-album-grid').first()).toHaveCSS(
      'row-gap',
      '32px',
    );
    await expect(page.locator('.ip-album-grid').first()).toHaveCSS(
      'column-gap',
      '12px',
    );
    const box = await page.locator('.ip-cover').first().boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(1.5, 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.ip-album').first().hover();
    await expect(page.locator('.ip-album').first()).toHaveCSS(
      'transform',
      'none',
    );
    await page.goto(`/page/manage/${draft.id}`);
    await expect(page.locator('.composer-toolbar')).not.toHaveCSS(
      'background-color',
      'rgb(17, 34, 51)',
    );
    await expect(
      page.getByRole('button', { name: 'Page settings', exact: true }),
    ).toBeVisible();
  } finally {
    await page.request.delete(`/page/api/pages/${draft.id}`, { headers });
  }
});

test('visibility and styling stay private until the reviewed draft is published', async ({
  page,
  browser,
}) => {
  let draft = await create(page, 'publication');
  const clientContext = await browser.newContext();
  try {
    const published = await page.request.post(
      `/page/api/pages/${draft.id}/publish`,
      {
        headers,
        data: { expectedDraftRevision: draft.draftRevision },
      },
    );
    expect(published.ok()).toBe(true);
    draft = await published.json();
    const client = await clientContext.newPage();
    await client.goto(`/page/${draft.slug}`);
    await expect(client.locator('.ip-title')).toBeVisible();
    await expect(client.locator('.ip-cover').first()).toHaveCSS(
      'border-radius',
      '16px',
    );
    draft = await save(page, draft, {
      clientUi: { ...draft.clientUi, showTitle: false },
      galleryStyle: { ...draft.galleryStyle, cardRadius: 2 },
    });
    await page.goto(`/page/manage/${draft.id}/preview`);
    await expect(page.locator('.ip-title')).toHaveCount(0);
    await expect(page.locator('.ip-cover').first()).toHaveCSS(
      'border-radius',
      '2px',
    );
    await client.reload();
    await expect(client.locator('.ip-title')).toBeVisible();
    await expect(client.locator('.ip-cover').first()).toHaveCSS(
      'border-radius',
      '16px',
    );
    const reviewResponse = await page.request.get(
      `/page/api/pages/${draft.id}/publication-review?expectedDraftRevision=${draft.draftRevision}`,
    );
    expect(reviewResponse.ok()).toBe(true);
    const review = await reviewResponse.json();
    expect(review.appearanceChanges).toEqual(
      expect.arrayContaining(['visibility', 'galleryStyle']),
    );
    const update = await page.request.post(
      `/page/api/pages/${draft.id}/publish`,
      {
        headers,
        data: {
          expectedDraftRevision: review.draftRevision,
          expectedPublishedRevision: review.expectedPublishedRevision,
        },
      },
    );
    expect(update.ok()).toBe(true);
    await client.reload();
    await expect(client.locator('.ip-title')).toHaveCount(0);
    await expect(client.locator('.ip-cover').first()).toHaveCSS(
      'border-radius',
      '2px',
    );
  } finally {
    await clientContext.close();
    await page.request.delete(`/page/api/pages/${draft.id}`, { headers });
  }
});
