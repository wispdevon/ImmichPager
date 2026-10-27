import { expect, test } from '@playwright/test';
import { openCustomize, openDesignGroup } from './customize-helper';

test('theme auditions do not save, apply stays private, and undo preserves content', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await (
    await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'Theme client',
        slug: 'theme-client',
        albumIds: [albums[0].id],
        customCss: '.ip-title { text-decoration: underline; }',
      },
    })
  ).json();
  await page.goto(`/page/manage/${created.id}`);
  await openCustomize(page, 'Themes');
  const canvas = page.frameLocator('iframe[title="Live page canvas"]');
  const before = await (
    await page.request.get(`/page/api/pages/${created.id}`)
  ).json();
  await page
    .getByRole('button', { name: 'Try Studio theme', exact: true })
    .click();
  await expect(canvas.locator('.family-studio')).toBeVisible();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/page/api/pages/${created.id}`)).json())
          .draftRevision,
    )
    .toBe(before.draftRevision);
  await page
    .getByRole('button', { name: 'Cancel preview', exact: true })
    .click();
  await expect(canvas.locator('.family-studio')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Try Studio theme', exact: true })
    .click();
  await page.getByRole('button', { name: 'Apply theme', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/page/api/pages/${created.id}`)).json())
          .pageTheme?.definition.layout,
    )
    .toBe('studio');
  const applied = await (
    await page.request.get(`/page/api/pages/${created.id}`)
  ).json();
  expect(applied.title).toBe('Theme client');
  expect(applied.albumIds).toEqual(before.albumIds);
  expect(applied.customCss).toBe(before.customCss);
  expect(applied.publishedRevision).toBeNull();
  await page
    .getByRole('button', { name: 'Content inspector', exact: true })
    .click();
  await canvas
    .getByRole('button', { name: 'Edit title, Theme client', exact: true })
    .click();
  await canvas
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Updated client words');
  await canvas
    .getByRole('textbox', { name: 'Title', exact: true })
    .press('Escape');
  await openCustomize(page, 'Themes');
  await page.getByRole('button', { name: 'Undo theme', exact: true }).click();
  await expect(canvas.locator('.ip-title')).toContainText(
    'Updated client words',
  );
  await expect(canvas.locator('.family-studio')).toHaveCount(0);
  await page.getByLabel('Theme name', { exact: true }).fill('Saved studio');
  await page
    .getByRole('button', { name: 'Save current design as theme', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /Saved studio.*classic/ }),
  ).toBeVisible();
});

test('theme library rejects cross-owner access and stale updates through HTTP', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  // Obtain a valid portable definition from a saved page after applying a built-in.
  const record = await (
    await page.request.post('/page/api/pages', {
      headers,
      data: { title: 'Library fixture', slug: 'theme-library-fixture' },
    })
  ).json();
  await page.goto(`/page/manage/${record.id}`);
  await openCustomize(page, 'Themes');
  await page
    .getByRole('button', { name: 'Try Studio theme', exact: true })
    .click();
  await page.getByRole('button', { name: 'Apply theme', exact: true }).click();
  await page
    .getByLabel('Theme name', { exact: true })
    .fill('Private library theme');
  await page
    .getByRole('button', { name: 'Save current design as theme', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /Private library theme.*studio/ }),
  ).toBeVisible();
  const list = await (await page.request.get('/page/api/themes')).json();
  const saved = list.items.find(
    (t: { name: string }) => t.name === 'Private library theme',
  );
  const full = await (
    await page.request.get(`/page/api/themes/${saved.id}`)
  ).json();
  expect(
    (
      await page.request.patch(`/page/api/themes/${saved.id}`, {
        headers,
        data: { definition: full.definition, expectedRevision: 0 },
      })
    ).status(),
  ).toBe(409);
  await page.goto('/dev-login/bob');
  expect(
    (await page.request.get(`/page/api/themes/${saved.id}`)).status(),
  ).toBe(404);
  expect(
    (
      await page.request.delete(`/page/api/themes/${saved.id}`, {
        headers,
        data: { expectedRevision: full.revision },
      })
    ).status(),
  ).toBe(404);
});

import { applyTheme, builtInThemes } from '../src/lib/themes';
import { parsePageInput } from '../src/lib/contracts';

