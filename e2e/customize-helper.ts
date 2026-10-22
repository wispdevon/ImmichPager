import { expect, type FrameLocator, type Page } from '@playwright/test';

type Root = Page | FrameLocator;

export async function openCustomize(
  root: Root,
  tab: 'Design' | 'Elements' | 'Themes' | 'CSS' = 'Design',
) {
  await root.getByRole('button', { name: 'Customize', exact: true }).click();
  const dialog = root.getByRole('dialog', { name: 'Customize', exact: true });
  await expect(dialog).toBeVisible();
  if (tab !== 'Design')
    await dialog.getByRole('tab', { name: tab, exact: true }).click();
  return dialog;
}

export async function closeCustomize(root: Root) {
  await root.getByRole('button', { name: /Back to editor/ }).click();
  await expect(
    root.getByRole('dialog', { name: 'Customize', exact: true }),
  ).toHaveCount(0);
}
