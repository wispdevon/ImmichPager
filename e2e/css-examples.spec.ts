import { expect, test } from '@playwright/test';
import { closeCustomize, openCustomize } from './customize-helper';
import { confirmPublication } from './publication-helper';

for (const width of [1440, 390]) {
  test(`CSS examples preserve authored styles and preview privately at ${width}px`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dev-login/alice');
    const albums = await (await page.request.get('/page/api/albums')).json();
    const authored = '.ip-title { letter-spacing: 0.02em; }';
    const slug = `css-examples-${width}`;
    const response = await page.request.post('/page/api/pages', {
      headers: { origin: 'http://127.0.0.1:3200' },
      data: {
        title: 'CSS examples',
        description: 'Photography for every chapter.',
        slug,
        albumIds: [albums[0].id],
        customCss: authored,
      },
    });
    expect(response.ok()).toBe(true);
    const record = await response.json();
    const readDraft = async () =>
      (await page.request.get(`/page/api/pages/${record.id}`)).json();
    await page.goto(`/page/manage/${record.id}`);
    await confirmPublication(page, 'Publish page');
    await expect(
      page.getByText('Page published. Your client link is ready.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByTestId('save-state')).toHaveText(
      'All changes saved',
    );
    const visitor = await browser.newContext({
      baseURL: 'http://127.0.0.1:3200',
    });
    const publicPage = await visitor.newPage();
    await publicPage.goto(`/page/${slug}`);
    const originalBackground = await publicPage
      .locator('.ip-gallery')
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    const before = await readDraft();
    await openCustomize(page, 'CSS');
    await page
      .getByRole('button', { name: 'CSS example', exact: true })
      .click();
    await page
      .getByRole('option', {
        name: 'Palette · Charcoal and sea glass',
        exact: true,
      })
      .click();
    await page.getByText('View example CSS', { exact: true }).click();
    const snippet = page.getByRole('region', { name: 'Selected CSS example' });
    await expect(snippet).toContainText('--pager-background: #15191c');
    await snippet.focus();
    await expect(snippet).toBeFocused();
    expect((await readDraft()).revision).toBe(before.revision);
    await expect(page.getByLabel('Custom CSS', { exact: true })).toHaveText(
      authored,
    );
    expect(
      await page
        .locator('.css-panel')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Insert example', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({
        hasText: 'Charcoal and sea glass added to the end of your CSS.',
      }),
    ).toBeVisible();
    await expect
      .poll(async () => (await readDraft()).customCss)
      .toContain(`${authored}\n\n/* Charcoal and sea glass */`);
    const gallery = page.frameLocator(
      '[data-testid="responsive-preview-frame"]',
    );
    await expect(gallery.locator('.ip-gallery')).toHaveCSS(
      'background-color',
      'rgb(21, 25, 28)',
    );
    await publicPage.reload();
    await expect(publicPage.locator('.ip-gallery')).toHaveCSS(
      'background-color',
      originalBackground,
    );
    await closeCustomize(page);
    await confirmPublication(page, 'Update live page');
    await expect(
      page.getByText('Page published. Your client link is ready.', {
        exact: true,
      }),
    ).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.locator('.ip-gallery')).toHaveCSS(
      'background-color',
      'rgb(21, 25, 28)',
    );

    if (width === 1440) {
      await openCustomize(page, 'CSS');
      await page
        .getByRole('button', { name: 'CSS example', exact: true })
        .click();
      await page
        .getByRole('option', {
          name: 'Motion · Gentle album lift',
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'Insert example', exact: true })
        .click();
      await expect
        .poll(async () => (await readDraft()).customCss)
        .toContain('/* Gentle album lift */');
      await closeCustomize(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const album = gallery.locator('.ip-album').first();
      await album.hover();
      await expect(album).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -3)');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(album).toHaveCSS('transform', 'none');
      await openCustomize(page, 'CSS');
      await page
        .getByRole('button', { name: 'CSS example', exact: true })
        .click();
      await page
        .getByRole('option', {
          name: 'Typography · Editorial title',
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'Insert example', exact: true })
        .click();
      await expect(gallery.locator('.ip-title')).toHaveCSS(
        'font-weight',
        '400',
      );
      await expect(gallery.locator('.ip-description')).toHaveCSS(
        'line-height',
        '30.6px',
      );
      await page
        .getByRole('button', { name: 'CSS example', exact: true })
        .click();
      await page
        .getByRole('option', { name: 'Typography · Fluid title', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Insert example', exact: true })
        .click();
      const expectedSize = await gallery
        .locator('html')
        .evaluate(() => Math.min(64, Math.max(32, 20 + innerWidth * 0.03)));
      await expect
        .poll(async () =>
          parseFloat(
            await gallery
              .locator('.ip-title')
              .evaluate((element) => getComputedStyle(element).fontSize),
          ),
        )
        .toBeCloseTo(expectedSize, 1);
    }
    await visitor.close();
  });
}
