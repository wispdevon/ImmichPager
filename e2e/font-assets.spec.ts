import { expect, test } from '@playwright/test';

test('bundled gallery fonts load from local assets and keep Google Sans default', async ({
  page,
}) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/fonts/')) fontRequests.push(request.url());
  });

  await page.goto('/page/acme');
  const gallery = page.locator('[data-pager-gallery]');
  await expect(gallery).toBeVisible();

  const result = await page.evaluate(async () => {
    const gallery = document.querySelector<HTMLElement>('[data-pager-gallery]');
    const fonts = [
      ['Inter', 800],
      ['Nunito Sans', 800],
      ['Lato', 700],
      ['Source Serif 4', 800],
      ['Merriweather', 800],
      ['JetBrains Mono', 800],
    ] as const;
    const loaded = [];
    for (const [family, weight] of fonts) {
      const descriptor = `${weight} 16px "${family}"`;
      const faces = await document.fonts.load(descriptor, 'Pager gallery');
      loaded.push({
        family,
        faceCount: faces.length,
        loaded: document.fonts.check(descriptor),
      });
    }
    return {
      defaultFamily: gallery ? getComputedStyle(gallery).fontFamily : '',
      loaded,
    };
  });

  expect(result.defaultFamily).toContain('GoogleSans');
  expect(result.loaded).toHaveLength(6);
  expect(result.loaded.every((font) => font.faceCount > 0 && font.loaded)).toBe(
    true,
  );
  expect(fontRequests).toHaveLength(6);
  const origin = new URL(page.url()).origin;
  expect(
    fontRequests.every((url) =>
      url.startsWith(`${origin}/page/assets/fonts/bundled/`),
    ),
  ).toBe(true);
});