for (const definition of builtInThemes) {
  test(`${definition.name} composes responsive public pages in both modes`, async ({
    page,
  }) => {
    await page.goto('/dev-login/alice');
    const headers = { origin: 'http://127.0.0.1:3200' };
    const photos = (await (await page.request.get('/page/api/photos')).json())
      .items;
    const albums = await (await page.request.get('/page/api/albums')).json();
    const input = applyTheme(
      parsePageInput({
        title: 'A world beyond the everyday',
        slug: `responsive-theme-${definition.layout}`,
        description: 'Collected moments from journeys near and far.',
        blocks: [
          {
            id: 'frames',
            type: 'photos',
            heading: 'Selected photographs',
            photos: photos
              .slice(0, 6)
              .map((p: { id: string }) => ({ id: p.id })),
          },
          {
            id: 'stories',
            type: 'albums',
            heading: 'Complete stories',
            albumIds: albums.slice(0, 2).map((a: { id: string }) => a.id),
            grouping: 'none',
          },
          {
            id: 'empty',
            type: 'photos',
            heading: 'Unused section',
            photos: [],
          },
        ],
      }),
      { ...definition, name: 'Private library metadata' },
    );
    let record = await (
      await page.request.post('/page/api/pages', { headers, data: input })
    ).json();
    record = await (
      await page.request.post(`/page/api/pages/${record.id}/branding/banner`, {
        headers,
        data: {
          assetId: photos[1].id,
          expectedDraftRevision: record.draftRevision,
        },
      })
    ).json();
    for (const mode of ['light', 'dark']) {
      record = await (
        await page.request.put(`/page/api/pages/${record.id}`, {
          headers,
          data: {
            ...record,
            theme: mode,
            expectedDraftRevision: record.draftRevision,
          },
        })
      ).json();
      const published = await page.request.post(
        `/page/api/pages/${record.id}/publish`,
        {
          headers,
          data: {
            expectedDraftRevision: record.draftRevision,
            expectedPublishedRevision: record.publishedRevision,
          },
        },
      );
      expect(published.ok(), await published.text()).toBe(true);
      record = await published.json();
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`/page/${input.slug}`);
        await expect(page.locator('.ip-photo')).toHaveCount(6);
        await expect(
          page.getByRole('link', { name: 'Unused section', exact: true }),
        ).toHaveCount(0);
        await expect(page.locator('[data-pager-editor-ui]')).toHaveCount(0);
        expect(await page.content()).not.toContain('Private library metadata');
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        const hero = page.locator('.ip-hero'),
          header = page.locator('.ip-header'),
          banner = page.locator('.ip-banner');
        if (definition.layout === 'studio') {
          const h = (await header.boundingBox())!,
            b = (await banner.boundingBox())!;
          if (width > 760) expect(b.x).toBeGreaterThan(h.x + h.width - 1);
          else expect(b.y).toBeGreaterThanOrEqual(h.y + h.height - 1);
        }
        if (definition.layout === 'editorial')
          expect((await banner.boundingBox())!.y).toBeGreaterThan(
            (await header.boundingBox())!.y,
          );
        if (definition.layout === 'cinematic')
          await expect(header).toHaveCSS('color', 'rgb(255, 255, 255)');
        if (definition.layout === 'archive') {
          await expect(hero).toHaveCSS(
            'position',
            width > 760 ? 'sticky' : 'relative',
          );
          if (width > 760) {
            await page.evaluate(() => scrollTo(0, 400));
            await expect
              .poll(async () => (await hero.boundingBox())!.y)
              .toBe(24);
            await page.evaluate(() => scrollTo(0, 0));
          }
        }
        await page.locator('.ip-photo').first().click();
        await expect(
          page.getByRole('dialog', { name: 'Photo viewer' }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Close photo viewer' }).click();
      }
    }
  });
}

