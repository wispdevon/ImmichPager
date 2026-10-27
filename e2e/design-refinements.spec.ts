import { expect, test } from '@playwright/test';
import {
  openCustomize,
  openDesignGroup,
  closeCustomize,
} from './customize-helper';

test('Design groups related controls, preserves disclosure state and keeps mobile settings reachable', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers: { origin: 'http://127.0.0.1:3200' },
    data: { title: 'Design refinements', slug: 'design-refinements' },
  });
  expect(response.ok()).toBe(true);
  const record = await response.json();
  await page.goto(`/page/manage/${record.id}`);
  let dialog = await openCustomize(page);
  const groups = dialog.locator('details.design-group');
  await expect(groups.locator('.group-title')).toHaveText([
    'Header & banner',
    'Logo',
    'Typography',
    'Colors',
    'Gallery layout',
  ]);
  await expect(dialog.locator('details.design-group[open]')).toHaveCount(0);
  for (const summary of await groups.locator('summary').all())
    await expect(summary).toBeInViewport();
  const headerSummary = groups.first().locator('summary');
  await headerSummary.focus();
  await headerSummary.press('Enter');
  await expect(groups.first()).toHaveAttribute('open', '');
  await headerSummary.press('Space');
  await expect(groups.first()).not.toHaveAttribute('open');
  expect(
    (await (await page.request.get(`/page/api/pages/${record.id}`)).json())
      .draftRevision,
  ).toBe(record.draftRevision);
  await openDesignGroup(page, 'header');
  const presets = dialog.getByRole('list', { name: 'Header presets' });
  const centered = presets.getByRole('button', { name: /^Centered:/ });
  await centered.focus();
  await centered.press('Enter');
  await expect(centered).toHaveAttribute('aria-pressed', 'true');
  await openDesignGroup(page, 'logo');
  await dialog.getByRole('button', { name: 'Logo shape', exact: true }).click();
  await page.getByRole('option', { name: 'Circle', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Logo position', exact: true })
    .click();
  await page
    .getByRole('option', { name: 'Left of title', exact: true })
    .click();
  await openDesignGroup(page, 'typography');
  await dialog
    .getByRole('button', { name: 'Font family', exact: true })
    .click();
  for (const name of [
    'Inter',
    'Nunito Sans',
    'Lato',
    'Source Serif 4',
    'Merriweather',
    'JetBrains Mono',
  ])
    await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'Inter', exact: true }).click();
  await dialog
    .getByRole('slider', { name: 'Title size', exact: true })
    .press('ArrowRight');
  await expect(presets.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  const saved = await (
    await page.request.get(`/page/api/pages/${record.id}`)
  ).json();
  expect(saved.galleryStyle).toMatchObject({
    logoShape: 'circle',
    logoPosition: 'left',
    fontFamily: 'inter',
  });
  const typography = dialog.locator('[data-design-group="typography"]');
  await dialog
    .getByRole('button', { name: 'Change theme', exact: true })
    .click();
  await expect(
    dialog.getByRole('tab', { name: 'Themes', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await dialog.getByRole('tab', { name: 'Design', exact: true }).click();
  await expect(typography).toHaveAttribute('open', '');
  await closeCustomize(page);
  await page.setViewportSize({ width: 390, height: 844 });
  dialog = await openCustomize(page);
  for (const summary of await dialog.locator('.design-group summary').all())
    await expect(summary).toBeInViewport();
  await openDesignGroup(page, 'layout');
  const width = dialog.getByRole('slider', {
    name: 'Content width',
    exact: true,
  });
  await width.focus();
  await width.press('ArrowRight');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(width).toBeFocused();
  await dialog
    .getByRole('button', {
      name: 'Reset Content width to default',
      exact: true,
    })
    .click();
  await expect(width).toBeFocused();
  expect(
    await dialog
      .locator('.design-panel')
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
});

test('hidden header text remains editable without showing it in the client preview', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers: { origin: 'http://127.0.0.1:3200' },
    data: {
      title: 'Hidden header',
      slug: 'hidden-header-design',
      clientUi: { showTitle: false, showDescription: false },
    },
  });
  expect(response.ok()).toBe(true);
  const record = await response.json();
  await page.goto(`/page/manage/${record.id}`);
  const dialog = await openCustomize(page);
  await dialog
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Updated hidden title');
  await dialog
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Updated hidden description');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  const saved = await (
    await page.request.get(`/page/api/pages/${record.id}`)
  ).json();
  expect(saved.title).toBe('Updated hidden title');
  expect(saved.description).toBe('Updated hidden description');
  const preview = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(preview.locator('.ip-gallery')).toBeVisible();
  await expect(preview.locator('.ip-title')).toHaveCount(0);
  await expect(preview.locator('.ip-description')).toHaveCount(0);
});
