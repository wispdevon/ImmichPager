import { expect, test } from '@playwright/test';
import { photographyCollections } from '../src/lib/theme-collections';
import { applyTheme } from '../src/lib/themes';
import { parsePageInput } from '../src/lib/contracts';
import { openCustomize } from './customize-helper';

for (const collection of photographyCollections) {
  for (const item of collection.themes) {
    test(`${item.definition.name} keeps its licensed composition responsive and portable`, async ({
      page,
    }) => {
      await page.goto('/dev-login/alice');
      const headers = { origin: 'http://127.0.0.1:3200' };
      const photos = (await (await page.request.get('/page/api/photos')).json())
        .items;
      const albums = await (await page.request.get('/page/api/albums')).json();
      const input = applyTheme(
        parsePageInput({
          title: 'Stories worth keeping, moments worth remembering',
          slug: item.id,
          description:
            'A collection of photographs, carefully composed for our clients.',
          clientUi: { showBranding: false },
          blocks: [
            {
              id: 'photos',
              type: 'photos',
              heading: 'Selected frames',
              photos: photos
                .slice(1, 7)
                .map((p: { id: string }) => ({ id: p.id })),
            },
            {
              id: 'albums',
              type: 'albums',
              heading: 'Complete stories',
              albumIds: albums.slice(0, 2).map((a: { id: string }) => a.id),
              grouping: 'none',
            },
          ],
        }),
        item.definition,
      );
      let record = await (
        await page.request.post('/page/api/pages', { headers, data: input })
      ).json();
      record = await (
        await page.request.post(
          `/page/api/pages/${record.id}/branding/banner`,
          {
            headers,
            data: {
              assetId: photos[1].id,
              expectedDraftRevision: record.draftRevision,
            },
          },
        )
      ).json();
      const published = await page.request.post(
        `/page/api/pages/${record.id}/publish`,
        { headers, data: { expectedDraftRevision: record.draftRevision } },
      );
      expect(published.ok(), await published.text()).toBe(true);
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`/page/${input.slug}`);
        await expect(page.locator('.ip-photo')).toHaveCount(6);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await expect(page.locator('.ip-footer')).toHaveCount(0);
        await page
          .getByRole('button', { name: 'Page info', exact: true })
          .click();
        await expect(page.locator('.theme-credit')).toContainText(
          'AJ / HTML5 UP',
        );
        await expect(page.locator('.theme-credit a').first()).toHaveAttribute(
          'href',
          item.definition.attribution!.url,
        );
        await page.keyboard.press('Escape');
        await page.locator('.ip-photo').first().click();
        await expect(
          page.getByRole('dialog', { name: 'Photo viewer' }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Close photo viewer' }).click();
      }
      // Theme styling must keep the editor's typography controls effective.
      const current = await (
        await page.request.get(`/page/api/pages/${record.id}`)
      ).json();
      const changed = await (
        await page.request.put(`/page/api/pages/${record.id}`, {
          headers,
          data: {
            ...current,
            galleryStyle: { ...current.galleryStyle, titleFontWeight: 800 },
            expectedDraftRevision: current.draftRevision,
          },
        })
      ).json();
      const update = await page.request.post(
        `/page/api/pages/${record.id}/publish`,
        { headers, data: { expectedDraftRevision: changed.draftRevision } },
      );
      expect(update.ok()).toBe(true);
      await page.reload();
      await expect(page.locator('.ip-title')).toHaveCSS('font-weight', '800');
      expect((await page.request.get(item.path)).ok()).toBe(true);
      expect(await (await page.request.get(item.path)).json()).toMatchObject({
        format: 'immichpager-theme',
        theme: {
          name: item.definition.name,
          attribution: item.definition.attribution,
        },
      });
    });
  }
}

test('theme confirmation floats in the canvas, keeps the header compact and restores keyboard focus', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const record = await (
    await page.request.post('/page/api/pages', {
      headers,
      data: { title: 'Compact editor', slug: 'compact-theme-editor' },
    })
  ).json();
  await page.goto(`/page/manage/${record.id}`);
  await openCustomize(page, 'Themes');
  expect(
    (await page.locator('.panel-heading').boundingBox())!.height,
  ).toBeLessThan(64);
  const chooser = page.getByRole('combobox', {
    name: 'Photography speciality',
  });
  for (const collection of photographyCollections) {
    await chooser.selectOption(collection.id);
    await expect(
      page.locator('.photography-collection .theme-card'),
    ).toHaveCount(3);
    await expect(
      page.getByRole('button', {
        name: `Try ${collection.themes[0].definition.name} theme`,
        exact: true,
      }),
    ).toBeVisible();
  }
  await chooser.selectOption('wedding');
  const button = page.getByRole('button', {
    name: 'Try Story Wedding theme',
    exact: true,
  });
  await button.click();
  const prompt = page.getByRole('dialog', { name: 'Try Story Wedding?' });
  await expect(prompt).toBeVisible();
  await expect(
    prompt.getByRole('button', { name: 'Cancel preview', exact: true }),
  ).toBeFocused();
  const bounds = (await page.locator('.canvas-stage').boundingBox())!,
    box = (await prompt.boundingBox())!;
  expect(
    Math.abs(box.x + box.width / 2 - bounds.x - bounds.width / 2),
  ).toBeLessThan(2);
  expect(
    Math.abs(box.y + box.height / 2 - bounds.y - bounds.height / 2),
  ).toBeLessThan(2);
  await expect(
    page.getByRole('button', { name: 'Publish page', exact: true }),
  ).toBeDisabled();
  await prompt.press('Escape');
  await expect(prompt).toHaveCount(0);
  await expect(button).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await openCustomize(page, 'Themes');
  await page
    .getByRole('button', { name: 'Try Story Wedding theme', exact: true })
    .click();
  await expect(prompt).toBeVisible();
  await expect(page.locator('.inspector-tabs')).not.toBeVisible();
  await prompt
    .getByRole('button', { name: 'Apply theme', exact: true })
    .click();
  await expect(prompt).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/page/api/pages/${record.id}`)).json())
          .pageTheme?.definition.name,
    )
    .toBe('Story Wedding');
});

test('publication feedback is a dismissible transient toast that never moves the workspace', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const record = await (
    await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'Toast layout',
        slug: 'toast-layout',
        albumIds: [albums[0].id],
      },
    })
  ).json();
  await page.goto(`/page/manage/${record.id}`);
  const y = (await page.locator('.workspace').boundingBox())!.y;
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review publication' });
  await expect(review).toBeVisible();
  await review
    .getByRole('button', { name: 'Publish page', exact: true })
    .click();
  const toast = page.locator('.editor-toast');
  await expect(toast).toContainText(
    'Page published. Your client link is ready.',
  );
  await expect(toast).toHaveCSS('position', 'fixed');
  expect((await page.locator('.workspace').boundingBox())!.y).toBe(y);
  await expect(toast).toHaveCount(0, { timeout: 7000 });
  await page
    .getByRole('button', { name: 'Design inspector', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reset all customization', exact: true })
    .click();
  await expect(toast).toBeVisible();
  await toast.getByRole('button').click();
  await expect(toast).toHaveCount(0);
});
