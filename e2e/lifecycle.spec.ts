import { test, expect } from '@playwright/test';

test('monthly additions keep the URL, password rotation invalidates sessions, and unpublish revokes links', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  const headers = { origin: 'http://127.0.0.1:3200' };
  const albums = await (await page.request.get('/page/api/albums')).json();
  const settings = {
    title: 'Monthly work',
    slug: 'monthly-client',
    albumIds: [albums[0].id],
    passwordMode: 'set',
    password: 'old-pin',
  };
  const created = await page.request.post('/page/api/pages', {
    headers,
    data: settings,
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  expect(
    (
      await page.request.post(`/page/api/pages/${record.id}/publish`, {
        headers,
        data: {
          password: 'old-pin',
          passwordMode: 'set',
          expectedDraftRevision: record.draftRevision,
        },
      })
    ).ok(),
  ).toBe(true);
  const context = await browser.newContext(),
    client = await context.newPage();
  await client.goto('/page/monthly-client');
  await client.getByPlaceholder('Password', { exact: true }).fill('old-pin');
  await client.getByRole('button', { name: 'View albums' }).click();
  await expect(client.locator('.album')).toHaveCount(1);
  const shares = await (await page.request.get('/api/shared-links')).json();
  const native =
    '/s/' +
    shares.find(
      (s: { slug: string; album?: { id: string } }) =>
        s.album?.id === albums[0].id &&
        s.slug?.startsWith(`pager-${record.id}-`),
    ).slug;
  const updated = await page.request.put(`/page/api/pages/${record.id}`, {
    headers,
    data: {
      ...settings,
      albumIds: [albums[0].id, albums[1].id],
      password: 'new-pin',
      expectedDraftRevision: record.draftRevision,
    },
  });
  expect(updated.ok()).toBe(true);
  expect(
    (
      await context.request.get(
        `/page/media/${record.id}/album/${albums[0].id}`,
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(`/page/api/pages/${record.id}/publish`, {
        headers,
        data: {
          password: 'new-pin',
          passwordMode: 'set',
          expectedDraftRevision: (await updated.json()).draftRevision,
        },
      })
    ).ok(),
  ).toBe(true);
  await client.reload();
  await expect(
    client.getByRole('heading', { name: 'Password required' }),
  ).toBeVisible();
  await client.getByPlaceholder('Password', { exact: true }).fill('old-pin');
  await client.getByRole('button', { name: 'View albums' }).click();
  await expect(client.getByRole('alert')).toHaveText('Incorrect password');
  await client.getByPlaceholder('Password', { exact: true }).fill('new-pin');
  await client.getByRole('button', { name: 'View albums' }).click();
  await expect(client.locator('.album')).toHaveCount(2);
  await expect(client).toHaveURL(/\/page\/monthly-client$/);
  const invalidImage = await page.request.post(
    `/page/api/pages/${record.id}/branding/logo`,
    {
      headers,
      multipart: {
        expectedDraftRevision: String(
          (
            await (
              await page.request.get(`/page/api/pages/${record.id}`)
            ).json()
          ).draftRevision,
        ),
        image: {
          name: 'test.svg',
          mimeType: 'image/svg+xml',
          buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        },
      },
    },
  );
  expect(invalidImage.status()).toBe(400);
  expect(
    (
      await page.request.post(`/page/api/pages/${record.id}/unpublish`, {
        headers,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect((await context.request.get('/page/monthly-client')).status()).toBe(
    404,
  );
  expect((await context.request.get(native!)).status()).toBe(404);
  expect(
    (
      await page.request.delete(`/page/api/pages/${record.id}`, { headers })
    ).ok(),
  ).toBe(true);
  await context.close();
});
