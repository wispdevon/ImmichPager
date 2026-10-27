import { expect, test } from '@playwright/test';
import { openCustomize, openElementGroup } from './customize-helper';
import { confirmPublication } from './publication-helper';
import { applyTheme } from '../src/lib/themes';
import { parsePageInput } from '../src/lib/contracts';
import { photographyCollections } from '../src/lib/theme-collections';
const origin = 'http://127.0.0.1:3200';

test('footer defaults off, credits remain accessible and opting in publishes explicitly', async ({
  page,
  context,
}) => {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const theme = photographyCollections[0].themes[2].definition;
  const response = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: applyTheme(
      parsePageInput({
        title: 'Footer preferences',
        slug: 'footer-preferences',
        albumIds: [albums[0].id],
      }),
      theme,
    ),
  });
  expect(response.ok()).toBe(true);
  const record = await response.json();
  expect(record.clientUi.showFooter).toBe(false);
  expect(
    (
      await page.request.post(`/page/api/pages/${record.id}/publish`, {
        headers: { origin },
        data: { expectedDraftRevision: record.draftRevision },
      })
    ).ok(),
  ).toBe(true);
  const visitor = await context.newPage();
  await visitor.goto('/page/footer-preferences');
  await expect(visitor.locator('.ip-footer')).toHaveCount(0);
  const info = visitor.getByRole('button', { name: 'Page info', exact: true });
  await info.focus();
  await info.press('Enter');
  const dialog = visitor.getByRole('dialog', {
    name: 'Page info',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const bounds = (await dialog.boundingBox())!;
  const viewport = await visitor.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: innerHeight,
  }));
  expect(
    Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2),
  ).toBeLessThan(2);
  expect(
    Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2),
  ).toBeLessThan(2);
  await expect(
    dialog.getByRole('link', { name: 'Source & license', exact: true }),
  ).toBeVisible();
  await expect(dialog.locator('.theme-credit')).toContainText('AJ / HTML5 UP');
  await visitor.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(info).toBeFocused();
  await page.goto(`/page/manage/${record.id}`);
  await openCustomize(page, 'Elements');
  await openElementGroup(page, 'footer');
  const footer = page.getByRole('switch', { name: 'Show footer', exact: true });
  await expect(footer).not.toBeChecked();
  await expect(
    page.getByRole('switch', {
      name: 'Show ImmichPager branding',
      exact: true,
    }),
  ).toBeDisabled();
  await footer.click();
  await expect(
    page.frameLocator('[title="Live page canvas"]').locator('.ip-footer'),
  ).toBeVisible();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await visitor.reload();
  await expect(visitor.locator('.ip-footer')).toHaveCount(0);
  await confirmPublication(page, 'Update live page');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await visitor.reload();
  await expect(visitor.locator('.ip-footer')).toBeVisible();
  await expect(
    visitor.getByRole('button', { name: 'Page info', exact: true }),
  ).toHaveCount(0);
  await openCustomize(page, 'Elements');
  await openElementGroup(page, 'footer');
  await page
    .getByRole('button', { name: 'Reset Show footer to default', exact: true })
    .click();
  await expect(footer).not.toBeChecked();
  await expect(footer).toBeFocused();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await visitor.reload();
  await expect(visitor.locator('.ip-footer')).toBeVisible();
  await visitor.close();
});

for (const mode of ['dark', 'light'] as const)
  test(`Elements groups, icons, dependencies and resets stay usable on a ${mode} phone`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('immich-ui-theme', JSON.stringify(value)),
      mode,
    );
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/dev-login/alice');
    const record = await (
      await page.request.post('/page/api/pages', {
        headers: { origin },
        data: { title: 'Elements overview', slug: 'elements-overview-' + mode },
      })
    ).json();
    await page.goto(`/page/manage/${record.id}`);
    await openCustomize(page, 'Elements');
    const groups = page.locator('.elements-panel .design-group');
    await expect(groups.locator('.group-title')).toHaveText([
      'Header',
      'Browsing',
      'Albums',
      'Years',
      'Footer',
    ]);
    for (const summary of await groups.locator('summary').all()) {
      await expect(summary).toBeInViewport();
      await expect(summary.locator('svg').first()).toBeAttached();
    }
    expect(
      (await (await page.request.get(`/page/api/pages/${record.id}`)).json())
        .draftRevision,
    ).toBe(record.draftRevision);
    await openElementGroup(page, 'header');
    const title = page.getByRole('switch', { name: 'Show title', exact: true });
    await title.click();
    await page
      .getByRole('button', { name: 'Reset Show title to default', exact: true })
      .click();
    await expect(title).toBeChecked();
    await expect(title).toBeFocused();
    await openElementGroup(page, 'browsing');
    const search = page.getByRole('switch', {
      name: 'Show album search',
      exact: true,
    });
    await expect(search).toBeDisabled();
    await page
      .getByRole('switch', { name: 'Show browsing controls', exact: true })
      .click();
    await expect(search).toBeEnabled();
    await openElementGroup(page, 'years');
    await page
      .getByRole('switch', { name: 'Show year headings', exact: true })
      .click();
    await expect(
      page.getByRole('switch', {
        name: 'Allow year groups to collapse',
        exact: true,
      }),
    ).toBeDisabled();
    await page.getByRole('tab', { name: 'Themes', exact: true }).click();
    await page.getByRole('tab', { name: 'Elements', exact: true }).click();
    await expect(
      page.locator('[data-design-group="elements-browsing"]'),
    ).toHaveAttribute('open', '');
    await expect(
      page.locator('.elements-panel .element-label svg'),
    ).toHaveCount(20);
    expect(
      await page
        .locator('.elements-panel')
        .evaluate((n) => n.scrollWidth <= n.clientWidth),
    ).toBe(true);
    await expect(page.getByTestId('save-state')).toHaveText(
      'All changes saved',
    );
    const saved = await (
      await page.request.get(`/page/api/pages/${record.id}`)
    ).json();
    expect(saved.title).toBe('Elements overview');
    expect(saved.clientUi.showFooter).toBe(false);
  });
