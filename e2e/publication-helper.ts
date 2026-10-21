import { expect, type Page } from '@playwright/test';

export async function confirmPublication(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  const review = page.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(review).toBeVisible();
  await review.getByRole('button', { name: label, exact: true }).click();
}
