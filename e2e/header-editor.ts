import type { Page } from '@playwright/test';

export async function setHeaderText(
  page: Page,
  field: 'Title' | 'Description',
  value: string,
) {
  const close = page.getByRole('button', {
    name: 'Close settings',
    exact: true,
  });
  if (await close.isVisible()) await close.click();
  const canvas = page.frameLocator('[title="Live page canvas"]');
  const buttonName = new RegExp(`^Edit ${field.toLowerCase()},`);
  await canvas.getByRole('button', { name: buttonName }).click();
  const input = canvas.getByLabel(field, { exact: true });
  await input.fill(value);
  await input.press('Tab');
}
