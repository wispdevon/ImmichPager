import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openCustomize } from './customize-helper';

test('token preview reports unsupported paths and applies styling without changing visibility or CSS', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const sourceResponse = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Token source',
      slug: 'design-token-source',
      background: '#f4f2ef',
      foreground: '#302d2a',
      accent: '#d26c42',
      titleSize: 3.75,
      descriptionSize: 1.25,
      logoSize: 120,
      headerSpacing: 3.25,
      bannerPosition: 24,
      galleryStyle: {
        fontFamily: 'system',
        titleFontWeight: 700,
        bodyFontSize: 1.125,
        bodyFontWeight: 500,
        cardTitleSize: 1.25,
        cardTitleWeight: 700,
        contentWidth: 1200,
        pagePadding: 32,
        gridMinWidth: 280,
        gridRowGap: 24,
        gridColumnGap: 16,
        coverAspectRatio: 1.5,
        cardRadius: 12,
        hoverTreatment: 'lift',
      },
    },
  });
  expect(sourceResponse.ok()).toBe(true);
  const source = await sourceResponse.json();
  await page.goto('/page/manage/' + source.id);
  const sourceDialog = await openCustomize(page, 'Themes');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    sourceDialog.getByRole('button', { name: 'Export .tokens.json' }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const tokenDocument = JSON.parse(await readFile(path!, 'utf8'));
  tokenDocument.pager.experiment = {
    unsupportedDimension: { $type: 'dimension', $value: '42px' },
  };
  const tokenText = JSON.stringify(tokenDocument);

  const visibility = {
    showTitle: false,
    showBanner: false,
    showAlbumDates: false,
    showBrowsingControls: false,
  };
  const customCss = ':scope { --pager-accent: #ab12cd; }';
  const targetResponse = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Token target',
      slug: 'design-token-target',
      clientUi: visibility,
      customCss,
      galleryStyle: { gridMinWidth: 200 },
    },
  });
  expect(targetResponse.ok()).toBe(true);
  const target = await targetResponse.json();
  await page.goto('/page/manage/' + target.id);
  const dialog = await openCustomize(page, 'Themes');
  await dialog.getByLabel('Import .tokens.json').setInputFiles({
    name: 'immichpager-design.tokens.json',
    mimeType: 'application/json',
    buffer: Buffer.from(tokenText),
  });

  await expect(
    dialog.getByRole('heading', { name: 'Import summary' }),
  ).toBeVisible();
  await expect(dialog).toContainText('21 recognized tokens');
  await expect(dialog).toContainText('1 unsupported path');
  await dialog.getByText('Unsupported token paths', { exact: true }).click();
  await expect(dialog).toContainText('pager.experiment.unsupportedDimension');

  await dialog.getByLabel('Import .tokens.json').setInputFiles({
    name: 'unsupported-only.tokens.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ pager: { experiment: tokenDocument.pager.experiment } }),
    ),
  });
  await expect(dialog).toContainText('0 recognized tokens');
  await expect(
    dialog.getByRole('button', { name: 'Apply styling' }),
  ).toBeDisabled();
  await dialog.getByLabel('Import .tokens.json').setInputFiles({
    name: 'immichpager-design.tokens.json',
    mimeType: 'application/json',
    buffer: Buffer.from(tokenText),
  });
  await dialog.getByRole('button', { name: 'Apply styling' }).click();
  await expect(dialog.locator('#token-file-status')).toContainText(
    'Visibility and custom CSS are unchanged',
  );
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  const updated = await (
    await page.request.get('/page/api/pages/' + target.id)
  ).json();
  expect(updated.clientUi).toMatchObject(visibility);
  expect(updated.customCss).toBe(customCss);
  expect(updated.background).toBe('#f4f2ef');
  expect(updated.foreground).toBe('#302d2a');
  expect(updated.accent).toBe('#d26c42');
  expect(updated.titleSize).toBe(3.75);
  expect(updated.galleryStyle).toMatchObject({
    fontFamily: 'system',
    titleFontWeight: 700,
    contentWidth: 1200,
    gridMinWidth: 280,
    hoverTreatment: 'surface',
  });
});
