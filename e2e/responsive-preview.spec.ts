import { test, expect } from '@playwright/test';

test('private preview uses desktop, tablet, and phone gallery viewports', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await page.request.post('/page/api/pages', {
    headers: { origin: 'http://127.0.0.1:3200' },
    data: {
      title: 'Responsive preview client',
      slug: 'responsive-preview-client',
      albumIds: [albums[0].id],
    },
  });
  expect(created.ok()).toBe(true);
  const draft = await created.json();

  await page.goto(`/page/manage/${draft.id}`);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();

  const preview = page.locator('[data-testid="responsive-preview-frame"]');
  await expect(preview).toBeVisible();
  const gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(gallery.locator('.ip-title')).toHaveText(
    'Responsive preview client',
  );
  const cover = gallery.locator('.ip-cover img').first();
  await expect
    .poll(() => cover.evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(page.getByRole('group', { name: 'Preview size' })).toBeVisible();
  await expect(
    gallery.getByRole('button', { name: 'Publish page', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: 'test-results/responsive-preview-desktop.png',
  });

  const viewportWidth = () =>
    preview.evaluate((frame) => frame.contentWindow?.innerWidth);
  const desktopWidth = await viewportWidth();
  expect(desktopWidth).toBeGreaterThan(768);

  const tablet = page.getByRole('button', { name: 'Tablet preview' });
  await tablet.click();
  await expect(tablet).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(viewportWidth).toBe(768);
  await expect(gallery.locator('.shared')).toBeVisible();
  await page.screenshot({ path: 'test-results/responsive-preview-tablet.png' });

  const phone = page.getByRole('button', { name: 'Phone preview' });
  await phone.focus();
  await page.keyboard.press('Enter');
  await expect(phone).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(viewportWidth).toBe(390);
  await expect(gallery.locator('.shared')).toBeHidden();
  await page.screenshot({ path: 'test-results/responsive-preview-phone.png' });
  expect(
    await gallery
      .locator('html')
      .evaluate((documentRoot) => documentRoot.scrollWidth <= innerWidth),
  ).toBe(true);

  const anonymous = await browser.newContext();
  const privatePreview = await anonymous.request.get(
    `/page/manage/${draft.id}/preview`,
  );
  expect(privatePreview.status()).toBe(401);
  const privateCover = await anonymous.request.get(
    `/page/media/${draft.id}/album/${albums[0].id}?preview=1`,
  );
  expect(privateCover.status()).toBe(404);
  const unpublished = await anonymous.request.get(
    '/page/responsive-preview-client',
  );
  expect(unpublished.status()).toBe(404);
});
