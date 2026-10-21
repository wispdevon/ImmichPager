import { expect, test } from '@playwright/test';

const origin = 'http://127.0.0.1:3200';

test('management actions stay compact and work by touch and keyboard', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const page = await context.newPage();
    await page.goto(`${origin}/dev-login/alice`);

    const createPage = async (
      title: string,
      slug: string,
      albumIds: string[] = [],
    ) => {
      const response = await page.request.post(`${origin}/page/api/pages`, {
        headers: { origin },
        data: { title, slug, albumIds },
      });
      expect(response.ok()).toBe(true);
      return response.json();
    };

    const draftTitle =
      'Mobile action design for a client with a long studio name';
    const draft = await createPage(draftTitle, 'mobile-action-draft');
    const albumsResponse = await page.request.get(`${origin}/page/api/albums`);
    expect(albumsResponse.ok()).toBe(true);
    const albums = await albumsResponse.json();
    const publishedDraft = await createPage(
      'Mobile action published',
      'mobile-action-published',
      [albums[0].id],
    );
    const publishResponse = await page.request.post(
      `${origin}/page/api/pages/${publishedDraft.id}/publish`,
      {
        headers: { origin },
        data: { expectedDraftRevision: publishedDraft.draftRevision },
      },
    );
    expect(publishResponse.ok()).toBe(true);
    const published = await publishResponse.json();

    await page.goto(`${origin}/page/manage`);
    const draftRow = page
      .getByTestId('management-page-row')
      .filter({ hasText: draftTitle });
    const draftMenu = draftRow.getByRole('button', {
      name: `More actions for ${draftTitle}`,
    });
    const draftCopy = draftRow.getByRole('button', { name: 'Copy link' });

    await expect(draftRow.getByText('Draft', { exact: true })).toBeVisible();
    await expect(draftCopy).toBeDisabled();
    await expect(draftMenu).toBeVisible();
    await expect(
      draftRow.getByRole('button', { name: /Duplicate design/ }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await draftMenu.tap();
    const duplicateItem = page.getByRole('menuitem', {
      name: 'Duplicate design',
    });
    await expect(duplicateItem).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Open client page' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('menuitem', { name: 'Options', exact: true }),
    ).toBeVisible();

    const heading = page.getByRole('heading', { name: 'Pages', exact: true });
    const headingBounds = await heading.boundingBox();
    expect(headingBounds).not.toBeNull();
    await page.mouse.click(
      headingBounds!.x + headingBounds!.width / 2,
      headingBounds!.y + headingBounds!.height / 2,
    );
    await expect(duplicateItem).toHaveCount(0);

    await draftMenu.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(duplicateItem).toHaveCount(0);
    await expect(draftMenu).toBeFocused();
    await page.waitForTimeout(100);
    await expect(draftMenu).toBeFocused();

    await draftMenu.focus();
    await page.keyboard.press('Enter');
    await expect(duplicateItem).toBeVisible();
    await expect(duplicateItem).toBeFocused();
    await page.keyboard.press('ArrowDown');
    const optionsItem = page.getByRole('menuitem', {
      name: 'Options',
      exact: true,
    });
    await expect(optionsItem).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(duplicateItem).toHaveCount(0);
    await expect(draftMenu).toBeFocused();

    await page.keyboard.press('Tab');
    const focusAfterTab = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        tag: focused?.tagName,
        ariaLabel: focused?.getAttribute('aria-label'),
        text: focused?.textContent?.trim(),
      };
    });
    await page.waitForTimeout(100);
    expect(
      await page.evaluate(() => {
        const focused = document.activeElement;
        return {
          tag: focused?.tagName,
          ariaLabel: focused?.getAttribute('aria-label'),
          text: focused?.textContent?.trim(),
        };
      }),
    ).toEqual(focusAfterTab);
    await expect(page.locator('[role="menuitem"]:focus')).toHaveCount(0);

    await draftMenu.focus();
    await page.keyboard.press('Space');
    await expect(duplicateItem).toBeVisible();
    await expect(duplicateItem).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(duplicateItem).toHaveCount(0);
    await expect(draftMenu).toBeFocused();

    const optionsUrl = new RegExp(`/page/manage/${draft.id}\\?options=1$`);
    await page.evaluate(async (pageId) => {
      const row = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-testid="management-page-row"]',
        ),
      ).find((candidate) =>
        candidate.querySelector(`a[href="/page/manage/${pageId}"]`),
      );
      const trigger = row?.querySelector<HTMLButtonElement>(
        '[data-testid="management-actions-menu-trigger"]',
      );
      if (!trigger) throw new Error('Missing management action trigger');
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await new Promise<void>((resolve) => {
        const findOptions = () =>
          Array.from(
            document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
          ).find((item) => item.textContent?.includes('Options'));
        const observer = new MutationObserver(() => {
          if (findOptions()) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        trigger.click();
        if (findOptions()) {
          observer.disconnect();
          resolve();
        }
      });
      const optionsItem = Array.from(
        document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ).find((item) => item.textContent?.includes('Options'));
      if (!optionsItem) throw new Error('Options menu item did not mount');
      optionsItem.click();
    }, draft.id);
    await expect(page).toHaveURL(optionsUrl);
    const optionsDialog = page.getByRole('dialog', {
      name: 'Options',
      exact: true,
    });
    await expect(optionsDialog).toBeVisible();
    const dialogFocus = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        tag: focused?.tagName,
        ariaLabel: focused?.getAttribute('aria-label'),
        text: focused?.textContent?.trim(),
      };
    });
    await page.waitForTimeout(100);
    await expect(page.locator('[role="menuitem"]:focus')).toHaveCount(0);
    expect(
      await page.evaluate(() => {
        const focused = document.activeElement;
        return {
          tag: focused?.tagName,
          ariaLabel: focused?.getAttribute('aria-label'),
          text: focused?.textContent?.trim(),
        };
      }),
    ).toEqual(dialogFocus);
    await optionsDialog.getByRole('button', { name: 'Done' }).click();
    await page.goto(`${origin}/page/manage`);

    await draftMenu.tap();
    await page.getByRole('menuitem', { name: 'Options', exact: true }).tap();
    await expect(page).toHaveURL(
      new RegExp(`/page/manage/${draft.id}\\?options=1$`),
    );
    await expect(
      page.getByRole('dialog', { name: 'Options', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.goto(`${origin}/page/manage`);

    const publishedRow = page
      .getByTestId('management-page-row')
      .filter({ hasText: 'Mobile action published' });
    await expect(
      publishedRow.getByText('Published', { exact: true }),
    ).toBeVisible();
    const publishedCopy = publishedRow.getByRole('button', {
      name: 'Copy link',
    });
    await expect(publishedCopy).toBeEnabled();
    await publishedCopy.tap();
    await expect(publishedCopy).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${origin}/page/${published.publishedSlug}`,
    );

    const publishedMenu = publishedRow.getByRole('button', {
      name: 'More actions for Mobile action published',
    });
    await publishedMenu.tap();
    const openPublished = page.getByRole('menuitem', {
      name: 'Open client page',
    });
    await expect(openPublished).toBeVisible();
    const popupPromise = page.waitForEvent('popup');
    await openPublished.tap();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(`${origin}/page/${published.publishedSlug}`);
    await popup.close();

    await page.setViewportSize({ width: 320, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(draftMenu).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/page/manage`);
    await page
      .getByRole('searchbox', { name: 'Search pages' })
      .fill('Mobile action');
    await page.getByRole('heading', { name: 'Pages', exact: true }).click();
    await page.screenshot({
      path: 'test-results/management-actions-mobile.png',
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});
