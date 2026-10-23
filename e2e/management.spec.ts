import { expect, test } from '@playwright/test';

test('management status filters, draft branding previews, and mobile rows', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/dev-login/alice');

  const headers = { origin: 'http://127.0.0.1:3200' };
  const createPage = async (
    title: string,
    slug: string,
    albumIds: string[] = [],
  ) => {
    const response = await page.request.post('/page/api/pages', {
      headers,
      data: { title, slug, albumIds },
    });
    expect(response.ok()).toBe(true);
    return response.json();
  };

  const brandedDraft = await createPage(
    'LTR02 draft with branding',
    'ltr02-draft-branding',
  );
  const genericDraft = await createPage(
    'LTR02 generic draft',
    'ltr02-generic-draft',
  );
  const album = (await (await page.request.get('/page/api/albums')).json())[0];
  const publishedDraft = await createPage(
    'LTR02 published page',
    'ltr02-published-page',
    [album.id],
  );
  const publishResponse = await page.request.post(
    `/page/api/pages/${publishedDraft.id}/publish`,
    {
      headers,
      data: { expectedDraftRevision: publishedDraft.draftRevision },
    },
  );
  expect(publishResponse.ok()).toBe(true);
  const published = await publishResponse.json();
  const changeResponse = await page.request.put(
    `/page/api/pages/${published.id}`,
    {
      headers,
      data: {
        title: 'LTR02 published with unpublished changes',
        slug: 'ltr02-published-page',
        albumIds: [album.id],
        expectedDraftRevision: published.draftRevision,
      },
    },
  );
  expect(changeResponse.ok()).toBe(true);

  await page.goto(`/page/manage/${brandedDraft.id}`);
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Banner preview')).toBeVisible();
  await page
    .getByLabel('Logo', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Logo preview')).toBeVisible();

  await page.goto('/page/manage');
  const filter = page.getByRole('button', {
    name: 'Filter pages',
    exact: true,
  });
  const search = page.getByRole('searchbox', { name: 'Search pages' });
  const brandedRow = page
    .getByTestId('management-page-row')
    .filter({ hasText: 'LTR02 draft with branding' });
  await expect(brandedRow).toBeVisible();
  const banner = brandedRow.locator('img.preview-banner');
  const logo = brandedRow.locator('img.preview-logo');
  const bannerSrc = await banner.getAttribute('src');
  expect(bannerSrc).toBe(
    `/page/media/${brandedDraft.id}/branding/banner?preview=1`,
  );
  expect(await logo.getAttribute('src')).toBe(
    `/page/media/${brandedDraft.id}/branding/logo?preview=1`,
  );
  expect(bannerSrc).not.toMatch(/[?&](key|token)=/i);
  expect(bannerSrc).not.toContain('/s/');
  await expect
    .poll(() =>
      banner.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);

  await filter.click();
  await page.getByRole('option', { name: 'Drafts', exact: true }).click();
  await search.fill('LTR02');
  await expect(brandedRow).toBeVisible();
  await expect(
    page
      .getByTestId('management-page-row')
      .filter({ hasText: 'LTR02 generic draft' })
      .getByTestId(`page-preview-${genericDraft.id}`),
  ).toHaveAttribute('data-preview-kind', 'generic');
  await expect(
    page
      .getByTestId('management-page-row')
      .filter({ hasText: 'LTR02 published page' }),
  ).toHaveCount(0);

  await filter.click();
  await page.getByRole('option', { name: 'Published', exact: true }).click();
  await expect(search).toHaveValue('LTR02');
  const changedPublishedRow = page
    .getByTestId('management-page-row')
    .filter({ hasText: 'LTR02 published with unpublished changes' });
  await expect(changedPublishedRow).toBeVisible();
  await expect(
    changedPublishedRow.getByText('1 album', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId('management-page-row')
      .filter({ hasText: 'LTR02 published with unpublished changes' })
      .getByText('Unpublished changes', { exact: true }),
  ).toBeVisible();

  await filter.click();
  await page
    .getByRole('option', { name: 'Unpublished changes', exact: true })
    .click();
  await expect(
    page
      .getByTestId('management-page-row')
      .filter({ hasText: 'LTR02 published with unpublished changes' }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId('management-page-row')
      .filter({ hasText: 'LTR02 published page' }),
  ).toHaveCount(0);

  const bob = await browser.newContext();
  await bob.request.get('/dev-login/bob');
  expect(
    (
      await bob.request.get(
        `/page/media/${brandedDraft.id}/branding/banner?preview=1`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await bob.request.get(
        `/page/media/${brandedDraft.id}/branding/logo?preview=1`,
      )
    ).status(),
  ).toBe(404);
  await bob.close();

  await filter.click();
  await page.getByRole('option', { name: 'All pages', exact: true }).click();
  await search.fill('LTR02 draft with branding');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(brandedRow).toBeVisible();
  const mobileActions = brandedRow.getByTestId(
    'management-actions-menu-trigger',
  );
  await expect(mobileActions).toBeVisible();
  await mobileActions.click();
  await expect(
    page.getByRole('menuitem', { name: 'Page settings', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/management-mobile.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