test('external theme review applies to the canvas and per-row settings can override it', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const photos = (await (await page.request.get('/page/api/photos')).json())
    .items;
  const record = await (
    await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'Import theme',
        slug: 'import-theme-css',
        blocks: [
          { id: 'frames', type: 'photos', photos: [{ id: photos[1].id }] },
        ],
      },
    })
  ).json();
  await page.goto(`/page/manage/${record.id}`);
  await openCustomize(page, 'Themes');
  await page.getByText('Import a ready-made theme', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Theme format', exact: true })
    .selectOption('shadcn');
  await page
    .getByRole('textbox', { name: 'Theme source', exact: true })
    .fill(
      ':root {--background:#fefcf0;--foreground:#112233;--primary:#335544;--radius:0.5rem;} .dark {--background:#112233;--foreground:#fefcf0;--primary:#aabbcc;}',
    );
  await page
    .getByRole('button', { name: 'Review import', exact: true })
    .click();
  await expect(page.locator('.import-review')).toContainText('light / dark');
  await page
    .getByRole('button', { name: 'Try imported theme', exact: true })
    .click();
  const canvas = page.frameLocator('iframe[title="Live page canvas"]');
  await expect(canvas.locator('.family-studio')).toBeVisible();
  await page.getByRole('button', { name: 'Apply theme', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page
    .getByRole('button', { name: 'Content inspector', exact: true })
    .click();
  if (
    (await page
      .locator('.select-row')
      .first()
      .getAttribute('aria-expanded')) !== 'true'
  )
    await page.locator('.select-row').first().click();
  await expect(
    page.getByRole('checkbox', { name: 'Use theme layout' }),
  ).toBeChecked();
  await expect(
    page.getByRole('radio', { name: 'Masonry', exact: true }),
  ).toBeChecked();
  await page.getByRole('slider', { name: /^Spacing/ }).fill('32');
  await expect(
    page.getByRole('checkbox', { name: 'Use theme layout' }),
  ).not.toBeChecked();
  await expect(canvas.locator('.photo-grid')).toHaveCSS('gap', '32px');
  await page.getByRole('checkbox', { name: 'Use theme layout' }).check();
  await expect(canvas.locator('.photo-grid')).toHaveCSS('gap', '20px');
  await openCustomize(page, 'Design');
  await openDesignGroup(page, 'colors');
  await page.getByLabel('Accent color', { exact: true }).fill('#ff0000');
  await expect(canvas.locator('.ip-gallery')).toHaveCSS(
    '--pager-accent',
    '#ff0000',
  );
  await page
    .getByRole('button', { name: 'Reset Accent color to default', exact: true })
    .click();
  await expect(canvas.locator('.ip-gallery')).toHaveCSS(
    '--pager-accent',
    '#aabbcc',
  );
  await page
    .getByRole('button', { name: 'Reset all customization', exact: true })
    .click();
  await expect(canvas.locator('.family-studio')).toHaveCount(0);
  await expect(canvas.locator('.ip-photo')).toHaveCount(1);
  await expect(canvas.locator('.ip-title')).toContainText('Import theme');
});

test('System follows the device in editor and public views without saving a theme change; authored CSS wins', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const definition = structuredClone(builtInThemes[0]);
  definition.css = '.ip-title {font-family: serif;}';
  const input = applyTheme(
    parsePageInput({
      title: 'Independent client colors',
      slug: 'system-theme-colors',
      theme: 'system',
      customCss:
        '.ip-title {font-family: monospace;} :scope {--pager-accent:#123456;} body, .theme-test-outside {outline:20px solid red;}',
      blocks: [
        {
          id: 'words',
          type: 'text',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'A complete page' }],
              },
            ],
          },
        },
      ],
    }),
    definition,
  );
  let record = await (
    await page.request.post('/page/api/pages', { headers, data: input })
  ).json();
  await page.goto(`/page/manage/${record.id}`);
  const canvas = page.frameLocator('iframe[title="Live page canvas"]');
  await expect(canvas.locator('.ip-gallery')).toHaveCSS(
    'background-color',
    'rgb(250, 249, 246)',
  );
  await expect(canvas.locator('.ip-title')).toHaveCSS(
    'font-family',
    'monospace',
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(canvas.locator('.ip-gallery')).toHaveCSS(
    'background-color',
    'rgb(21, 25, 23)',
  );
  expect(
    (await (await page.request.get(`/page/api/pages/${record.id}`)).json())
      .draftRevision,
  ).toBe(record.draftRevision);
  record = await (
    await page.request.post(`/page/api/pages/${record.id}/publish`, {
      headers,
      data: { expectedDraftRevision: record.draftRevision },
    })
  ).json();
  await page.goto('/page/system-theme-colors');
  await page.evaluate(() => {
    const outside = document.createElement('p');
    outside.className = 'theme-test-outside';
    outside.textContent = 'Outside the gallery';
    document.body.append(outside);
    const editorControl = document.createElement('button');
    editorControl.className = 'theme-test-outside';
    editorControl.dataset.pagerEditorUi = '';
    document.querySelector('.ip-gallery')!.append(editorControl);
  });
  await expect(page.locator('body')).toHaveCSS('outline-style', 'none');
  for (const node of await page.locator('.theme-test-outside').all())
    await expect(node).toHaveCSS('outline-style', 'none');
  await expect(page.locator('.ip-gallery')).toHaveCSS(
    'background-color',
    'rgb(21, 25, 23)',
  );
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('.ip-gallery')).toHaveCSS(
    'background-color',
    'rgb(250, 249, 246)',
  );
  await expect(page.locator('.ip-title')).toHaveCSS('font-family', 'monospace');
  expect(
    (await (await page.request.get(`/page/api/pages/${record.id}`)).json())
      .publishedRevision,
  ).toBe(record.publishedRevision);
});

