import { test, expect } from '@playwright/test';
import packageInfo from '../package.json' with { type: 'json' };
const { version } = packageInfo;
const [major, minor, patch] = version.split('.').map(Number);
const nextPatch = `${major}.${minor}.${patch + 1}`;
const laterPatch = `${major}.${minor}.${patch + 2}`;

const info = {
  installedVersion: version,
  installedReleaseUrl: `https://gitlab.com/wispd/ImmichPager/-/releases/v${version}`,
  latestVersion: nextPatch,
  latestReleaseUrl: `https://gitlab.com/wispd/ImmichPager/-/releases/v${nextPatch}`,
  updateAvailable: true,
  checkedAt: '2026-10-23T00:00:00Z',
  status: 'available',
  userId: 'alice',
  isAdmin: true,
};
async function about(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const modal = document.createElement('dialog');
    modal.id = 'fixture-about';
    modal.setAttribute('aria-label', 'About');
    // Immich v3.3.3 ServerAboutItem IDs and structure; labels may be translated.
    modal.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><label for="immich">Immich</label><p id="immich"><a href="https://immich.app">v3.3.3</a></p></div><div><label for="nodejs">Node.js</label><p id="nodejs">v24.21.0</p></div><div style="grid-column:1/-1"><label for="version-history">Historique des versions</label><ul id="version-history"></ul></div></div><button onclick="this.closest(\'dialog\').remove()">Close About</button>';
    modal.style.cssText =
      'width:min(680px,calc(100vw - 32px));box-sizing:border-box;background:inherit;color:inherit';
    document.body.append(modal);
    modal.showModal();
  });
}
test('version endpoint requires a session and verifies administrator status', async ({
  request,
}) => {
  expect((await request.get('/page/api/version')).status()).toBe(401);
  await request.get('/dev-login/alice');
  expect(await (await request.get('/page/api/version')).json()).toMatchObject({
    installedVersion: version,
    status: 'disabled',
    isAdmin: true,
  });
  await request.get('/dev-login/bob');
  expect(await (await request.get('/page/api/version')).json()).toMatchObject({
    isAdmin: false,
  });
});
for (const dark of [false, true])
  test(`About preserves native versions, translations and reopening (${dark ? 'dark' : 'light'})`, async ({
    page,
  }) => {
    await page.route('**/page/api/version', (route) =>
      route.fulfill({ json: { ...info, isAdmin: false, status: 'stale' } }),
    );
    await page.goto('/');
    await page.evaluate((dark) => {
      document.documentElement.classList.toggle('dark', dark);
      document.body.style.background = dark ? '#101114' : '#fff';
      document.body.style.color = dark ? '#eee' : '#222';
    }, dark);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await about(page);
      await expect(page.locator('[data-pager-version]')).toHaveCount(1);
      await expect(page.locator('#immich')).toHaveText('v3.3.3');
      await expect(
        page.getByRole('link', { name: `v${version}`, exact: true }),
      ).toHaveAttribute('href', info.installedReleaseUrl);
      await expect(
        page.getByText('Update check unavailable; showing last result.'),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: `v${nextPatch} available` }),
      ).toHaveAttribute('href', info.latestReleaseUrl);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/about-${dark ? 'dark' : 'light'}-${width}.png`,
      });
      await page.getByRole('button', { name: 'Close About' }).click();
    }
    await expect(page.locator('[data-pager-update]')).toHaveCount(0);
  });
test('admin patch announcements support Escape and remember dismissal per release', async ({
  page,
}) => {
  await page.route('**/page/api/version', (route) =>
    route.fulfill({ json: info }),
  );
  await page.goto('/');
  const notice = page.getByRole('dialog', {
    name: 'ImmichPager update available',
  });
  await expect(notice).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dismiss' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#sidebar')).toBeVisible();
  await about(page);
  await expect(page.locator('[data-pager-version]')).toHaveCount(1);
  await expect(notice).toHaveCount(0);
  await page.unroute('**/page/api/version');
  await page.route('**/page/api/version', (route) =>
    route.fulfill({
      json: {
        ...info,
        latestVersion: laterPatch,
        latestReleaseUrl: `https://gitlab.com/wispd/ImmichPager/-/releases/v${laterPatch}`,
      },
    }),
  );
  await page.reload();
  await expect(notice).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
});
test('a pending announcement does not interrupt another modal', async ({
  page,
}) => {
  await page.clock.install();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/page/api/version', async (route) => {
    await wait;
    await route.fulfill({ json: info });
  });
  await page.goto('/');
  await about(page);
  release();
  await expect(page.locator('[data-pager-version]')).toHaveCount(1);
  await expect(page.locator('[data-pager-update]')).toHaveCount(0);
  await expect(
    page.getByRole('dialog', { name: 'About', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close About' }).click();
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole('dialog', { name: 'ImmichPager update available' }),
  ).toBeVisible();
});
