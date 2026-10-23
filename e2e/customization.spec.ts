import { openHeader } from './composer-helper';
import { test, expect } from '@playwright/test';
import { setHeaderText } from './header-editor';
import { confirmPublication } from './publication-helper';
import {
  closeCustomize,
  openCustomize,
  openAdvancedDesign,
} from './customize-helper';

test('banner composition and scoped CSS autosave privately, preview and publish', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Every chapter of our work together',
      slug: 'banner-composition',
      description: 'Monthly photography\nMade for our client.',
      albumIds: [albums[0].id],
    },
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  await page.goto(`/page/manage/${record.id}`);
  await openHeader(page);
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Banner preview')).toBeVisible();
  await openHeader(page);
  await page
    .getByLabel('Logo', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Logo preview')).toBeVisible();
  await openCustomize(page);
  await openAdvancedDesign(page);
  await page
    .getByRole('button', { name: 'Header layout', exact: true })
    .click();
  await page.getByRole('option', { name: 'Over banner', exact: true }).click();
  await page
    .getByRole('button', { name: 'Header alignment', exact: true })
    .click();
  await page.getByRole('option', { name: 'Centered', exact: true }).click();
  await closeCustomize(page);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  let gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');
  const defaultAppearance = await gallery
    .locator('.ip-gallery')
    .evaluate((root) => {
      const style = getComputedStyle(root);
      const logo = root.querySelector('.ip-logo');
      const description = root.querySelector('.ip-description');
      const title = root.querySelector('.ip-title');
      return {
        headerSize:
          root.classList.contains('header-compact') ||
          root.classList.contains('header-tall'),
        logoSize: style.getPropertyValue('--logo-size').trim(),
        pagerLogoSize: style.getPropertyValue('--pager-logo-size').trim(),
        logoWidth: logo && getComputedStyle(logo).width,
        titleSize: style.getPropertyValue('--title-max-size').trim(),
        pagerTitleSize: style.getPropertyValue('--pager-title-size').trim(),
        spacing: style.getPropertyValue('--header-spacing').trim(),
        pagerSpacing: style.getPropertyValue('--pager-header-spacing').trim(),
        descriptionSize: description && getComputedStyle(description).fontSize,
        titleFont: title && getComputedStyle(title).fontFamily,
      };
    });
  expect(defaultAppearance).toMatchObject({
    headerSize: false,
    logoSize: '80px',
    pagerLogoSize: '80px',
    logoWidth: '80px',
    titleSize: '3rem',
    pagerTitleSize: '3rem',
    spacing: '2.5rem',
    pagerSpacing: '2.5rem',
    descriptionSize: '18px',
  });
  expect(defaultAppearance.titleFont).toContain('GoogleSans');
  await page.getByRole('button', { name: 'Phone canvas' }).click();
  await expect(gallery.locator('.ip-title')).toHaveCSS('font-size', '30px');
  await page.getByRole('button', { name: 'Desktop canvas' }).click();
  await closeCustomize(page);
  await openCustomize(page);
  await openAdvancedDesign(page);
  await page.getByRole('button', { name: 'Header size', exact: true }).click();
  await page.getByRole('option', { name: 'Tall', exact: true }).click();
  await page.getByRole('slider', { name: 'Logo size' }).press('ArrowRight');
  await page
    .getByRole('slider', { name: 'Title size', exact: true })
    .press('End');
  await page
    .getByRole('slider', { name: 'Description size' })
    .press('ArrowRight');
  await page
    .getByRole('slider', { name: 'Header spacing' })
    .press('ArrowRight');
  await closeCustomize(page);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--title-max-size',
    '4rem',
  );
  await page.getByRole('button', { name: 'Phone canvas' }).click();
  await expect(gallery.locator('.ip-title')).toHaveCSS('font-size', '40px');
  await closeCustomize(page);
  await openCustomize(page, 'CSS');
  const source =
    ':scope { --pager-accent: #ff6600; } .ip-title { color: rgb(240, 182, 127) !important; font-family: Georgia, serif; } .ip-cover { border-radius: 4px; } @media (max-width:600px) { .ip-title { color: rgb(30, 200, 120) !important; } }';
  await page.getByLabel('Custom CSS', { exact: true }).fill(source);
  await expect(page.locator('#css-feedback')).toContainText(
    'External resources',
  );
  await page.screenshot({
    path: 'test-results/custom-css.png',
    fullPage: true,
  });
  await closeCustomize(page);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.reload();
  const anonymous = await browser.newContext();
  expect(
    (await anonymous.request.get('/page/banner-composition')).status(),
  ).toBe(404);

  gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(gallery.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(240, 182, 127)',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveClass(/overlay/);
  await expect(gallery.locator('.ip-header')).toHaveClass(/centered/);
  await expect(gallery.locator('.ip-gallery')).toHaveClass(/header-tall/);
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--title-max-size',
    '4rem',
  );
  await expect(gallery.locator('.ip-description')).toHaveCSS(
    'font-size',
    '19px',
  );
  await expect(gallery.locator('.ip-header')).toHaveCSS(
    'padding-bottom',
    '44px',
  );
  await expect(gallery.locator('.ip-logo')).toBeVisible();
  await expect(gallery.locator('.ip-logo')).toHaveCSS('width', '88px');
  await expect(gallery.locator('.ip-description')).toHaveText(
    'Monthly photography Made for our client.',
  );
  await page.screenshot({
    path: 'test-results/banner-overlay.png',
    fullPage: false,
  });
  await page.getByRole('button', { name: 'Phone canvas' }).click();
  await expect(gallery.locator('.ip-title')).toHaveCSS('font-size', '40px');
  await expect(gallery.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(30, 200, 120)',
  );
  await expect(gallery.locator('.ip-header')).toHaveCSS(
    'padding-bottom',
    '35.2px',
  );
  const boxes = await Promise.all([
    gallery.locator('.ip-hero').boundingBox(),
    gallery.locator('.ip-header').boundingBox(),
  ]);
  expect(boxes[1]!.y).toBeGreaterThanOrEqual(boxes[0]!.y);
  expect(boxes[1]!.y + boxes[1]!.height).toBeLessThanOrEqual(
    boxes[0]!.y + boxes[0]!.height + 1,
  );
  expect(
    await gallery
      .locator('html')
      .evaluate((documentRoot) => documentRoot.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/banner-overlay-mobile.png',
    fullPage: false,
  });
  await closeCustomize(page);
  await confirmPublication(page, 'Publish page');
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'Page published',
  );
  const client = await anonymous.newPage();
  await client.goto('/page/banner-composition');
  await expect(client.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(240, 182, 127)',
  );
  await expect(client.locator('.ip-gallery')).toHaveClass(/overlay/);
  await expect(client.locator('.ip-gallery')).toHaveClass(/header-tall/);
  await expect(client.locator('.ip-logo')).toHaveCSS('width', '88px');
  await expect(client.locator('.ip-gallery')).toHaveCSS(
    '--title-max-size',
    '4rem',
  );
  await expect(client.locator('.ip-description')).toHaveCSS(
    'font-size',
    '19px',
  );
  await expect(client.locator('.ip-header')).toHaveCSS(
    'padding-bottom',
    '44px',
  );
  // CSS remains a working change until explicit publication, even when invalid.
  await openCustomize(page, 'CSS');
  await page
    .getByLabel('Custom CSS', { exact: true })
    .fill('@import "https://example.com/style.css";');
  await expect(page.locator('#css-feedback')).toContainText('Only @media');
  await closeCustomize(page);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await confirmPublication(page, 'Update live page');
  await expect(page.getByRole('alert')).toContainText('Custom CSS');
  await page
    .getByRole('dialog', { name: 'Review publication' })
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await client.reload();
  await expect(client.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(240, 182, 127)',
  );
  await openCustomize(page, 'CSS');
  await page.getByRole('button', { name: 'Clear custom CSS' }).click();
  await closeCustomize(page);
  await confirmPublication(page, 'Update live page');
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'Page published',
  );
  await client.reload();
  await expect(client.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
  await anonymous.close();
  expect(errors).toEqual([]);
});

