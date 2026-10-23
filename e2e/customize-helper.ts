import { expect, type FrameLocator, type Page } from '@playwright/test';
type Root = Page | FrameLocator;
export async function openCustomize(
  root: Root,
  tab: 'Design' | 'Elements' | 'Themes' | 'CSS' = 'Design',
) {
  if (!(await root.locator('.inspector-tabs').isVisible()))
    await root.locator('.mobile-settings').click();
  await root
    .getByRole('button', { name: 'Design inspector', exact: true })
    .click();
  const workspace = root.locator('.composer');
  await workspace.getByRole('tab', { name: tab, exact: true }).click();
  await expect(workspace.getByRole('tabpanel')).toBeVisible();
  return workspace;
}
export async function closeCustomize(root: Root) {
  await root
    .getByRole('button', { name: 'Content inspector', exact: true })
    .click();
  const close = root.getByRole('button', {
    name: 'Close settings',
    exact: true,
  });
  if (await close.isVisible()) await close.click();
}
export async function openAdvancedDesign(root: Root) {
  const details = root.locator('details.advanced-design');
  if ((await details.getAttribute('open')) === null)
    await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
}
