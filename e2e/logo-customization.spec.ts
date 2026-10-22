import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { DraftEditorPage } from '../src/lib/contracts';

const headers = { origin: 'http://127.0.0.1:3200' };

async function create(page: Page, slug: string) {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const response = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Logo layout test',
      description: 'Header copy for the logo layout test.',
      slug,
      albumIds: albums
        .filter((album: { ownerId: string }) => album.ownerId === 'alice')
        .map((album: { id: string }) => album.id),
    },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as DraftEditorPage;
}

async function uploadBranding(
  page: Page,
  draft: DraftEditorPage,
  kind: 'logo' | 'banner',
) {
  const response = await page.request.post(
    `/page/api/pages/${draft.id}/branding/${kind}`,
    {
      headers,
      multipart: {
        expectedDraftRevision: String(draft.draftRevision),
        image: {
          name: 'earthrise.webp',
          mimeType: 'image/webp',
          buffer: readFileSync('fixtures/photos/earthrise.webp'),
        },
      },
    },
  );
  expect(response.ok()).toBe(true);
  return (await response.json()) as DraftEditorPage;
}

async function save(page: Page, draft: DraftEditorPage, values: object) {
  const response = await page.request.put(`/page/api/pages/${draft.id}`, {
    headers,
    data: { ...draft, ...values, expectedDraftRevision: draft.draftRevision },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as DraftEditorPage;
}

test('logo shape and placement render in client and owner headers', async ({
  page,
}) => {
  let draft = await create(page, `logo-layout-${Date.now()}`);
  try {
    draft = await uploadBranding(page, draft, 'logo');
    draft = await uploadBranding(page, draft, 'banner');
    draft = await save(page, draft, {
      headerLayout: 'overlay',
      galleryStyle: {
        ...draft.galleryStyle,
        logoShape: 'circle',
        logoPosition: 'left',
      },
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/page/manage/${draft.id}/preview`);
    const gallery = page.locator('.ip-gallery');
    const logo = gallery.locator('.ip-logo');
    await expect(gallery).toHaveClass(/overlay/);
    await expect(gallery.locator('.ip-banner')).toBeVisible();
    await expect(logo).toHaveCSS('border-radius', '50%');
    await expect(gallery.locator('.header-content')).toHaveCSS(
      'flex-direction',
      'row',
    );
    await expect(gallery.locator('.header-copy')).toContainText(
      'Header copy for the logo layout test.',
    );

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(gallery.locator('.header-content')).toHaveCSS(
      'flex-direction',
      'column',
    );
    await expect(gallery.locator('.ip-logo')).toBeVisible();

    draft = await save(page, draft, {
      galleryStyle: { ...draft.galleryStyle, logoShape: 'square' },
    });
    await page.goto(`/page/manage/${draft.id}/preview`);
    await expect(page.locator('.ip-logo')).toHaveCSS('border-radius', '0px');

    draft = await save(page, draft, {
      clientUi: { ...draft.clientUi, showLogo: false },
      galleryStyle: { ...draft.galleryStyle, logoShape: 'rounded' },
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/page/manage/${draft.id}/preview`);
    await expect(page.locator('.ip-logo')).toHaveCount(0);
    await expect(page.locator('.ip-title')).toBeVisible();

    await page.goto(`/page/manage/${draft.id}`);
    await expect(page.locator('.ip-logo')).toBeVisible();
    await expect(page.locator('.ip-logo')).toHaveCSS('border-radius', '16px');
    await expect(page.locator('.header-content')).toHaveCSS(
      'flex-direction',
      'row',
    );
    await expect(
      page.getByRole('button', { name: /Edit title, Logo layout test/ }),
    ).toBeVisible();
  } finally {
    await page.request.delete(`/page/api/pages/${draft.id}`, { headers });
  }
});