test('header presets stay per-page and private until publication', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Client story',
      slug: 'header-preset-private',
      description: 'A page description that stays as written.',
      theme: 'light',
      background: '#112233',
      foreground: '#f0f0f0',
      accent: '#123abc',
      bannerPosition: 22,
      customCss: ':scope { --pager-accent: #ff6633; }',
      albumIds: [albums[0].id],
      order: 'manual',
    },
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  await page.goto(`/page/manage/${record.id}`);
  await openHeader(page);
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Banner preview')).toBeVisible();
  await openHeader(page);
  await page
    .getByLabel('Logo', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Logo preview')).toBeVisible();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await confirmPublication(page, 'Publish page');
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'Page published',
  );

  const liveContext = await browser.newContext();
  const live = await liveContext.newPage();
  await live.goto('/page/header-preset-private');
  await expect(live.locator('.ip-gallery')).not.toHaveClass(/overlay/);
  await expect(live.locator('.ip-gallery')).not.toHaveClass(/header-tall/);
  await expect(live.locator('.ip-gallery')).toHaveCSS(
    '--title-max-size',
    '3rem',
  );
  await expect(live.locator('.ip-logo')).toHaveCSS('width', '80px');

  await openCustomize(page);
  await openAdvancedDesign(page);
  await page.getByRole('button', { name: /^Editorial/ }).click();
  await closeCustomize(page);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.reload();

  const gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');

  await expect(gallery.locator('.ip-gallery')).toHaveClass(/overlay/);
  await expect(gallery.locator('.ip-gallery')).toHaveClass(/header-tall/);
  await expect(gallery.locator('.ip-header')).toHaveClass(/centered/);
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--logo-size',
    '112px',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--pager-logo-size',
    '112px',
  );
  await expect(gallery.locator('.ip-logo')).toHaveCSS('width', '112px');
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--title-max-size',
    '3.5rem',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--pager-title-size',
    '3.5rem',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--description-size',
    '1.25rem',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--header-spacing',
    '3.5rem',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--pager-header-spacing',
    '3.5rem',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveClass(/light/);
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--custom-bg',
    '#112233',
  );
  await expect(gallery.locator('.ip-title')).toHaveText('Client story');
  await expect(gallery.locator('.ip-description')).toHaveText(
    'A page description that stays as written.',
  );
  await expect(gallery.locator('.ip-album')).toHaveCount(1);
  expect(
    await gallery
      .locator('.ip-banner img')
      .evaluate((image) => getComputedStyle(image).objectPosition),
  ).toBe('50% 22%');
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    '--pager-accent',
    '#ff6633',
  );
  await page.screenshot({
    path: 'test-results/header-preset-preview.png',
    fullPage: false,
  });

  await live.reload();
  await expect(live.locator('.ip-gallery')).not.toHaveClass(/overlay/);
  await expect(live.locator('.ip-gallery')).not.toHaveClass(/header-tall/);
  await expect(live.locator('.ip-gallery')).toHaveCSS(
    '--title-max-size',
    '3rem',
  );
  await expect(live.locator('.ip-logo')).toHaveCSS('width', '80px');
  await liveContext.close();
  await page.request.delete(`/page/api/pages/${record.id}`, { headers });
});

