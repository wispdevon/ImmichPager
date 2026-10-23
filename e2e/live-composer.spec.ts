import { test, expect } from '@playwright/test';
const origin = 'http://127.0.0.1:3200';
const asset = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const album = '00000000-0000-4000-8000-000000000001';

test('composes mixed rows on one live canvas, autosaves without losing focus, and publishes explicitly', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const create = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'Mixed composition',
      slug: 'mixed-composition',
      blocks: [
        {
          id: 'intro',
          type: 'text',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Welcome' }],
              },
            ],
          },
        },
        { id: 'albums', type: 'albums', albumIds: [album] },
        {
          id: 'photos',
          type: 'photos',
          photos: [{ id: asset(1), caption: 'Earthrise' }, { id: asset(2) }],
        },
      ],
    },
  });
  expect(create.ok()).toBe(true);
  const record = await create.json();
  await page.goto(`/page/manage/${record.id}`);
  await expect(
    page.getByRole('button', { name: 'Preview', exact: true }),
  ).toHaveCount(0);
  const frame = page.frameLocator('[title="Live page canvas"]');
  const text = frame.getByRole('textbox', { name: 'Text block content' });
  await text.fill('A private working composition.');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(text).toBeFocused();
  expect((await page.request.get('/page/mixed-composition')).status()).toBe(
    404,
  );
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Review publication' })
    .getByRole('button', { name: 'Publish page', exact: true })
    .click();
  await expect(
    page.getByText('Page published. Your client link is ready.'),
  ).toBeVisible();
  await page.goto('/page/mixed-composition');
  await expect(page.getByText('A private working composition.')).toBeVisible();
  await expect(page.locator('[data-block-id]')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Liberty Family Camp ’26', exact: true })
    .click();
  const expanded = page.getByRole('region', { name: 'Expanded album' });
  await expect(
    expanded.getByRole('button', { name: /Open photo/ }).first(),
  ).toBeVisible();
  await expanded
    .getByRole('button', { name: /Open photo/ })
    .first()
    .click();
  const viewer = page.getByRole('dialog', { name: 'Photo viewer' });
  await expect(viewer).toBeVisible();
  await expect(
    viewer.getByRole('button', { name: 'Close photo viewer' }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('header')).toContainText('2 /');
  await page.goBack();
  await expect(viewer).toHaveCount(0);
  await expect(
    expanded.getByRole('button', { name: /Open photo/ }).first(),
  ).toBeFocused();
});

