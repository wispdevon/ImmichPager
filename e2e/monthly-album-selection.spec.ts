import { expect, test } from '@playwright/test';

test('recently added sorting and bulk actions stay within the visible owned albums', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await page.getByRole('button', { name: 'Add albums', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add albums' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/page\/manage\/new$/);
  await expect(page.locator('main')).toBeVisible();
  await page.screenshot({
    path: '/tmp/immichpager-monthly-album-picker-desktop.png',
    fullPage: false,
  });

  const sort = page.getByLabel('Sort by');
  await expect(sort).toHaveValue('recent');
  await expect(page.locator('.pick strong').first()).toHaveText(
    'Captured by Me',
  );
  await sort.selectOption('name');
  await expect(page.locator('.pick strong').first()).toHaveText(
    'A new perspective',
  );
  await sort.selectOption('recent');
  await expect(page.locator('.pick strong').first()).toHaveText(
    'Captured by Me',
  );

  await page
    .getByRole('button', { name: 'Include visible', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Add albums' }).getByRole('status'),
  ).toContainText('9 of 9 shown included');
  await expect(page.locator('.pick input:checked')).toHaveCount(9);
  await expect(
    page.getByRole('button', { name: 'Include visible', exact: true }),
  ).toBeDisabled();

  const search = page.getByRole('searchbox', { name: 'Search albums' });
  await search.fill('Liberty Family');
  await expect(page.locator('.pick')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Remove visible', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Add albums' }).getByRole('status'),
  ).toContainText('0 of 1 shown included');

  await search.fill('Captured by Me');
  await expect(
    page.getByRole('dialog', { name: 'Add albums' }).getByRole('status'),
  ).toContainText('1 of 1 shown included');
  await page.getByRole('button', { name: 'Selected', exact: true }).click();
  await search.fill('');
  await expect(page.locator('.pick')).toHaveCount(8);
  await expect(page.locator('.pick input:checked')).toHaveCount(8);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: '/tmp/immichpager-monthly-album-picker-mobile.png',
    fullPage: false,
  });

  await search.fill('no matching album');
  await expect(page.getByText('No matching albums.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Include visible', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Remove visible', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText('8 selected', { exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Actions for / })).toHaveCount(
    8,
  );
  expect(errors).toEqual([]);
});
