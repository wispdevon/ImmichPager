import { test, expect } from '@playwright/test';

test('public gallery search, month filter, year jump and clear work on mobile', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/page/acme');

  await expect(page.locator('.album')).toHaveCount(9);
  await expect(page.getByLabel('Album name')).toBeVisible();
  await expect(page.getByLabel('Month')).toBeVisible();
  await expect(page.getByLabel('Jump to year')).toBeVisible();
  await expect(page.getByLabel('Month')).toHaveValue('');
  await expect(page.getByLabel('Month').locator('option')).toHaveCount(13);
  await expect(page.getByLabel('Month').locator('option').first()).toHaveText(
    'All months',
  );
  await page.screenshot({
    path: 'test-results/browsing-mobile.png',
    fullPage: true,
  });

  await page.getByLabel('Album name').fill('  fAmIlY cAmP  ');
  await expect(page.locator('.album')).toHaveCount(1);
  await expect(page.locator('.album h3')).toHaveText('Liberty Family Camp ’26');
  await expect(page.getByText('1 of 9 albums')).toBeVisible();
  await expect(page.locator('.visually-hidden[role="status"]')).toHaveText(
    '1 album shown for fAmIlY cAmP',
  );

  await page.getByLabel('Album name').fill('no album with this name');
  await expect(
    page.getByRole('heading', { name: 'No matching albums' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Album name')).toHaveValue('');
  await expect(page.getByLabel('Month')).toHaveValue('');
  await expect(page.locator('.album')).toHaveCount(9);

  await page.getByLabel('Month').selectOption('10');
  await expect(page.locator('.album')).toHaveCount(1);
  await expect(page.locator('.album h3')).toHaveText('Captured by Me');
  await page.getByLabel('Album name').fill('captured');
  await page.getByLabel('Month').selectOption('5');
  await expect(
    page.getByRole('heading', { name: 'No matching albums' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.album')).toHaveCount(9);

  await page.locator('#ip-year-2025 summary').click();
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', false);
  await page.getByLabel('Jump to year').selectOption('2025');
  const yearPosition = await page
    .locator('#ip-year-2025')
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(yearPosition).toBeGreaterThanOrEqual(0);
  expect(yearPosition).toBeLessThan(640);
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', true);
  await expect(page.locator('#ip-year-2025 summary')).toBeFocused();
  await page.locator('#ip-year-2025 summary').click();
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', false);
  await page.locator('#ip-year-2025 summary').click();
  await expect(page.locator('#ip-year-2025')).toHaveJSProperty('open', true);

  await page.setViewportSize({ width: 620, height: 800 });
  await page.getByLabel('Album name').fill('captured');
  await expect(
    page.getByRole('button', { name: 'Clear filters' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.setViewportSize({ width: 320, height: 640 });

  for (const label of ['Album name', 'Month', 'Jump to year']) {
    const box = await page.getByLabel(label).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