test('a delayed autosave acknowledgment cannot save or replace a theme audition', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const record = await (
    await page.request.post('/page/api/pages', {
      headers,
      data: { title: 'Before preview', slug: 'theme-ack-race' },
    })
  ).json();
  await page.goto(`/page/manage/${record.id}`);
  let release!: () => void, saved!: () => void;
  const gate = new Promise<void>((r) => (release = r)),
    received = new Promise<void>((r) => (saved = r));
  let blocked = false;
  await page.route(`**/page/api/pages/${record.id}`, async (route) => {
    if (route.request().method() !== 'PUT' || blocked) return route.continue();
    blocked = true;
    const response = await route.fetch();
    saved();
    await gate;
    await route.fulfill({ response });
  });
  const canvas = page.frameLocator('iframe[title="Live page canvas"]');
  try {
    await canvas
      .getByRole('button', { name: 'Edit title, Before preview', exact: true })
      .click();
    await canvas
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill('Words saved during preview');
    await canvas
      .getByRole('textbox', { name: 'Title', exact: true })
      .press('Escape');
    await received;
    await openCustomize(page, 'Themes');
    await page
      .getByRole('button', { name: 'Try Archive theme', exact: true })
      .click();
    await expect(canvas.locator('.family-archive')).toBeVisible();
    release();
    await expect(page.getByTestId('save-state')).toHaveText(
      'All changes saved',
    );
    await expect(canvas.locator('.family-archive')).toBeVisible();
    const stored = await (
      await page.request.get(`/page/api/pages/${record.id}`)
    ).json();
    expect(stored.pageTheme).toBeNull();
    expect(stored.title).toBe('Words saved during preview');
    await page
      .getByRole('button', { name: 'Cancel preview', exact: true })
      .click();
    await expect(canvas.locator('.family-archive')).toHaveCount(0);
    await expect(canvas.locator('.ip-title')).toContainText(
      'Words saved during preview',
    );
  } finally {
    release();
  }
});

for (const mode of ['light', 'dark'] as const) {
  test(`theme library controls retain native ${mode} management surfaces`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('immich-ui-theme', JSON.stringify(value)),
      mode,
    );
    await page.emulateMedia({ colorScheme: mode });
    await page.goto('/dev-login/alice');
    const record = await (
      await page.request.post('/page/api/pages', {
        headers: { origin: 'http://127.0.0.1:3200' },
        data: {
          title: 'Native theme controls',
          slug: `native-theme-controls-${mode}`,
        },
      })
    ).json();
    await page.goto(`/page/manage/${record.id}`);
    await openCustomize(page, 'Themes');
    await expect(page.locator('html')).toHaveAttribute(
      'data-pager-host-theme',
      mode,
    );
    const nativeBackground = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'var(--pager-management-surface-quiet)';
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    await expect(page.getByLabel('Theme name', { exact: true })).toHaveCSS(
      'background-color',
      nativeBackground,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await openCustomize(page, 'Themes');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await expect(
      page.getByRole('button', { name: 'Try Studio theme', exact: true }),
    ).toBeVisible();
  });
}