test('public media checks exact published membership, passwords, ownership and download policy', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  const create = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'Protected photos',
      slug: 'protected-photos',
      allowDownload: false,
      blocks: [{ id: 'picks', type: 'photos', photos: [{ id: asset(1) }] }],
    },
  });
  const record = await create.json();
  const publish = await page.request.post(
    `/page/api/pages/${record.id}/publish`,
    {
      headers: { origin },
      data: {
        expectedDraftRevision: record.draftRevision,
        passwordMode: 'set',
        password: 'client-pin',
      },
    },
  );
  expect(publish.ok()).toBe(true);
  const client = await browser.newContext();
  const visitor = await client.newPage();
  const media = `/page/media/${record.id}/photos/picks/${asset(1)}`;
  expect(
    (await client.request.get(`${origin}${media}/thumbnail`)).status(),
  ).toBe(401);
  await visitor.goto('/page/protected-photos');
  await visitor.getByRole('textbox', { name: /Password/ }).fill('client-pin');
  await visitor.getByRole('button', { name: 'View albums' }).click();
  await expect(
    visitor.getByRole('button', { name: /Open photo/ }),
  ).toBeVisible();
  expect(
    (await client.request.get(`${origin}${media}/thumbnail`)).status(),
  ).toBe(200);
  expect(
    (
      await client.request.get(
        `${origin}/page/media/${record.id}/photos/picks/${asset(2)}/thumbnail`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (await client.request.get(`${origin}${media}/original`)).status(),
  ).toBe(403);
  const live = await (
    await page.request.get(`/page/api/pages/${record.id}`)
  ).json();
  const saved = await page.request.put(`/page/api/pages/${record.id}`, {
    headers: { origin },
    data: {
      ...live,
      expectedDraftRevision: live.draftRevision,
      blocks: [{ id: 'picks', type: 'photos', photos: [{ id: asset(2) }] }],
    },
  });
  expect(saved.ok()).toBe(true);
  expect(
    (await client.request.get(`${origin}${media}/thumbnail`)).status(),
  ).toBe(200);
  expect(
    (
      await client.request.get(
        `${origin}/page/media/${record.id}/photos/picks/${asset(2)}/thumbnail`,
      )
    ).status(),
  ).toBe(404);
  const changedDraft = await saved.json();
  const updated = await page.request.post(
    `/page/api/pages/${record.id}/publish`,
    {
      headers: { origin },
      data: {
        expectedDraftRevision: changedDraft.draftRevision,
        passwordMode: 'keep',
        password: 'client-pin',
      },
    },
  );
  expect(updated.ok()).toBe(true);
  expect(
    (await client.request.get(`${origin}${media}/thumbnail`)).status(),
  ).toBe(401);
  await visitor.reload();
  await visitor.getByRole('textbox', { name: /Password/ }).fill('client-pin');
  await visitor.getByRole('button', { name: 'View albums' }).click();
  await expect(
    visitor.getByRole('button', { name: /Open photo/ }),
  ).toBeVisible();
  expect(
    (await client.request.get(`${origin}${media}/thumbnail`)).status(),
  ).toBe(404);
  expect(
    (
      await client.request.get(
        `${origin}/page/media/${record.id}/photos/picks/${asset(2)}/thumbnail`,
      )
    ).status(),
  ).toBe(200);
  await page.goto('/dev-login/bob');
  expect(
    (
      await page.request.get(
        `/page/content/${record.id}/photos/picks?preview=1`,
      )
    ).status(),
  ).toBe(404);
  await client.close();
});

test('downloads an exact photo-block ZIP and invalidates access after unpublishing', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'ZIP delivery',
      slug: 'zip-delivery',
      blocks: [
        {
          id: 'delivery',
          type: 'photos',
          photos: [{ id: asset(1) }, { id: asset(2) }],
        },
      ],
    },
  });
  const draft = await response.json();
  const result = await page.request.post(
    `/page/api/pages/${draft.id}/publish`,
    {
      headers: { origin },
      data: { expectedDraftRevision: draft.draftRevision },
    },
  );
  expect(result.ok()).toBe(true);
  const live = await result.json();
  const path = `/page/download/${draft.id}/photos/delivery`;
  const prepared = await page.request.post(path, {
    headers: { origin },
    data: { revision: live.revision },
  });
  expect(prepared.ok()).toBe(true);
  expect((await prepared.json()).parts).toEqual([
    { index: 0, count: 2, size: 2048 },
  ]);
  const zip = await page.request.post(path, {
    headers: { origin },
    data: { revision: live.revision, part: 0 },
  });
  expect(zip.headers()['content-type']).toBe('application/zip');
  const bytes = await zip.body();
  expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
  expect(bytes.toString('utf8')).toContain('Studio logo.webp');
  expect(bytes.toString('utf8')).toContain('Photography 1.webp');
  expect(bytes.toString('utf8')).not.toContain('Photography 2.webp');
  expect(
    (
      await page.request.post(path, {
        headers: { origin },
        data: { revision: live.revision, part: 0, assetIds: [asset(3)] },
      })
    ).status(),
  ).toBe(400);
  await page.request.post(`/page/api/pages/${draft.id}/unpublish`, {
    headers: { origin },
    data: {},
  });
  expect(
    (
      await page.request.get(`/page/content/${draft.id}/photos/delivery`)
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.get(
        `/page/media/${draft.id}/photos/delivery/${asset(1)}/thumbnail`,
      )
    ).status(),
  ).toBe(404);
});

