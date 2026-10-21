import type { Page } from '@playwright/test';

export async function setHeaderText(
  page: Page,
  field: 'Title' | 'Description',
  value: string,
) {
  const buttonName = new RegExp(`^Edit ${field.toLowerCase()},`);
  await page.getByRole('button', { name: buttonName }).click();
  const input = page.getByLabel(field, { exact: true });
  await input.fill(value);
  await input.press('Tab');
}
