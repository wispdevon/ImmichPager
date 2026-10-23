import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import jsQR from 'jsqr';

const origin = 'http://127.0.0.1:3200';
const headers = { origin };

test('settings share only the live URL and export scannable images before and after a URL change', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: {
      title: 'Settings sharing',
      slug: 'settings-sharing',
      albumIds: [albums[0].id],
    },
  });
  const draft = await created.json();
  await page.goto(`/page/manage/${draft.id}`);
  await page
    .getByRole('button', { name: 'Page settings', exact: true })
    .click();
  let settings = page.getByRole('dialog', {
    name: 'Page settings',
    exact: true,
  });
  await expect(
    settings.getByRole('button', { name: 'QR code', exact: true }),
  ).toBeDisabled();
  await expect(settings).toContainText('Publish this page first.');
  await settings
    .getByRole('button', { name: 'Publish page', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Review publication' })
    .getByRole('button', { name: 'Publish page', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Page published');
  await expect(
    page.getByRole('button', { name: 'Update live page', exact: true }),
  ).toBeDisabled();
  for (const [index, liveSlug] of [
    'settings-sharing',
    'settings-sharing-new',
  ].entries()) {
    await page
      .getByRole('button', { name: 'Page settings', exact: true })
      .click();
    settings = page.getByRole('dialog', { name: 'Page settings', exact: true });
    if (!index) {
      await settings.getByRole('button', { name: 'Change page URL' }).click();
      await settings
        .getByRole('textbox', { name: 'Page URL' })
        .fill('settings-sharing-new');
      await expect(settings).toContainText(
        'The old link stops working after you publish',
      );
      await expect(settings).toContainText(
        `Pending URL (unpublished): ${origin}/page/settings-sharing-new`,
      );
    }
    await settings
      .getByRole('button', { name: 'QR code', exact: true })
      .click();
    const qr = page.getByRole('dialog', { name: 'QR code', exact: true });
    await expect(qr).toContainText(`${origin}/page/${liveSlug}`);
    for (const format of ['PNG', 'SVG']) {
      const downloadEvent = page.waitForEvent('download');
      await qr.getByRole('link', { name: `Download ${format}` }).click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe(
        `immichpager-${liveSlug}-qr.${format.toLowerCase()}`,
      );
      const input = await readFile((await download.path())!);
      const { data, info } = await sharp(input)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(1024);
      expect(
        jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data,
      ).toBe(`${origin}/page/${liveSlug}`);
    }
    await qr.getByRole('button', { name: 'Close', exact: true }).last().click();
    if (!index) {
      await settings.getByRole('button', { name: 'Review changes' }).click();
      await page
        .getByRole('dialog', { name: 'Review publication' })
        .getByRole('button', { name: 'Update live page' })
        .click();
      await expect(page.getByRole('status')).toContainText('Page published');
    }
  }
  expect((await page.request.get('/page/settings-sharing')).status()).toBe(404);
  expect((await page.request.get('/page/settings-sharing-new')).status()).toBe(
    200,
  );
  expect(errors).toEqual([]);
});

test('password review is conditional, survives failure, and clears transient passwords', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const draft = await (
    await page.request.post('/page/api/pages', {
      headers,
      data: {
        title: 'Protected settings',
        slug: 'protected-settings',
        albumIds: [albums[0].id],
      },
    })
  ).json();
  await page.goto(`/page/manage/${draft.id}`);
  const openSettings = async () => {
    await page
      .getByRole('button', { name: 'Page settings', exact: true })
      .click();
    return page.getByRole('dialog', { name: 'Page settings', exact: true });
  };
  let settings = await openSettings();
  await settings
    .getByRole('button', { name: 'Set password', exact: true })
    .click();
  await settings.getByPlaceholder('At least 4 characters').fill('private-pin');
  await settings.getByRole('button', { name: 'Publish page' }).click();
  let review = page.getByRole('dialog', { name: 'Review publication' });
  await expect(review).toContainText('Set a page and album password.');
  await expect(review.getByLabel('Current page password')).toHaveCount(0);
  await review.getByRole('button', { name: 'Publish page' }).click();
  await expect(page.getByRole('status')).toContainText('Page published');
  settings = await openSettings();
  await expect(settings.getByPlaceholder('At least 4 characters')).toHaveCount(
    0,
  );
  await settings.getByRole('switch', { name: 'Allow downloads' }).click();
  await settings.getByRole('button', { name: 'Review changes' }).click();
  review = page.getByRole('dialog', { name: 'Review publication' });
  await expect(review).toContainText('Disable downloads');
  await review
    .getByLabel('Current page password', { exact: true })
    .fill('wrong-pin');
  await review.getByRole('button', { name: 'Update live page' }).click();
  await expect(review.getByRole('alert')).toContainText(
    'current page password',
  );
  await review
    .getByLabel('Current page password', { exact: true })
    .fill('private-pin');
  await review.getByRole('button', { name: 'Update live page' }).click();
  await expect(review).toHaveCount(0);
  settings = await openSettings();
  await settings
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(settings.getByPlaceholder('At least 4 characters')).toHaveValue(
    '',
  );
  await settings
    .getByRole('button', { name: 'Cancel password change' })
    .click();
  await expect(
    settings.getByRole('button', { name: 'Review changes' }),
  ).toBeDisabled();
  await settings
    .getByRole('button', { name: 'Remove password', exact: true })
    .click();
  await settings.getByRole('button', { name: 'Review changes' }).click();
  review = page.getByRole('dialog', { name: 'Review publication' });
  await expect(review).toContainText('Remove password protection.');
  await expect(review.getByLabel('Current page password')).toHaveCount(0);
  await review.getByRole('button', { name: 'Update live page' }).click();
  await expect(review).toHaveCount(0);
  expect(
    (await (await page.request.get(`/page/api/pages/${draft.id}`)).json())
      .hasPassword,
  ).toBe(false);
});

for (const theme of ['light', 'dark']) {
  test(`phone settings remain reachable in ${theme} with validation and clipboard fallback`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.addInitScript((theme) => {
      localStorage.setItem('immich-ui-theme', JSON.stringify(theme));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });
    }, theme);
    await page.goto('/dev-login/alice');
    const albums = await (await page.request.get('/page/api/albums')).json();
    const slug = `phone-${theme}-${'a'.repeat(65)}`;
    const draft = await (
      await page.request.post('/page/api/pages', {
        headers,
        data: { title: 'Phone settings', slug, albumIds: [albums[0].id] },
      })
    ).json();
    await page.request.post(`/page/api/pages/${draft.id}/publish`, {
      headers,
      data: { expectedDraftRevision: draft.draftRevision },
    });
    await page.goto(`/page/manage/${draft.id}`);
    await page
      .getByRole('button', { name: 'Page settings', exact: true })
      .click();
    const settings = page.getByRole('dialog', {
      name: 'Page settings',
      exact: true,
    });
    await expect(settings).toBeVisible();
    await settings.getByRole('button', { name: 'Copy client link' }).click();
    await expect(
      settings.getByRole('textbox', { name: 'Client link', exact: true }),
    ).toHaveValue(`${origin}/page/${slug}`);
    await settings.getByRole('button', { name: 'Change page URL' }).click();
    await settings.getByRole('textbox', { name: 'Page URL' }).fill('BAD URL');
    await expect(
      settings.getByRole('textbox', { name: 'Page URL' }),
    ).toHaveAttribute('aria-invalid', 'true');
    await settings.getByText('Page management', { exact: true }).click();
    await expect(
      settings.getByRole('button', { name: 'Delete page' }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/page-settings-${theme}-phone.png`,
      fullPage: true,
    });
    const footer = await settings
      .getByRole('button', { name: 'Close', exact: true })
      .last()
      .boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(640);
    expect(
      await settings.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await settings.getByRole('button', { name: 'Delete page' }).click();
    await expect(page.getByRole('dialog').last()).toContainText(
      'revoke its dedicated album links',
    );
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
}

test('settings traps keyboard focus and returns to its toolbar button', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');
  const trigger = page.getByRole('button', {
    name: 'Page settings',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Page settings',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