test('adds repeatable rows, switches layouts, formats text and keeps the same canvas on phones', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'Stories in pictures',
      slug: 'stories-in-pictures',
      blocks: [],
    },
  });
  const draft = await response.json();
  await page.goto(`/page/manage/${draft.id}`);
  const inspector = page.getByRole('region', { name: 'Page content' });
  const frameElement = page.locator('[title="Live page canvas"]');
  const frame = page.frameLocator('[title="Live page canvas"]');
  await inspector.getByRole('button', { name: 'Albums', exact: true }).click();
  await inspector
    .getByRole('button', { name: 'Add albums', exact: true })
    .click();
  await page
    .getByRole('checkbox', {
      name: 'Include Liberty Family Camp ’26',
      exact: true,
    })
    .check();
  await page
    .getByRole('dialog', { name: 'Add albums' })
    .getByRole('button', { name: 'Done', exact: true })
    .click();
  for (const style of ['tiles', 'editorial', 'cards']) {
    await inspector
      .getByRole('radiogroup', { name: 'Album style' })
      .getByRole('radio', {
        name: style[0].toUpperCase() + style.slice(1),
        exact: true,
      })
      .check();
    await expect(frame.locator('.ip-albums')).toHaveClass(
      new RegExp(style === 'cards' ? 'ip-albums' : style),
    );
  }
  await inspector.getByRole('button', { name: 'Photos', exact: true }).click();
  await inspector
    .getByRole('button', { name: 'Add photos', exact: true })
    .click();
  const picker = page.getByRole('dialog', { name: 'Add photos', exact: true });
  await picker
    .getByRole('button', { name: 'Select Studio logo.webp', exact: true })
    .click();
  await picker
    .getByRole('button', { name: 'Select Photography 1.webp', exact: true })
    .click();
  await picker
    .getByRole('button', { name: 'Add 2 photos', exact: true })
    .click();
  await expect(frame.getByRole('button', { name: /Open photo/ })).toHaveCount(
    2,
  );
  for (const layout of [
    'square',
    'large',
    'carousel',
    'justified',
    'masonry',
  ]) {
    await inspector
      .getByRole('radiogroup', { name: 'Photo layout' })
      .getByRole('radio', {
        name: layout[0].toUpperCase() + layout.slice(1),
        exact: true,
      })
      .check();
    await expect(frame.locator('.photo-grid')).toHaveClass(new RegExp(layout));
    if (layout === 'justified')
      await expect
        .poll(() =>
          frame
            .locator('.photo-grid img')
            .first()
            .evaluate((image) => {
              const bounds = image.getBoundingClientRect();
              return bounds.width / bounds.height;
            }),
        )
        .toBeCloseTo(1.5, 2);
  }
  await inspector.getByLabel('Row heading', { exact: true }).fill('Highlights');
  await inspector
    .getByRole('button', { name: 'Duplicate row', exact: true })
    .click();
  await expect(inspector.locator('article')).toHaveCount(3);
  await inspector
    .getByRole('button', { name: 'Move row 3 up', exact: true })
    .click();
  await inspector
    .getByRole('button', { name: 'Delete row', exact: true })
    .click();
  await expect(inspector.locator('article')).toHaveCount(2);
  await inspector.getByRole('button', { name: 'Text', exact: true }).click();
  const text = frame.getByRole('textbox', { name: 'Text block content' });
  await text.fill('A few moments to remember.');
  await text.press('ControlOrMeta+A');
  await frame.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect(text.locator('strong')).toHaveText('A few moments to remember.');
  await inspector
    .getByRole('button', { name: 'Reorder text row 3', exact: true })
    .press('ArrowUp');
  await inspector.getByRole('button', { name: 'Albums', exact: true }).click();
  await inspector
    .getByRole('button', { name: 'Add albums', exact: true })
    .click();
  await page
    .getByRole('checkbox', {
      name: 'Include Liberty Family Camp ’26',
      exact: true,
    })
    .check();
  await page
    .getByRole('dialog', { name: 'Add albums' })
    .getByRole('button', { name: 'Done', exact: true })
    .click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  const saved = await (
    await page.request.get(`/page/api/pages/${draft.id}`)
  ).json();
  expect(saved.blocks.map((block: { type: string }) => block.type)).toEqual([
    'albums',
    'text',
    'photos',
    'albums',
  ]);
  expect(saved.albumIds).toEqual([album]);
  const frameHandle = await frameElement.elementHandle();
  await page.getByRole('button', { name: 'Phone canvas', exact: true }).click();
  expect(
    await frameElement.evaluate(
      (element, previous) => element === previous,
      frameHandle,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mobile-settings')).toBeVisible();
  await page.locator('.mobile-settings').click();
  const sheet = page.getByRole('dialog', {
    name: 'Page inspector',
    exact: true,
  });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.mobile-settings')).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/live-composer-phone.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('button', { name: 'Desktop canvas', exact: true })
    .click();
  await page.screenshot({
    path: 'test-results/live-composer-desktop.png',
    fullPage: true,
  });
  await page
    .locator('.composer-toolbar')
    .getByRole('button', { name: 'Publish page', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Review publication' })
    .getByRole('button', { name: 'Publish page', exact: true })
    .click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'Page published',
  );
  await page.goto('/page/stories-in-pictures');
  await expect(page.locator('.ip-text strong')).toHaveText(
    'A few moments to remember.',
  );
  await expect(page.locator('[data-pager-editor-ui]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open photo 1', exact: true }).click();
  const viewer = page.getByRole('dialog', {
    name: 'Photo viewer',
    exact: true,
  });
  await expect(viewer.locator('img')).toHaveClass(/loaded/);
  await viewer.getByRole('button', { name: 'Play slideshow' }).click();
  await expect(viewer.locator('header')).toContainText('2 / 2', {
    timeout: 7000,
  });
  await viewer.getByRole('button', { name: 'Pause slideshow' }).click();
  await page.screenshot({
    path: 'test-results/live-composer-viewer.png',
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('resizes and crops header branding directly on the canvas with keyboard alternatives', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'Header composition',
      slug: 'header-composition',
      blocks: [],
      bannerHeight: 300,
    },
  });
  let draft = await response.json();
  const { readFile } = await import('node:fs/promises');
  for (const kind of ['logo', 'banner']) {
    const upload = await page.request.post(
      `/page/api/pages/${draft.id}/branding/${kind}`,
      {
        headers: { origin },
        multipart: {
          expectedDraftRevision: String(draft.draftRevision),
          image: {
            name: 'earthrise.webp',
            mimeType: 'image/webp',
            buffer: await readFile('fixtures/photos/earthrise.webp'),
          },
        },
      },
    );
    expect(upload.ok()).toBe(true);
    draft = await upload.json();
  }
  await page.goto(`/page/manage/${draft.id}`);
  const frame = page.frameLocator('[title="Live page canvas"]');
  const height = frame.getByRole('button', {
    name: 'Drag banner height',
    exact: true,
  });
  await expect(frame.locator('.ip-banner')).toHaveCSS('height', '300px');
  await height.press('ArrowDown');
  await frame
    .getByRole('button', { name: 'Drag banner crop', exact: true })
    .press('ArrowUp');
  await frame
    .getByRole('button', { name: 'Drag logo size', exact: true })
    .press('ArrowDown');
  await expect(frame.locator('.ip-banner')).toHaveCSS('height', '310px');
  const box = await height.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2,
    box!.y + box!.height / 2 + 40,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(frame.locator('.ip-banner')).toHaveCSS('height', '350px');
  await expect
    .poll(async () => {
      const saved = await (
        await page.request.get(`/page/api/pages/${draft.id}`)
      ).json();
      return [saved.bannerHeight, saved.bannerPosition, saved.logoSize];
    })
    .toEqual([350, 49, 81]);
  await page.reload();
  await expect(frame.locator('.ip-banner')).toHaveCSS('height', '350px');
  await expect(frame.locator('.ip-banner img')).toHaveCSS(
    'object-position',
    '50% 49%',
  );
  await expect(frame.locator('.ip-logo')).toHaveCSS('width', '81px');
});
