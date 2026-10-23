import { expect, type Page } from '@playwright/test';

export async function confirmPublication(page: Page, label: string) {
  const close = page.getByRole('button', {
    name: 'Close settings',
    exact: true,
  });
  if (await close.isVisible()) await close.click();
  await page
    .locator('.composer-toolbar')
    .getByRole('button', { name: label, exact: true })
    .click();
  const review = page.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(review).toBeVisible();
  await review.getByRole('button', { name: label, exact: true }).click();
}
