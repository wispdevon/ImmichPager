import { test, expect } from '@playwright/test';
import { confirmPublication } from './publication-helper';

test('edits the gallery header in place, autosaves privately, and publishes explicitly', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await expect(page.locator('.ip-albums, .ip-album, .ip-footer')).toHaveCount(
    0,
  );

  await page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', { name: 'Edit title, Add a title', exact: true })
    .click();
  const title = page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Title', { exact: true });
  await expect(title).toBeFocused();
  await title.fill('Jane Doe photography');
  await title.press('Tab');
  await expect(
    page
      .frameLocator('[title="Live page canvas"]')
      .getByRole('heading', { name: 'Jane Doe photography', exact: true }),
  ).toBeVisible();

  await page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', {
      name: 'Edit description, Add a description',
      exact: true,
    })
    .click();
  const description = page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Description', { exact: true });
  await expect(description).toBeFocused();
  await description.fill('Portraits and stories, made together.');
  await description.press('Tab');
  await expect(
    page.frameLocator('[title="Live page canvas"]').getByRole('button', {
      name: 'Edit description, Portraits and stories, made together.',
    }),
  ).toBeVisible();

  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(
    page.getByRole('button', { name: 'Page settings', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Preview', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Publish page', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/inline-header-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/inline-header-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 800 });

  const saved = await (
    await page.request.get(`/page/api/pages/${page.url().split('/').pop()}`)
  ).json();
  expect(saved).toMatchObject({
    title: 'Jane Doe photography',
    description: 'Portraits and stories, made together.',
    status: 'draft',
    publishedSlug: null,
  });

  await page.getByRole('button', { name: 'Add albums', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Include Liberty Family Camp ’26' })
    .check();
  await page.keyboard.press('Escape');

  const visitor = await browser.newContext();
  expect(
    (await visitor.request.get('/page/jane-doe-photography')).status(),
  ).toBe(404);

  await confirmPublication(page, 'Publish page');
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'Page published',
  );
  const client = await visitor.newPage();
  await client.goto('/page/jane-doe-photography');
  await expect(
    client.getByRole('heading', { name: 'Jane Doe photography', exact: true }),
  ).toBeVisible();
  await expect(
    client.getByText('Portraits and stories, made together.', { exact: true }),
  ).toBeVisible();
  await visitor.close();
});
