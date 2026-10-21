import { test, expect } from '@playwright/test';

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
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Banner preview')).toBeVisible();
  await page
    .getByLabel('Logo', { exact: true })
    .setInputFiles('fixtures/photos/earthrise.webp');
  await expect(page.getByAltText('Logo preview')).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page
    .getByRole('button', { name: 'Header layout', exact: true })
    .click();
  await page.getByRole('option', { name: 'Over banner', exact: true }).click();
  await page
    .getByRole('button', { name: 'Header alignment', exact: true })
    .click();
  await page.getByRole('option', { name: 'Centered', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const defaultAppearance = await page
    .locator('.ip-gallery')
    .evaluate((root) => {
      const style = getComputedStyle(root);
      const logo = root.querySelector('.ip-logo');
      return {
        headerSize:
          root.classList.contains('header-compact') ||
          root.classList.contains('header-tall'),
        logoSize: style.getPropertyValue('--logo-size').trim(),
        logoWidth: logo && getComputedStyle(logo).width,
        titleFont: getComputedStyle(root.querySelector('.ip-title')!)
          .fontFamily,
      };
    });
  expect(defaultAppearance).toMatchObject({
    headerSize: false,
    logoSize: '80px',
    logoWidth: '80px',
  });
  expect(defaultAppearance.titleFont).toContain('GoogleSans');
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('button', { name: 'Header size', exact: true }).click();
  await page.getByRole('option', { name: 'Tall', exact: true }).click();
  await page.getByRole('slider', { name: 'Logo size' }).press('ArrowRight');
  await page.getByText('Advanced · Custom CSS', { exact: true }).click();
  const source =
    ':scope { --pager-accent: #ff6600; } .ip-title { color: rgb(240, 182, 127) !important; font-family: Georgia, serif; } .ip-cover { border-radius: 4px; } @media (max-width:600px) { .ip-title { font-size: 38px !important; } }';
  await page.getByLabel('Custom CSS', { exact: true }).fill(source);
  await expect(page.locator('#css-feedback')).toContainText('Use Preview');
  await page.screenshot({
    path: 'test-results/custom-css.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.reload();
  const anonymous = await browser.newContext();
  expect(
    (await anonymous.request.get('/page/banner-composition')).status(),
  ).toBe(404);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(240, 182, 127)',
  );
  await expect(page.locator('.ip-gallery')).toHaveClass(/overlay/);
  await expect(page.locator('.ip-header')).toHaveClass(/centered/);
  await expect(page.locator('.ip-gallery')).toHaveClass(/header-tall/);
  await expect(page.locator('.ip-logo')).toBeVisible();
  await expect(page.locator('.ip-logo')).toHaveCSS('width', '88px');
  await expect(page.locator('.ip-description')).toHaveText(
    'Monthly photography Made for our client.',
  );
  await page.screenshot({
    path: 'test-results/banner-overlay.png',
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.ip-title')).toHaveCSS('font-size', '38px');
  const boxes = await Promise.all([
    page.locator('.ip-hero').boundingBox(),
    page.locator('.ip-header').boundingBox(),
  ]);
  expect(boxes[1]!.y).toBeGreaterThanOrEqual(boxes[0]!.y);
  expect(boxes[1]!.y + boxes[1]!.height).toBeLessThanOrEqual(
    boxes[0]!.y + boxes[0]!.height + 1,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/banner-overlay-mobile.png',
    fullPage: false,
  });
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Page published');
  const client = await anonymous.newPage();
  await client.goto('/page/banner-composition');
  await expect(client.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(240, 182, 127)',
  );
  await expect(client.locator('.ip-gallery')).toHaveClass(/overlay/);
  await expect(client.locator('.ip-gallery')).toHaveClass(/header-tall/);
  await expect(client.locator('.ip-logo')).toHaveCSS('width', '88px');
  // CSS remains a working change until explicit publication, even when invalid.
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByText('Advanced · Custom CSS', { exact: true }).click();
  await page
    .getByLabel('Custom CSS', { exact: true })
    .fill('@import "https://example.com/style.css";');
  await expect(page.locator('#css-feedback')).toContainText('Only @media');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Custom CSS');
  await client.reload();
  await expect(client.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(240, 182, 127)',
  );
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByText('Advanced · Custom CSS', { exact: true }).click();
  await page.getByRole('button', { name: 'Clear custom CSS' }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Page published');
  await client.reload();
  await expect(client.locator('.ip-title')).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
  await anonymous.close();
  expect(errors).toEqual([]);
});

test('CSS cannot style editor siblings, escape paint containment, or inject HTML', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  await page.getByLabel('Title', { exact: true }).fill('CSS containment');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page
    .getByRole('button', { name: 'Header layout', exact: true })
    .click();
  await page.getByRole('option', { name: 'Over banner', exact: true }).click();
  await expect(
    page.getByText(
      'Add a banner to place your logo, title and description over it.',
    ),
  ).toBeVisible();
  await page.getByText('Advanced · Custom CSS', { exact: true }).click();
  await page
    .getByLabel('Custom CSS', { exact: true })
    .fill(
      'body, button, :scope + .preview-toolbar { display: none !important; } .ip-title::after { content: "</style><img src=x onerror=alert(1)>"; position: fixed; inset: 0; z-index: 9999999; background: red; }',
    );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Back to editor' }),
  ).toBeVisible();
  await expect(page.locator('.ip-gallery')).not.toHaveClass(/overlay/);
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  const button = page.getByRole('button', { name: 'Back to editor' });
  const rect = await button.boundingBox();
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest('button')
          ?.textContent?.includes('Back to editor'),
      { x: rect!.x + 12, y: rect!.y + 12 },
    ),
  ).toBe(true);
  await button.click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'CSS containment',
  );
  expect(errors).toEqual([]);
});
