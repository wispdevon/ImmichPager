import { expect, test, type Page } from '@playwright/test';
import {
  DEFAULT_CLIENT_UI,
  DEFAULT_GALLERY_STYLE,
  type GalleryPage,
} from '../src/lib/contracts';
import { closeCustomize, openCustomize } from './customize-helper';

const headers = { origin: 'http://127.0.0.1:3200' };

async function createDraft(
  page: Page,
  settings: {
    title: string;
    slug: string;
    description?: string;
    clientUi?: { showTitle?: boolean; showDescription?: boolean };
    albumIds?: string[];
  },
) {
  await page.goto('/dev-login/alice');
  const response = await page.request.post('/page/api/pages', {
    headers,
    data: settings,
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

async function currentDraft(page: Page, id: string) {
  return (await (await page.request.get(`/page/api/pages/${id}`)).json()) as {
    draftRevision: number;
    title: string;
    description: string;
  };
}

async function postPreviewSync(
  page: Page,
  pageId: string,
  title: string,
  description: string,
  options: { draftRevision?: number; syncSequence?: number } = {},
) {
  const draftRevision =
    options.draftRevision ?? (await currentDraft(page, pageId)).draftRevision;
  const syncSequence =
    options.syncSequence ??
    Number(
      await page
        .getByTestId('responsive-preview-frame')
        .getAttribute('data-sync-sequence'),
    ) + 0.5;
  const preview: GalleryPage = {
    id: pageId,
    title,
    description,
    theme: 'dark',
    background: null,
    foreground: null,
    accent: '#accbfa',
    alignment: 'left',
    bannerPosition: 50,
    headerLayout: 'below',
    headerSize: 'standard',
    logoSize: 80,
    titleSize: 3,
    descriptionSize: 1.125,
    headerSpacing: 2.5,
    customCss: '',
    clientUi: DEFAULT_CLIENT_UI,
    galleryStyle: DEFAULT_GALLERY_STYLE,
    order: 'newest',
    logo: null,
    banner: null,
    albums: [],
  };
  await page.evaluate(
    ({ message }) => {
      const iframe = document.querySelector<HTMLIFrameElement>(
        '[data-testid="responsive-preview-frame"]',
      );
      iframe?.contentWindow?.postMessage(message, window.location.origin);
    },
    {
      message: {
        type: 'pager:inline-preview-sync',
        version: 1,
        pageId,
        syncSequence,
        draftRevision,
        page: preview,
      },
    },
  );
  return syncSequence;
}

test('Customize preview edits title and description and preserves caret after save sync', async ({
  page,
}) => {
  const draft = await createDraft(page, {
    title: 'Original client title',
    slug: 'inline-preview-edit',
    description: 'Original client description',
  });
  await page.goto(`/page/manage/${draft.id}`);
  await openCustomize(page);

  const iframe = page.getByTestId('responsive-preview-frame');
  const frame = page.frameLocator('[data-testid="responsive-preview-frame"]');
  const src = await iframe.getAttribute('src');
  expect(src).toContain('inlineHeader=1');
  await expect(
    frame.getByRole('button', {
      name: 'Edit title, Original client title',
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await iframe.getAttribute('data-sync-sequence')))
    .toBeGreaterThan(0);

  const initialRevision = (await currentDraft(page, draft.id)).draftRevision;
  const titleButton = frame.getByRole('button', {
    name: 'Edit title, Original client title',
    exact: true,
  });
  await titleButton.focus();
  await titleButton.press('Enter');
  const title = frame.getByLabel('Title', { exact: true });
  const syncSequence = Number(await iframe.getAttribute('data-sync-sequence'));
  const staleSequence = syncSequence + 0.5;
  const saveUrl = `**/page/api/pages/${draft.id}`;
  let releaseSave!: () => void;
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let delayedFirstSave = false;
  await page.route(saveUrl, async (route) => {
    if (route.request().method() === 'PUT' && !delayedFirstSave) {
      delayedFirstSave = true;
      await saveGate;
    }
    await route.continue();
  });
  const saveRequest = page.waitForRequest(
    (request) =>
      request.method() === 'PUT' &&
      request.url().includes(`/page/api/pages/${draft.id}`),
  );
  await title.fill('A revised title in the preview');
  await title.evaluate((element) => {
    (element as HTMLTextAreaElement).setSelectionRange(5, 5);
  });
  await saveRequest;
  await postPreviewSync(
    page,
    draft.id,
    'Original client title',
    'Original client description',
    { draftRevision: initialRevision, syncSequence: staleSequence },
  );
  await expect(title).toHaveValue('A revised title in the preview');
  await expect(title).toBeFocused();
  expect(
    await title.evaluate(
      (element) => (element as HTMLTextAreaElement).selectionStart,
    ),
  ).toBe(5);
  releaseSave();
  await expect
    .poll(async () => (await currentDraft(page, draft.id)).draftRevision)
    .toBeGreaterThan(initialRevision);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(iframe).toHaveAttribute('src', src!);
  await page.unroute(saveUrl);
  await postPreviewSync(
    page,
    draft.id,
    'Original client title',
    'Original client description',
    {
      draftRevision: (await currentDraft(page, draft.id)).draftRevision,
      syncSequence: staleSequence,
    },
  );
  await expect(title).toHaveValue('A revised title in the preview');
  await expect(title).toBeFocused();
  expect(
    await title.evaluate(
      (element) => (element as HTMLTextAreaElement).selectionStart,
    ),
  ).toBe(5);

  await title.press('Escape');
  await expect(
    frame.getByRole('button', {
      name: 'Edit title, A revised title in the preview',
      exact: true,
    }),
  ).toBeVisible();
  await frame
    .getByRole('button', {
      name: 'Edit description, Original client description',
      exact: true,
    })
    .click();
  const description = frame.getByLabel('Description', { exact: true });
  await description.fill('A new description, still in the gallery.');
  await description.evaluate((element) => {
    (element as HTMLTextAreaElement).setSelectionRange(4, 4);
  });
  const titleRevision = (await currentDraft(page, draft.id)).draftRevision;
  await expect
    .poll(async () => (await currentDraft(page, draft.id)).draftRevision)
    .toBeGreaterThan(titleRevision);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(iframe).toHaveAttribute('src', src!);
  await expect(description).toBeFocused();
  expect(
    await description.evaluate(
      (element) => (element as HTMLTextAreaElement).selectionStart,
    ),
  ).toBe(4);

  const saved = await currentDraft(page, draft.id);
  expect(saved.title).toBe('A revised title in the preview');
  expect(saved.description).toBe('A new description, still in the gallery.');
  await closeCustomize(page);
});

test('phone Customize preview keeps hidden client content hidden and regular Preview read-only', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const draft = await createDraft(page, {
    title: 'Hidden client title',
    slug: 'inline-preview-phone',
    description: 'Visible description',
    clientUi: { showTitle: false, showDescription: true },
  });
  await page.goto(`/page/manage/${draft.id}`);
  const dialog = await openCustomize(page);
  await dialog.getByRole('button', { name: 'Preview', exact: true }).click();

  const frame = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await expect(
    frame.getByRole('button', {
      name: 'Edit title, Hidden client title',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    frame.getByRole('button', {
      name: 'Edit description, Visible description',
      exact: true,
    }),
  ).toBeVisible();
  await frame
    .getByRole('button', {
      name: 'Edit description, Visible description',
      exact: true,
    })
    .click();
  const description = frame.getByLabel('Description', { exact: true });
  await description.fill('Edited on the phone preview');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(description).toBeFocused();
  expect(
    await page.getByTestId('responsive-preview-frame').getAttribute('src'),
  ).toContain('inlineHeader=1');

  await dialog.getByRole('button', { name: /Settings/ }).click();
  await closeCustomize(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const regularIframe = page.getByTestId('responsive-preview-frame');
  expect(await regularIframe.getAttribute('src')).not.toContain(
    'inlineHeader=1',
  );
  const regularPreview = page.frameLocator(
    '[data-testid="responsive-preview-frame"]',
  );
  await expect(
    regularPreview.getByRole('button', { name: /Edit title,/ }),
  ).toHaveCount(0);
  await expect(
    regularPreview.getByRole('button', { name: /Edit description,/ }),
  ).toHaveCount(0);
  await expect(
    regularPreview.getByLabel('Description', { exact: true }),
  ).toHaveCount(0);
  await expect(
    regularPreview.getByText('Edited on the phone preview'),
  ).toBeVisible();
});

test('rejects spoofed preview messages and keeps inline edits through save failure', async ({
  page,
}) => {
  const draft = await createDraft(page, {
    title: 'Protected title',
    slug: 'inline-preview-message-guard',
    description: 'Initial description',
  });
  await page.goto(`/page/manage/${draft.id}`);
  await openCustomize(page);

  await page.evaluate((pageId) => {
    const iframe = document.querySelector<HTMLIFrameElement>(
      '[data-testid="responsive-preview-frame"]',
    );
    const message = {
      type: 'pager:inline-header-change',
      version: 1,
      pageId,
      field: 'title',
      value: 'Spoofed title',
    };
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        source: window,
        data: message,
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://attacker.invalid',
        source: iframe?.contentWindow,
        data: message,
      }),
    );
  }, draft.id);
  await expect(
    page
      .frameLocator('[data-testid="responsive-preview-frame"]')
      .getByRole('button', {
        name: 'Edit title, Protected title',
        exact: true,
      }),
  ).toBeVisible();
  expect((await currentDraft(page, draft.id)).title).toBe('Protected title');

  const url = `**/page/api/pages/${draft.id}`;
  await page.route(url, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Inline draft save failed.' }),
    });
  });
  const frame = page.frameLocator('[data-testid="responsive-preview-frame"]');
  await frame
    .getByRole('button', { name: 'Edit title, Protected title', exact: true })
    .click();
  const title = frame.getByLabel('Title', { exact: true });
  await title.fill('Unsent title stays in the field');
  await expect(page.getByTestId('save-state')).toHaveText('Couldn’t save');
  await expect(page.getByRole('alert')).toContainText(
    'Inline draft save failed.',
  );
  await expect(title).toHaveValue('Unsent title stays in the field');

  await page.unroute(url);
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(
    frame.getByRole('button', {
      name: 'Edit title, Unsent title stays in the field',
      exact: true,
    }),
  ).toBeVisible();
  expect((await currentDraft(page, draft.id)).title).toBe(
    'Unsent title stays in the field',
  );
});

