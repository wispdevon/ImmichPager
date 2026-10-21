import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('appearance files round-trip between private drafts without copying page data', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const sourceResponse = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Design source',
      slug: 'appearance-source',
      description: 'Source page copy',
      albumIds: [albums[0].id],
      theme: 'light',
      background: '#f4f2ef',
      foreground: '#302d2a',
      accent: '#d26c42',
      alignment: 'center',
      bannerPosition: 24,
      headerLayout: 'overlay',
      customCss: '.ip-title { color: #d26c42 !important; }',
    },
  });
  expect(sourceResponse.ok()).toBe(true);
  const source = await sourceResponse.json();
  await page.goto(`/page/manage/${source.id}`);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByText('Import or export appearance', { exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export appearance JSON' }).click(),
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const exportedText = await readFile(downloadPath!, 'utf8');
  const exported = JSON.parse(exportedText);
  expect(exported).toEqual({
    format: 'immichpager-appearance',
    version: 1,
    appearance: {
      theme: 'light',
      background: '#f4f2ef',
      foreground: '#302d2a',
      accent: '#d26c42',
      alignment: 'center',
      bannerPosition: 24,
      headerLayout: 'overlay',
      customCss: '.ip-title { color: #d26c42 !important; }',
    },
  });

  const targetResponse = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Destination page',
      slug: 'appearance-destination',
      description: 'Keep this description',
      albumIds: [albums[1].id, albums[2].id],
      order: 'manual',
    },
  });
  expect(targetResponse.ok()).toBe(true);
  const target = await targetResponse.json();
  await page.goto(`/page/manage/${target.id}`);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByText('Import or export appearance', { exact: true }).click();
  await page.getByLabel('Import appearance JSON').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'test-results/appearance-import-export.png',
    fullPage: true,
  });
  await page.getByLabel('Import appearance JSON').setInputFiles({
    name: 'immichpager-appearance.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedText),
  });
  await expect(page.getByRole('status')).toContainText(
    'Appearance imported into this private draft',
  );
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  const updated = await (
    await page.request.get(`/page/api/pages/${target.id}`)
  ).json();
  expect(updated).toMatchObject({
    title: 'Destination page',
    slug: 'appearance-destination',
    description: 'Keep this description',
    albumIds: [albums[1].id, albums[2].id],
    order: 'manual',
    theme: 'light',
    background: '#f4f2ef',
    foreground: '#302d2a',
    accent: '#d26c42',
    alignment: 'center',
    bannerPosition: 24,
    headerLayout: 'overlay',
    customCss: '.ip-title { color: #d26c42 !important; }',
    status: 'draft',
    publishedSlug: null,
  });
  expect(
    (await page.request.get('/page/appearance-destination')).status(),
  ).toBe(404);
  expect(errors).toEqual([]);
});
