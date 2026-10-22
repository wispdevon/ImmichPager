import { expect, test } from '@playwright/test';
import {
  openCustomize,
  openAdvancedDesign,
  closeCustomize,
} from './customize-helper';

test('Design starts with visual presets and everyday controls, keeping fine controls last', async ({
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
  const advanced = dialog.locator('details.advanced-design');
  await expect(advanced).not.toHaveAttribute('open');
  await expect(
    dialog.getByRole('slider', { name: 'Title weight', exact: true }),
  ).toBeHidden();
  await expect(
    dialog.getByRole('button', { name: 'Logo shape', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Font family', exact: true }),
  ).toBeVisible();
  expect(
    await dialog
      .locator('.design-panel > :last-child')
      .evaluate((element) => element.tagName),
  ).toBe('DETAILS');
  const presets = dialog.getByRole('list', { name: 'Header presets' });
  await expect(presets.getByRole('button')).toHaveCount(3);
  const centered = presets.getByRole('button', { name: /^Centered:/ });
  await centered.focus();
  await page.keyboard.press('Enter');
  await expect(centered).toHaveAttribute('aria-pressed', 'true');
  await expect(presets.getByRole('button', { pressed: true })).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Logo shape', exact: true }).click();
  await page.getByRole('option', { name: 'Circle', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Logo position', exact: true })
    .click();
  await page
    .getByRole('option', { name: 'Left of title', exact: true })
    .click();
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
  ]) {
    await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('option', { name: 'Inter', exact: true }).click();

  await openAdvancedDesign(page);
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
  await closeCustomize(page);

  await page.setViewportSize({ width: 390, height: 844 });
  dialog = await openCustomize(page);
  await expect(dialog.locator('details.advanced-design')).not.toHaveAttribute(
    'open',
  );
  const thumbnails = dialog.getByRole('list', { name: 'Header presets' });
  await expect(thumbnails).toBeInViewport();
  expect(
    await thumbnails.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await thumbnails.getByRole('button', { name: /^Classic:/ }).click();
  await expect(
    thumbnails.getByRole('button', { name: /^Classic:/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await dialog.screenshot({
    path: 'test-results/design-refinements-phone.png',
  });
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
