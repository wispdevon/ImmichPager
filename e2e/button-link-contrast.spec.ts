import { expect, test, type Locator, type Page } from '@playwright/test';

type Theme = 'dark' | 'light';

async function useTheme(page: Page, theme: Theme) {
  await page.evaluate((selectedTheme) => {
    const key = 'immich-ui-theme';
    const value = JSON.stringify(selectedTheme);
    localStorage.setItem(key, value);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
  }, theme);

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-pager-host-theme', theme);
  await expect(root).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await expect(root).not.toHaveClass(
    new RegExp(`\\b${theme === 'dark' ? 'light' : 'dark'}\\b`),
  );
  await expect(root).toHaveCSS('color-scheme', theme);
}

async function disableTransitions(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }`,
  });
}

async function measureContrast(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable for color checks.');

    const channels = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (color: string) => {
      const rgb = channels(color).map((value) => value / 255);
      const linear = rgb.map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };

    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      opacity: style.opacity,
      disabled:
        element instanceof HTMLButtonElement ? element.disabled : undefined,
      ariaDisabled: element.getAttribute('aria-disabled'),
      className: element.className,
      colorScheme: style.colorScheme,
      ratio:
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05),
      theme: document.documentElement.className,
      themeLight: getComputedStyle(document.documentElement)
        .getPropertyValue('--immich-ui-light')
        .trim(),
      themePrimary: getComputedStyle(document.documentElement)
        .getPropertyValue('--immich-ui-primary-500')
        .trim(),
    };
  });
}

async function measureCompositedContrast(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Canvas is unavailable for color checks.');
    context.canvas.width = 1;
    context.canvas.height = 1;

    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const luminance = (rgb: number[]) => {
      const linear = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };

    let backdrop = [255, 255, 255];
    const ancestors: Element[] = [];
    for (
      let current: Element | null = element;
      current;
      current = current.parentElement
    )
      ancestors.push(current);
    for (const ancestor of ancestors.reverse()) {
      const color = getComputedStyle(ancestor).backgroundColor;
      const [red, green, blue, alphaChannel] = rgba(color);
      const alpha = alphaChannel / 255;
      backdrop = [red, green, blue].map(
        (channel, index) => channel * alpha + backdrop[index] * (1 - alpha),
      );
    }

    const foreground = rgba(style.color).slice(0, 3);
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(backdrop);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      compositedBackdrop: `rgb(${backdrop.map(Math.round).join(', ')})`,
      ratio:
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
    };
  });
}

test('Immich button links retain theme contrast and ordinary links inherit', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers: { origin: 'http://127.0.0.1:3200' },
    data: { title: 'Button contrast check', slug: 'button-contrast-check' },
  });
  expect(response.ok()).toBe(true);
  const draft = await response.json();
  const screenshotPhase =
    process.env.BUTTON_LINK_SCREENSHOT_PHASE ?? 'verified';

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    for (const theme of ['dark', 'light'] as const) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/page/manage');
      await disableTransitions(page);
      await useTheme(page, theme);
      await page.mouse.move(viewport.width - 1, viewport.height - 1);

      const createLink = page
        .getByRole('link', { name: /Create page/ })
        .first();
      await expect(createLink).toBeVisible();
      await page.screenshot({
        path: `test-results/button-link-contrast/${screenshotPhase}-${theme}-${viewport.name}-management.png`,
        fullPage: true,
      });

      const linkColors = await measureContrast(createLink);
      expect
        .soft(
          linkColors.ratio,
          `${theme} ${viewport.name} button-link contrast: ${JSON.stringify(linkColors)}`,
        )
        .toBeGreaterThanOrEqual(4.5);
      await expect(createLink).toHaveAttribute('aria-disabled', 'false');

      if (theme === 'light' && viewport.name === 'desktop') {
        const ghostLink = page.getByRole('link', {
          name: 'Open A collection of our work',
        });
        await expect(ghostLink).toBeVisible();
        await ghostLink.hover();
        const hoverColors = await measureCompositedContrast(ghostLink);
        expect(hoverColors.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(
          hoverColors.ratio,
          `light desktop ghost-link hover contrast over ${hoverColors.compositedBackdrop}: ${JSON.stringify(hoverColors)}`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      const ordinaryLink = page.getByRole('link', {
        name: 'Source & contributions ↗',
      });
      const ordinaryLinkColors = await ordinaryLink.evaluate((element) => ({
        color: getComputedStyle(element).color,
        parentColor: getComputedStyle(element.parentElement!).color,
        underlineOffset: getComputedStyle(element).textUnderlineOffset,
      }));
      expect(ordinaryLinkColors.color).toBe(ordinaryLinkColors.parentColor);
      expect(ordinaryLinkColors.underlineOffset).toBe('4px');

      const disabledLinkColors = await page.evaluate(() => {
        const parent = document.createElement('div');
        parent.style.color = 'rgb(35, 72, 115)';
        const link = document.createElement('a');
        link.href = '#disabled-link-color-check';
        link.setAttribute('aria-disabled', 'true');
        link.textContent = 'Disabled ordinary link';
        parent.append(link);
        document.body.append(parent);
        return {
          color: getComputedStyle(link).color,
          parentColor: getComputedStyle(parent).color,
        };
      });
      expect(disabledLinkColors.color).toBe(disabledLinkColors.parentColor);

      await page.goto('/page/acme');
      await disableTransitions(page);
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      const publicRoot = page.locator('html');
      await expect(publicRoot).not.toHaveAttribute(
        'data-pager-host-theme',
        /.+/,
      );
      await expect(publicRoot).toHaveClass(/\bdark\b/);
      await expect(publicRoot).not.toHaveClass(/\blight\b/);
      const gallery = page.locator('.ip-gallery');
      await expect(gallery).toHaveCSS('color-scheme', 'dark');
      await expect(gallery).toHaveCSS('background-color', 'rgb(0, 0, 0)');
      const galleryLink = page.locator('a.ip-album[aria-disabled]').first();
      await expect(galleryLink).toBeVisible();
      const galleryLinkColors = await galleryLink.evaluate((element) => {
        const gallery = element.closest('.gallery');
        if (!gallery) throw new Error('Album link has no gallery ancestor.');
        return {
          color: getComputedStyle(element).color,
          galleryColor: getComputedStyle(gallery).color,
        };
      });
      expect(galleryLinkColors.color).toBe(galleryLinkColors.galleryColor);

      if (theme === 'dark' && viewport.name === 'mobile') {
        await page.goto('/page/manage');
        await disableTransitions(page);
        await useTheme(page, theme);
        await page.keyboard.press('Tab');
        const keyboardCreateLink = page
          .getByRole('link', { name: /Create page/ })
          .first();
        await keyboardCreateLink.focus();
        await expect(keyboardCreateLink).toBeFocused();
        expect(
          await keyboardCreateLink.evaluate(
            (element) => getComputedStyle(element).outlineWidth,
          ),
        ).toBe('2px');
      }

      await page.goto(`/page/manage/${draft.id}`);
      await disableTransitions(page);
      await useTheme(page, theme);
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      const publishButton = page.getByRole('button', {
        name: 'Publish page',
        exact: true,
      });
      await expect(publishButton).toBeVisible();
      await expect(publishButton).toBeEnabled();
      await page.screenshot({
        path: `test-results/button-link-contrast/${screenshotPhase}-${theme}-${viewport.name}-editor.png`,
        fullPage: true,
      });
      const buttonColors = await measureContrast(publishButton);
      expect
        .soft(
          buttonColors.ratio,
          `${theme} ${viewport.name} native-button contrast: ${JSON.stringify(buttonColors)}`,
        )
        .toBeGreaterThanOrEqual(4.5);
      expect
        .soft(
          linkColors.color,
          `${theme} button links should match the native primary button text color`,
        )
        .toBe(buttonColors.color);
      expect
        .soft(
          linkColors.backgroundColor,
          `${theme} button links should match the native primary button background`,
        )
        .toBe(buttonColors.backgroundColor);
    }
  }
});