test('empty visible header fields expose keyboard-editable placeholders', async ({
  page,
}) => {
  const draft = await createDraft(page, {
    title: '',
    slug: 'inline-preview-empty-fields',
    description: '',
  });
  await page.goto(`/page/manage/${draft.id}`);
  await openCustomize(page);

  const frame = page.frameLocator('[data-testid="responsive-preview-frame"]');
  const titleButton = frame.getByRole('button', {
    name: 'Edit title, Add a title',
    exact: true,
  });
  await titleButton.focus();
  await titleButton.press('Enter');
  const title = frame.getByLabel('Title', { exact: true });
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute('placeholder', 'Add a title');
  await title.fill('A title entered from its empty placeholder');
  await title.press('Escape');

  const descriptionButton = frame.getByRole('button', {
    name: 'Edit description, Add a description',
    exact: true,
  });
  await descriptionButton.focus();
  await descriptionButton.press('Enter');
  const description = frame.getByLabel('Description', { exact: true });
  await expect(description).toBeFocused();
  await expect(description).toHaveAttribute('placeholder', 'Add a description');
  await description.fill('A description entered from its empty placeholder');
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  await expect(description).toBeFocused();
  await expect
    .poll(async () => (await currentDraft(page, draft.id)).description)
    .toBe('A description entered from its empty placeholder');
});

test('published client pages never expose inline edit controls', async ({
  page,
  browser,
}) => {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  const draft = await createDraft(page, {
    title: 'Published read-only title',
    slug: 'published-inline-read-only',
    description: 'Published read-only description',
    albumIds: [albums[0].id],
  });
  const published = await page.request.post(
    `/page/api/pages/${draft.id}/publish`,
    {
      headers,
      data: {
        passwordMode: 'keep',
        password: '',
        expectedDraftRevision: draft.draftRevision,
      },
    },
  );
  expect(published.ok()).toBe(true);

  const visitor = await browser.newPage();
  await visitor.goto('/page/published-inline-read-only');
  await expect(
    visitor.getByRole('heading', {
      name: 'Published read-only title',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    visitor.getByRole('button', { name: /Edit title,/ }),
  ).toHaveCount(0);
  await expect(
    visitor.getByRole('button', { name: /Edit description,/ }),
  ).toHaveCount(0);
  await expect(visitor.getByLabel('Title', { exact: true })).toHaveCount(0);
  await expect(visitor.getByLabel('Description', { exact: true })).toHaveCount(
    0,
  );
  await visitor.close();
});
