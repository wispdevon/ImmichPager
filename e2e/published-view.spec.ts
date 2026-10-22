import { test, expect } from '@playwright/test';

test('opens the published revision with password guidance while drafts remain private', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Published client version',
      slug: 'published-client-check',
      albumIds: [albums[0].id],
    },
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  await page.goto(`/page/manage/${record.id}`);
  await expect(
    page.getByRole('link', { name: 'Open published page' }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.post(`/page/api/pages/${record.id}/publish`, {
        headers,
        data: {
          passwordMode: 'set',
          password: 'check-pin',
          expectedDraftRevision: record.draftRevision,
        },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  const link = page.getByRole('link', { name: 'Open published page' });
  await expect(link).toHaveAttribute('href', '/page/published-client-check');
  await expect(
    page.getByText('Password protected', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Edit title, Published client version',
      exact: true,
    })
    .click();
  const title = page.getByLabel('Title', { exact: true });
  await title.fill('Private changed title');
  await title.press('Tab');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await link.focus();
  const popupPromise = page.waitForEvent('popup');
  await page.keyboard.press('Enter');
  const client = await popupPromise;
  await expect(client).toHaveURL(/\/page\/published-client-check$/);
  await expect(
    client.getByRole('heading', { name: 'Password required' }),
  ).toBeVisible();
  await client.getByPlaceholder('Password', { exact: true }).fill('check-pin');
  await client.getByRole('button', { name: 'View albums' }).click();
  await expect(
    client.getByRole('heading', { name: 'Published client version' }),
  ).toBeVisible();
  await expect(
    client.getByRole('button', { name: 'Options', exact: true }),
  ).toHaveCount(0);
  await expect(
    client.getByText('Private changed title', { exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(link).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/published-view-mobile.png',
    fullPage: true,
  });
  const anonymous = await browser.newContext();
  const freshClient = await anonymous.newPage();
  await freshClient.goto('/page/published-client-check');
  await expect(
    freshClient.getByRole('heading', { name: 'Password required' }),
  ).toBeVisible();
  await anonymous.close();
  await client.close();
  expect(errors).toEqual([]);
});

test('unprotected published pages explain their actual password state', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const pages = await (await page.request.get('/page/api/pages')).json();
  const record = pages.find(
    (item: { publishedSlug: string | null }) => item.publishedSlug === 'acme',
  );
  expect(record).toBeTruthy();
  await page.goto(`/page/manage/${record.id}`);
  await expect(
    page.getByText('No page password is set on the published version.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open published page' }),
  ).toHaveAttribute('href', '/page/acme');
  await page.screenshot({
    path: 'test-results/published-view-desktop.png',
    fullPage: false,
  });
});
