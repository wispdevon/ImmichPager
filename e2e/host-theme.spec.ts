import {
  expect,
  test,
  type FrameLocator,
  type Locator,
  type Page,
} from '@playwright/test';
import { closeCustomize, openCustomize } from './customize-helper';

const origin = 'http://127.0.0.1:3200';

async function setHostTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((value) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(value);
  }, theme);
}

async function closeMobileMenu(page: Page) {
  const menu = page.getByRole('button', { name: 'Main menu', exact: true });
  if (!(await menu.isVisible())) return;
  if ((await menu.getAttribute('aria-expanded')) === 'true') await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#sidebar')).toHaveAttribute('inert', '');
  await expect(page.locator('#sidebar')).toHaveCSS('width', '0px');
}

async function setPageTheme(
  management: FrameLocator,
  theme: 'light' | 'dark' | 'system',
) {
  await openCustomize(management, 'Design');
  await management
    .getByRole('button', { name: 'Appearance', exact: true })
    .click();
  await management
    .getByRole('option', { name: new RegExp(`^${theme}$`, 'i') })
    .click();
  await closeCustomize(management);
  await expect(management.getByTestId('save-state')).toHaveText(
    'All changes saved',
  );
}

async function galleryBackground(preview: FrameLocator) {
  return preview
    .locator('.ip-gallery')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function contrastAgainst(element: Locator, backgroundColor?: string) {
  return element.evaluate((node, overrideBackground) => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Canvas is unavailable for contrast check');
    const luminance = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      const channels = [red, green, blue].map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foreground = luminance(getComputedStyle(node).color);
    const background = luminance(
      overrideBackground ??
        getComputedStyle(document.documentElement).backgroundColor,
    );
    const lighter = Math.max(foreground, background);
    const darker = Math.min(foreground, background);
    return (lighter + 0.05) / (darker + 0.05);
  }, backgroundColor);
}

async function photoOverlayContrast(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    const channels = style.backgroundColor.match(/[\d.]+/g)?.map(Number);
    if (!channels || channels.length < 3)
      throw new Error(`Unexpected overlay: ${style.backgroundColor}`);
    const alpha = channels[3] ?? 1;
    const composite = channels
      .slice(0, 3)
      .map((channel) => channel * alpha + 255 * (1 - alpha));
    const linear = composite.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    const background =
      0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    const foreground = getComputedStyle(element).color;
    return {
      foreground,
      background: style.backgroundColor,
      contrast: 1.05 / (background + 0.05),
    };
  });
}

