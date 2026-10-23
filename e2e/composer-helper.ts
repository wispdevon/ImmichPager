import type { Page, FrameLocator } from '@playwright/test';
type Root = Page | FrameLocator;
export const canvas = (root: Root) =>
  root.frameLocator('[title="Live page canvas"]');
export async function openHeader(root: Root) {
  if (!(await root.locator('.inspector-tabs').isVisible()))
    await root.locator('.mobile-settings').click();
  await root
    .getByRole('button', { name: 'Content inspector', exact: true })
    .click();
  const header = root.locator('details.header-settings');
  if ((await header.getAttribute('open')) === null)
    await header.locator('summary').click();
}
export async function showSharing(root: Root) {
  const close = root.getByRole('button', {
    name: 'Close settings',
    exact: true,
  });
  if (await close.isVisible()) await close.click();
  await root
    .getByRole('button', { name: 'Page settings', exact: true })
    .click();
  return root.getByRole('dialog', { name: 'Page settings', exact: true });
}
