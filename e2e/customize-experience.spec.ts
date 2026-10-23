import { expect, test } from '@playwright/test';
import {
  closeCustomize,
  openCustomize,
  openAdvancedDesign,
} from './customize-helper';

async function createDraft(
  page: import('@playwright/test').Page,
  slug: string,
) {
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers: { origin: 'http://127.0.0.1:3200' },
    data: {
      title: 'Customize interaction test',
      slug,
      background: '#ffffff',
      foreground: '#111111',
    },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

test('acknowledged draft saves refresh the preview without moving settings focus', async ({
  page,
}) => {
  const record = await createDraft(page, 'customize-focus-ack');
  await page.goto('/page/manage/' + record.id);
  await openCustomize(page);
  await openAdvancedDesign(page);

  const frame = page.getByTestId('responsive-preview-frame');
  const before = await frame.getAttribute('src');
  const titleWeight = page.getByRole('slider', {
    name: 'Title weight',
    exact: true,
  });
  const initialValue = Number(await titleWeight.inputValue());
  await titleWeight.focus();
  await page.keyboard.press('ArrowRight');

  await expect(titleWeight).toHaveValue(String(initialValue + 50));
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(frame).toHaveAttribute('src', before!);
  await expect(
    page
      .frameLocator('[data-testid="responsive-preview-frame"]')
      .locator('.ip-title'),
  ).toHaveCSS('font-weight', String(initialValue + 50));
  await expect(titleWeight).toBeFocused();
  await closeCustomize(page);
});

test('Immich selects support pointer and keyboard input in Customize', async ({
  page,
}) => {
  const record = await createDraft(page, 'customize-select-input');
  await page.goto('/page/manage/' + record.id);
  const dialog = await openCustomize(page);
  await openAdvancedDesign(page);
  const layout = dialog.getByRole('button', {
    name: 'Header layout',
    exact: true,
  });

  await layout.click();
  await expect(
    page.getByRole('option', { name: 'Over banner', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('option', { name: 'Over banner', exact: true }),
  ).toHaveCount(0);
  await expect(dialog).toBeVisible();

  await layout.click();
  await page.getByRole('option', { name: 'Over banner', exact: true }).click();
  await expect(layout).toContainText('Over banner');

  const size = dialog.getByRole('button', {
    name: 'Header size',
    exact: true,
  });
  await size.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(size).toContainText('Tall');

  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await closeCustomize(page);
});

test('failed saves keep edits visible and can be retried', async ({ page }) => {
  const record = await createDraft(page, 'customize-save-failure');
  await page.goto('/page/manage/' + record.id);
  await openCustomize(page);
  await openAdvancedDesign(page);

  await page.route('**/page/api/pages/' + record.id, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Draft save is temporarily unavailable.',
      }),
    });
  });

  const titleWeight = page.getByRole('slider', {
    name: 'Title weight',
    exact: true,
  });
  const changedWeight = Number(await titleWeight.inputValue()) + 50;
  await titleWeight.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('save-state')).toHaveText(
    'Couldn’t save draft',
  );
  await expect(page.getByRole('alert')).toContainText(
    'Draft save is temporarily unavailable',
  );
  await expect(titleWeight).toHaveValue(String(changedWeight));
  await expect(titleWeight).toBeFocused();

  await page.unroute('**/page/api/pages/' + record.id);
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(titleWeight).toHaveValue(String(changedWeight));
  const saved = await (
    await page.request.get('/page/api/pages/' + record.id)
  ).json();
  expect(saved.galleryStyle.titleFontWeight).toBe(changedWeight);
  await closeCustomize(page);
});

test('phone inspector keeps the live canvas and CSS editing reachable with focus restoration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const record = await createDraft(page, 'customize-phone-preview');
  await page.goto('/page/manage/' + record.id);
  const dialog = await openCustomize(page);
  const panel = dialog.locator('.customize-panel');
  const frame = dialog.getByTestId('responsive-preview-frame');
  await expect(panel).toBeVisible();
  await expect(dialog.locator('.cm-editor')).toHaveCount(0);
  await expect(
    page.getByRole('dialog', { name: 'Page inspector' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await expect(frame).toBeVisible();
  await openCustomize(page);
  await dialog.getByRole('tab', { name: 'CSS', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 600 });
  const editor = dialog.getByLabel('Custom CSS', { exact: true });
  await expect(dialog.locator('.cm-editor')).toBeVisible();
  const panelFooter = dialog.locator('.panel-footer');
  const closeButton = dialog.getByRole('button', { name: 'Close settings' });
  await expect(closeButton).toBeInViewport();
  await expect(closeButton).toBeInViewport();
  await dialog.locator('.css-panel').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(closeButton).toBeInViewport();
  await expect(closeButton).toBeInViewport();
  expect(
    await panelFooter.evaluate((element) =>
      Math.round(element.getBoundingClientRect().bottom),
    ),
  ).toBeLessThanOrEqual(600);
  await editor.fill('.ip-title { color: red; } }');
  await expect(dialog.locator('#css-feedback')).toHaveAttribute(
    'role',
    'alert',
  );
  await expect(editor).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.locator('#css-count')).toContainText(
    '.ip-title { color: red; } }'.length.toString(),
  );
  await dialog.getByRole('button', { name: 'Clear custom CSS' }).click();
  await expect(editor).toHaveText('');
  await expect(dialog.locator('#css-count')).toContainText('0 / 20,000');
  await expect(dialog.locator('#css-feedback')).not.toHaveAttribute(
    'role',
    'alert',
  );
  await expect(editor).toHaveAttribute('aria-invalid', 'false');

  await dialog.getByRole('tab', { name: 'Design', exact: true }).click();
  await dialog.getByLabel('Accent color').fill('#ff0000');
  await dialog.getByRole('button', { name: 'Reset colors' }).click();
  await expect(dialog.getByLabel('Background color')).toHaveValue('#000000');
  await expect(dialog.getByLabel('Text color')).toHaveValue('#e5e7eb');
  await expect(dialog.getByLabel('Accent color')).toHaveValue('#accbfa');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Page inspector' }),
  ).toHaveCount(0);
  await expect(page.locator('.mobile-settings')).toBeFocused();
});

test('element controls let hidden album sections be configured while enforcing a visible album label', async ({
  page,
}) => {
  const record = await createDraft(page, 'customize-elements-guard');
  await page.goto('/page/manage/' + record.id);
  const dialog = await openCustomize(page, 'Elements');
  const albums = dialog.getByRole('switch', { name: 'Show albums' });
  const covers = dialog.getByRole('switch', { name: 'Show album covers' });
  const names = dialog.getByRole('switch', { name: 'Show album names' });
  const yearHeadings = dialog.getByRole('switch', {
    name: 'Show year headings',
  });
  const yearCounts = dialog.getByRole('switch', { name: 'Show year counts' });

  await expect(covers).toBeEnabled();
  await covers.click();
  await expect(names).toBeDisabled();
  await albums.click();
  await expect(names).toBeEnabled();
  await names.click();
  await expect(albums).toBeDisabled();
  await covers.click();
  await expect(albums).toBeEnabled();
  await albums.click();
  await expect(albums).toBeChecked();

  await yearHeadings.click();
  await expect(yearCounts).toBeEnabled();
  await yearCounts.click();
  await expect(yearCounts).not.toBeChecked();
  await yearHeadings.click();

  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await closeCustomize(page);
});