test('management iframe follows Immich themes while page themes stay independent', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const cspErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /content security policy|blocked by csp|refused to load script/i.test(
        message.text(),
      )
    )
      cspErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/dev-login/alice');
  const hostRoot = page.locator('html');
  await expect(hostRoot).toHaveClass(/\bdark\b/);
  await expect(hostRoot).not.toHaveClass(/\blight\b/);

  const albums = await (await page.request.get('/page/api/albums')).json();
  expect(albums.length).toBeGreaterThan(0);
  const created = await page.request.post('/page/api/pages', {
    headers: { origin },
    data: {
      title: 'Host theme parity QA',
      slug: 'host-theme-parity-qa',
      theme: 'dark',
      albumIds: [albums[0].id],
    },
  });
  expect(created.ok()).toBe(true);
  const draft = await created.json();
  const published = await page.request.post(
    `/page/api/pages/${draft.id}/publish`,
    {
      headers: { origin },
      data: { expectedDraftRevision: draft.draftRevision },
    },
  );
  expect(published.ok()).toBe(true);

  const initializer = await page.request.get('/page/assets/host-theme-init.js');
  expect(initializer.ok()).toBe(true);
  await expect(page.locator('[data-pager-link]')).toBeVisible();
  await page.locator('[data-pager-link]').click();
  const embeddedFrame = page.locator('iframe[title="Client pages"]');
  const management = page.frameLocator('iframe[title="Client pages"]');
  await expect(embeddedFrame).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const managementRoot = management.locator('html');
  await expect(managementRoot).toHaveAttribute('data-pager-host-theme', 'dark');
  await expect(managementRoot).toHaveClass(/\bdark\b/);
  await expect(managementRoot).not.toHaveClass(/\blight\b/);
  const darkRoot = await managementRoot.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
    scheme: getComputedStyle(element).colorScheme,
  }));
  expect(darkRoot.scheme).toBe('dark');
  expect(darkRoot.background).toBe('oklch(0 0 0)');
  await page.screenshot({
    path: 'test-results/host-theme-dark-desktop.png',
    fullPage: true,
  });

  await setHostTheme(page, 'light');
  await expect(managementRoot).toHaveAttribute(
    'data-pager-host-theme',
    'light',
  );
  await expect(managementRoot).toHaveClass(/\blight\b/);
  await expect(managementRoot).not.toHaveClass(/\bdark\b/);
  const lightRoot = await managementRoot.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
    scheme: getComputedStyle(element).colorScheme,
  }));
  expect(lightRoot.scheme).toBe('light');
  expect(lightRoot.background).toBe('oklch(1 0 0)');
  expect(lightRoot.background).not.toBe(darkRoot.background);
  const pageMetaContrast = await contrastAgainst(
    management.locator('.page-meta').first(),
  );
  expect(pageMetaContrast).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({
    path: 'test-results/host-theme-light-desktop.png',
    fullPage: true,
  });

  await management
    .getByRole('link', { name: /Host theme parity QA \/page\// })
    .click();
  await expect(
    management.getByRole('button', { name: 'Options', exact: true }),
  ).toBeVisible();
  await setPageTheme(management, 'light');
  await setHostTheme(page, 'dark');
  await expect(managementRoot).toHaveAttribute('data-pager-host-theme', 'dark');
  const pageHeaderEdit = management.getByRole('button', {
    name: 'Edit title, Host theme parity QA',
    exact: true,
  });
  const removeAlbum = management.getByRole('button', {
    name: 'Remove Liberty Family Camp ’26',
    exact: true,
  });
  const darkPhotoOverlay = await photoOverlayContrast(removeAlbum);
  expect(darkPhotoOverlay.foreground).toBe('rgb(255, 255, 255)');
  expect(darkPhotoOverlay.contrast).toBeGreaterThanOrEqual(4.5);
  await setHostTheme(page, 'light');
  const lightPhotoOverlay = await photoOverlayContrast(removeAlbum);
  expect(lightPhotoOverlay.foreground).toBe('rgb(255, 255, 255)');
  expect(lightPhotoOverlay.contrast).toBeGreaterThanOrEqual(4.5);
  await setHostTheme(page, 'dark');
  await pageHeaderEdit.focus();
  const pageThemeFocus = await pageHeaderEdit.evaluate((element) => ({
    color: getComputedStyle(element).color,
    outline: getComputedStyle(element).outlineColor,
  }));
  expect(pageThemeFocus.outline).toBe(pageThemeFocus.color);
  await management
    .getByRole('button', { name: 'Preview', exact: true })
    .click();

  let preview = management.frameLocator(
    '[data-testid="responsive-preview-frame"]',
  );
  await expect(preview.locator('.ip-gallery')).toHaveClass(/\blight\b/);
  expect(
    await preview.locator('html').getAttribute('data-pager-host-theme'),
  ).toBeNull();
  const pageLightBackground = await galleryBackground(preview);
  expect(pageLightBackground).toBe('rgb(255, 255, 255)');
  await setHostTheme(page, 'dark');
  await expect(managementRoot).toHaveAttribute('data-pager-host-theme', 'dark');
  await expect.poll(() => galleryBackground(preview)).toBe(pageLightBackground);

  await management.getByRole('button', { name: 'Back to editor' }).click();
  await setPageTheme(management, 'dark');
  await management
    .getByRole('button', { name: 'Preview', exact: true })
    .click();
  preview = management.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(preview.locator('.ip-gallery')).not.toHaveClass(/\blight\b/);
  const pageDarkBackground = await galleryBackground(preview);
  expect(pageDarkBackground).toBe('rgb(0, 0, 0)');
  await setHostTheme(page, 'light');
  await expect(managementRoot).toHaveAttribute(
    'data-pager-host-theme',
    'light',
  );
  await expect.poll(() => galleryBackground(preview)).toBe(pageDarkBackground);

  await management.getByRole('button', { name: 'Back to editor' }).click();
  await setPageTheme(management, 'system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await management
    .getByRole('button', { name: 'Preview', exact: true })
    .click();
  preview = management.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(preview.locator('.ip-gallery')).toHaveClass(/\bsystem\b/);
  const systemDarkBackground = await galleryBackground(preview);
  expect(systemDarkBackground).toBe('rgb(0, 0, 0)');
  await setHostTheme(page, 'dark');
  await expect
    .poll(() => galleryBackground(preview))
    .toBe(systemDarkBackground);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect
    .poll(() => galleryBackground(preview))
    .toBe('rgb(255, 255, 255)');

  await management.getByRole('button', { name: 'Back to editor' }).click();
  await setHostTheme(page, 'light');
  await expect(managementRoot).toHaveAttribute(
    'data-pager-host-theme',
    'light',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await closeMobileMenu(page);
  await page.screenshot({
    path: 'test-results/host-theme-light-mobile.png',
    fullPage: true,
  });
  await setHostTheme(page, 'dark');
  await expect(managementRoot).toHaveAttribute('data-pager-host-theme', 'dark');
  await closeMobileMenu(page);
  await page.screenshot({
    path: 'test-results/host-theme-dark-mobile.png',
    fullPage: true,
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await management
    .getByRole('button', { name: 'Options', exact: true })
    .click();
  const options = management.getByRole('dialog', {
    name: 'Options',
    exact: true,
  });
  await expect(options).toBeVisible();
  expect(
    await contrastAgainst(
      options.getByText('Changes autosave privately', { exact: true }),
    ),
  ).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({
    path: 'test-results/host-theme-options-dark-desktop.png',
    fullPage: true,
  });
  await options.getByRole('button', { name: 'Done', exact: true }).click();

  await setHostTheme(page, 'light');
  await page.route('**/page/api/photos**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Fixture photo search is unavailable.' }),
    }),
  );
  await management
    .getByRole('button', { name: 'Choose from Immich', exact: true })
    .first()
    .click();
  const photoDialog = management.getByRole('dialog', {
    name: 'Choose logo from Immich',
    exact: true,
  });
  await expect(photoDialog).toBeVisible();
  await expect(photoDialog.getByRole('alert')).toContainText(
    'Fixture photo search is unavailable.',
  );
  await page.screenshot({
    path: 'test-results/host-theme-photo-error-light-desktop.png',
    fullPage: true,
  });
  await photoDialog
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await page.unroute('**/page/api/photos**');

  await page.setViewportSize({ width: 390, height: 844 });
  await closeMobileMenu(page);
  await management
    .getByRole('button', { name: '＋ Add albums', exact: true })
    .click();
  const albumsDialog = management.getByRole('dialog', {
    name: 'Add albums',
    exact: true,
  });
  await expect(albumsDialog).toBeVisible();
  const pickerColors = await albumsDialog.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
    scheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  expect(pickerColors.background).not.toBe('rgb(0, 0, 0)');
  expect(pickerColors.scheme).toBe('light');
  const includedBorder = await albumsDialog
    .locator('.pick.selected .pick-cover')
    .evaluate((element) => getComputedStyle(element).borderTopColor);
  const unselectedBorder = await albumsDialog
    .locator('.pick:not(.selected) .pick-cover')
    .first()
    .evaluate((element) => getComputedStyle(element).borderTopColor);
  expect(includedBorder).not.toBe(unselectedBorder);
  await page.screenshot({
    path: 'test-results/host-theme-album-picker-light-mobile.png',
    fullPage: true,
  });
  await albumsDialog.getByRole('button', { name: 'Done', exact: true }).click();

  await page.setViewportSize({ width: 1440, height: 900 });
  await management
    .getByRole('button', {
      name: 'Edit title, Host theme parity QA',
      exact: true,
    })
    .click();
  const title = management.getByLabel('Title', { exact: true });
  await title.fill('Host theme parity QA updated');
  await title.press('Tab');
  await expect(management.getByTestId('save-state')).toHaveText(
    'All changes saved',
  );
  await management
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  const review = management.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(review).toBeVisible();
  await expect(review).toContainText('Page title');
  const reviewTextContrast = await contrastAgainst(
    review.getByText('Page title', { exact: true }),
  );
  expect(reviewTextContrast).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({
    path: 'test-results/host-theme-publication-review-light-desktop.png',
    fullPage: true,
  });
  await review.getByRole('button', { name: 'Cancel', exact: true }).click();

  await management
    .getByRole('button', {
      name: 'Remove Liberty Family Camp ’26',
      exact: true,
    })
    .click();
  await expect(management.locator('.empty-albums')).toBeVisible();
  await expect(management.getByTestId('save-state')).toHaveText(
    'All changes saved',
  );
  const addAlbums = management.getByRole('button', {
    name: 'Select albums',
    exact: true,
  });
  const lightNativeAccent = await addAlbums.evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--immich-ui-primary-500)';
    element.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await addAlbums.hover();
  const lightHover = await addAlbums.evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(lightHover.foreground).toBe(lightNativeAccent);
  expect(
    await contrastAgainst(addAlbums, lightHover.background),
  ).toBeGreaterThanOrEqual(4.5);
  await addAlbums.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const lightFocus = await addAlbums.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(lightFocus.focusVisible).toBe(true);
  expect(lightFocus.outlineStyle).toBe('solid');
  expect(lightFocus.outlineWidth).toBe('2px');
  await setHostTheme(page, 'dark');
  const darkNativeAccent = await addAlbums.evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--immich-ui-primary-500)';
    element.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await addAlbums.hover();
  const darkHover = await addAlbums.evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(darkHover.foreground).toBe(darkNativeAccent);
  expect(
    await contrastAgainst(addAlbums, darkHover.background),
  ).toBeGreaterThanOrEqual(4.5);
  await addAlbums.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const darkFocus = await addAlbums.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(darkFocus.focusVisible).toBe(true);
  expect(darkFocus.outlineStyle).toBe('solid');
  expect(darkFocus.outlineWidth).toBe('2px');
  await setHostTheme(page, 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  await closeMobileMenu(page);
  await page.screenshot({
    path: 'test-results/host-theme-empty-editor-light-mobile.png',
    fullPage: true,
  });

  expect(cspErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('standalone editor uses Immich saved theme or system preference and restores public defaults', async ({
  page,
}) => {
  const cspErrors: string[] = [];
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /content security policy|blocked by csp|refused to load script/i.test(
        message.text(),
      )
    )
      cspErrors.push(message.text());
  });
  await page.goto('/dev-login/alice');
  await page.evaluate(() => {
    localStorage.setItem('immich-ui-theme', JSON.stringify('light'));
  });
  await page.goto('/page/manage');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-pager-host-theme', 'light');
  await expect(root).toHaveClass(/\blight\b/);
  await expect(root).not.toHaveClass(/\bdark\b/);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => localStorage.removeItem('immich-ui-theme'));
  await page.evaluate(() => {
    const event = new StorageEvent('storage', { key: 'immich-ui-theme' });
    window.dispatchEvent(event);
  });
  await expect(root).toHaveAttribute('data-pager-host-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-pager-host-theme', 'light');

  await page.goto('/page/acme');
  await expect(root).not.toHaveAttribute('data-pager-host-theme', /.+/);
  await expect(page.locator('.ip-gallery')).not.toHaveClass(/\blight\b/);
  expect(cspErrors).toEqual([]);
});