test('CSS cannot style editor siblings, escape paint containment, or inject HTML', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await setHeaderText(page, 'Title', 'CSS containment');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await openCustomize(page);
  await openAdvancedDesign(page);
  await page
    .getByRole('button', { name: 'Header layout', exact: true })
    .click();
  await page.getByRole('option', { name: 'Over banner', exact: true }).click();
  await expect(
    page.getByText(
      'Add a banner to place your logo, title, and description over it.',
    ),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'CSS', exact: true }).click();
  await page
    .getByLabel('Custom CSS', { exact: true })
    .fill(
      'body, button, :scope + .preview-toolbar { display: none !important; } .ip-title::after { content: "</style><img src=x onerror=alert(1)>"; position: fixed; inset: 0; z-index: 9999999; background: red; }',
    );
  await closeCustomize(page);

  await expect(
    page.getByRole('button', { name: '← Pages', exact: true }),
  ).toBeVisible();
  const gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(gallery.locator('.ip-gallery')).not.toHaveClass(/overlay/);
  expect(await gallery.locator('img[src="x"]').count()).toBe(0);
  const button = page.getByRole('button', { name: '← Pages', exact: true });
  const rect = await button.boundingBox();
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest('button')
          ?.textContent?.includes('Pages'),
      { x: rect!.x + 12, y: rect!.y + 12 },
    ),
  ).toBe(true);
  await button.focus();
  await expect(button).toBeFocused();
  await expect(
    page
      .frameLocator('[title="Live page canvas"]')
      .getByRole('button', { name: 'Edit title, CSS containment' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('long header text, missing images, themes, and keyboard controls stay usable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const title = 'T'.repeat(160);
  const description = 'D'.repeat(2000);
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title,
      slug: 'customization-release-check',
      description,
      albumIds: [albums[0].id],
      headerLayout: 'overlay',
      theme: 'dark',
    },
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  await page.route(
    `**/page/media/${record.id}/album/${albums[0].id}*`,
    (route) => route.abort(),
  );
  await page.goto(`/page/manage/${record.id}`);

  await page.getByRole('button', { name: 'Phone canvas', exact: true }).focus();
  await page.keyboard.press('Enter');
  const gallery = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await page.getByRole('button', { name: 'Phone canvas' }).click();
  await expect(gallery.locator('.ip-gallery')).toBeVisible();
  await expect(gallery.locator('.ip-gallery')).not.toHaveClass(/overlay/);
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    'color',
    'rgb(245, 245, 245)',
  );
  await expect(gallery.locator('.ip-title')).toContainText(title);
  await expect(gallery.locator('.ip-description')).toContainText(description);
  await expect(gallery.locator('.ip-logo, .ip-banner img')).toHaveCount(0);
  await expect(gallery.locator('.ip-cover .placeholder')).toBeVisible();
  expect(
    await gallery
      .locator('.ip-description')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await gallery
      .locator('html')
      .evaluate((documentRoot) => documentRoot.scrollWidth <= innerWidth),
  ).toBe(true);

  await openCustomize(page);
  const design = page.getByRole('tab', { name: 'Design', exact: true });
  await design.focus();
  await design.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Elements', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Page inspector' }),
  ).toHaveCount(0);
  await openCustomize(page);
  await openAdvancedDesign(page);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByRole('option', { name: 'Light', exact: true }).click();
  await closeCustomize(page);
  await page.getByRole('button', { name: 'Phone canvas' }).click();
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(gallery.locator('.ip-gallery')).toHaveCSS(
    'color',
    'rgb(25, 25, 25)',
  );
  await page.screenshot({
    path: 'test-results/customization-release-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
