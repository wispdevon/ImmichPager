import { openAllDesignGroups } from './customize-helper';
import { expect, test, type Page } from '@playwright/test';

const origin = 'http://127.0.0.1:3200';

async function createAlbumDraft(page: Page, suffix: string) {
  await page.goto('/dev-login/alice');
  const albums = (await (
    await page.request.get('/page/api/albums')
  ).json()) as {
    id: string;
    albumName: string;
  }[];
  const album = albums[0];
  expect(album).toBeTruthy();
  const slug = `settings-${suffix}-${Date.now()}`;
  const response = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: `Composer settings ${suffix}`,
      description: 'Every shoot. Every season. All in one place.',
      slug,
      blocks: [
        {
          id: 'albums',
          type: 'albums',
          heading: 'A collection to remember',
          albumIds: [album.id],
        },
      ],
    },
  });
  expect(response.ok()).toBe(true);
  const draft = await response.json();
  await page.goto(`/page/manage/${draft.id}`);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  return { draft, album };
}

test('Page settings opens as a modal beside Publish and restores focus when closed', async ({
  page,
}) => {
  await createAlbumDraft(page, 'sharing');

  const toolbar = page.locator('.composer-toolbar');
  const settingsButton = toolbar.getByRole('button', {
    name: 'Page settings',
    exact: true,
  });
  const publishButton = toolbar.getByRole('button', {
    name: 'Publish page',
    exact: true,
  });
  await expect(settingsButton).toBeVisible();
  await expect(publishButton).toBeVisible();
  expect(
    await settingsButton.evaluate(
      (button) =>
        button.nextElementSibling === button.parentElement?.lastElementChild,
    ),
  ).toBe(true);

  await expect(
    page.getByRole('button', { name: 'Sharing inspector', exact: true }),
  ).toHaveCount(0);
  await settingsButton.click();
  const dialog = page.getByRole('dialog', {
    name: 'Page settings',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Client link');
  await dialog
    .getByRole('button', { name: 'Close', exact: true })
    .last()
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(settingsButton).toBeFocused();
});

test('album styles are visual radio choices and update the live canvas', async ({
  page,
}) => {
  await createAlbumDraft(page, 'style-picker');
  const content = page.getByRole('region', { name: 'Page content' });
  const stylePicker = content.getByRole('radiogroup', { name: 'Album style' });

  await expect(stylePicker.getByRole('radio', { name: 'Cards' })).toBeVisible();
  for (const choice of await stylePicker.locator('.choice').all()) {
    const bounds = await choice.boundingBox();
    expect(bounds!.height).toBeLessThan(130);
  }
  await expect(stylePicker.getByRole('radio', { name: 'Tiles' })).toBeVisible();
  const editorial = stylePicker.getByRole('radio', { name: 'Editorial' });
  await editorial.click();
  await expect(editorial).toBeChecked();
  await expect(
    page
      .frameLocator('[title="Live page canvas"]')
      .locator('[data-block-id="albums"] .albums.editorial'),
  ).toBeVisible();
});

test('individual and full resets restore presentation defaults while preserving content and publication', async ({
  page,
}) => {
  const { draft, album } = await createAlbumDraft(page, 'reset');
  const published = await page.request.post(
    `/page/api/pages/${draft.id}/publish`,
    {
      headers: { origin },
      data: { expectedDraftRevision: draft.draftRevision },
    },
  );
  expect(published.ok()).toBe(true);
  const live = await published.json();
  await page.goto(`/page/manage/${draft.id}`);

  await page.getByRole('button', { name: 'Design inspector' }).click();
  await openAllDesignGroups(page);
  const titleWeight = page.getByRole('slider', {
    name: 'Title weight',
    exact: true,
  });
  await titleWeight.focus();
  await page.keyboard.press('ArrowRight');
  await expect(titleWeight).toHaveValue('700');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page
    .getByRole('button', { name: 'Reset Title weight to default', exact: true })
    .click();
  await expect(titleWeight).toHaveValue('650');
  await expect(titleWeight).toBeFocused();

  await titleWeight.focus();
  await page.keyboard.press('ArrowRight');
  await page.getByLabel('Accent color', { exact: true }).fill('#ff0000');
  await page.getByRole('button', { name: 'Content inspector' }).click();
  const stylePicker = page
    .getByRole('region', { name: 'Page content' })
    .getByRole('radiogroup', { name: 'Album style' });
  await stylePicker.getByRole('radio', { name: 'Editorial' }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  await page.getByRole('button', { name: 'Design inspector' }).click();
  await page
    .getByRole('button', { name: 'Reset all customization', exact: true })
    .click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  const saved = await (
    await page.request.get(`/page/api/pages/${draft.id}`)
  ).json();
  expect(saved.title).toBe('Composer settings reset');
  expect(saved.description).toBe(
    'Every shoot. Every season. All in one place.',
  );
  expect(saved.blocks[0]).toMatchObject({
    id: 'albums',
    type: 'albums',
    heading: 'A collection to remember',
    albumIds: [album.id],
    layout: 'cards',
  });
  expect(saved.galleryStyle.titleFontWeight).toBe(650);
  expect(saved.accent).toBe('#accbfa');
  expect(saved.publishedSlug).toBe(live.publishedSlug);
  expect(saved.publishedRevision).toBe(live.publishedRevision);
  expect(saved.hasUnpublishedChanges).toBe(false);
});
