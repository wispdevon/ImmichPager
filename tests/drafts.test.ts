import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/lib/server/store';
import { DraftService } from '../src/lib/server/drafts';
import type { Immich } from '../src/lib/server/immich';
const stores: Store[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup() {
  const store = new Store(':memory:');
  stores.push(store);
  const links = new Map();
  const upstream = {
    album: vi.fn(async () => ({ id: 'a', ownerId: 'alice' })),
    listShares: vi.fn(async () => [...links.values()]),
    createShare: vi.fn(async (album: string, slug: string) => {
      const s = { id: slug, key: slug, slug, album: { id: album } };
      links.set(slug, s);
      return s;
    }),
    updateShare: vi.fn(async () => {}),
    deleteShare: vi.fn(async () => {}),
  };
  return {
    store,
    upstream,
    drafts: new DraftService(store, upstream as unknown as Immich),
  };
}
const values = { title: 'Client', slug: 'client', albumIds: ['a'] };
it('saves incomplete private drafts without native links', async () => {
  const { store, drafts, upstream } = setup();
  const d = await drafts.save('alice', null, {
    title: '',
    slug: '',
    albumIds: [],
  });
  expect(store.get(d.id)).toBeNull();
  expect(store.editor(d.id, 'alice').title).toBe('');
  expect(upstream.createShare).not.toHaveBeenCalled();
  await expect(
    drafts.publish('alice', d.id, {
      password: '',
      passwordMode: 'keep',
      expectedDraftRevision: d.draftRevision,
    }),
  ).rejects.toThrow();
});
it('keeps live settings, branding and sessions unchanged until publication', async () => {
  const { store, drafts, upstream } = setup();
  let d = await drafts.save('alice', null, values);
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  const live = store.get(d.id)!;
  const token = store.createSession(live, {});
  d = await drafts.save('alice', d.id, {
    ...values,
    title: 'Changed',
    clientUi: { ...d.clientUi, showTitle: false },
    galleryStyle: { ...d.galleryStyle, contentWidth: 1280 },
    expectedDraftRevision: d.draftRevision,
  });
  const draft = store.draft(d.id, 'alice');
  store.changeDraftBranding(draft, 'logo', new Uint8Array([1, 2]));
  d = store.editor(d.id, 'alice');
  expect(store.publicPage('client')?.title).toBe('Client');
  expect(store.publicPage('client')?.clientUi.showTitle).toBe(true);
  expect(store.publicPage('client')?.galleryStyle.contentWidth).toBe(1600);
  expect(store.branding(d.id, 'logo')).toBeNull();
  expect(store.session(token, store.get(d.id)!)).toEqual({ tokens: {} });
  expect(d.hasUnpublishedChanges).toBe(true);
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(store.publicPage('client')?.title).toBe('Changed');
  expect(store.publicPage('client')?.clientUi.showTitle).toBe(false);
  expect(store.publicPage('client')?.galleryStyle.contentWidth).toBe(1280);
  expect(store.branding(d.id, 'logo')).toEqual(new Uint8Array([1, 2]));
  expect(d.hasUnpublishedChanges).toBe(false);
  expect(upstream.createShare).toHaveBeenCalledTimes(1);
});
it('rejects stale revisions and another owner', async () => {
  const { store, drafts } = setup();
  const d = await drafts.save('alice', null, values);
  await expect(
    drafts.save('alice', d.id, { ...values, expectedDraftRevision: 0 }),
  ).rejects.toThrow('another tab');
  expect(() => store.editor(d.id, 'bob')).toThrow('not found');
  await expect(
    drafts.publish('alice', d.id, {
      password: '',
      passwordMode: 'keep',
      expectedDraftRevision: 0,
    }),
  ).rejects.toThrow('another tab');
});
it('reviews changes only for the owner and the expected saved draft revision', async () => {
  const { store, drafts } = setup();
  let page = await drafts.save('alice', null, values);
  store.changeDraftBranding(
    store.draft(page.id, 'alice'),
    'logo',
    new Uint8Array([1]),
  );
  page = store.editor(page.id, 'alice');
  page = await drafts.publish('alice', page.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: page.draftRevision,
  });
  store.changeDraftBranding(
    store.draft(page.id, 'alice'),
    'logo',
    new Uint8Array([2]),
  );
  page = store.editor(page.id, 'alice');
  page = await drafts.save('alice', page.id, {
    ...values,
    title: 'Updated title',
    albumIds: ['a', 'new-album'],
    expectedDraftRevision: page.draftRevision,
  });

  const review = drafts.review('alice', page.id, page.draftRevision);
  expect(review).toMatchObject({
    currentlyPublished: true,
    previousSlug: 'client',
    addedAlbumIds: ['new-album'],
    removedAlbumIds: [],
    appearanceChanges: ['title', 'logo'],
  });
  expect(JSON.stringify(review)).not.toMatch(
    /passwordHash|source-pin|shareId|native-cookie/,
  );
  expect(() => drafts.review('bob', page.id, page.draftRevision)).toThrow(
    'not found',
  );
  expect(() => drafts.review('alice', page.id, page.draftRevision - 1)).toThrow(
    'another tab',
  );
  const publishInput = {
    password: '',
    passwordMode: 'keep' as const,
    expectedDraftRevision: review.draftRevision,
    expectedPublishedRevision: review.expectedPublishedRevision,
  };
  await drafts.publish('alice', page.id, publishInput);
  await drafts.operation('alice', page.id, 'unpublish');
  const unpublished = store.editor(page.id, 'alice');
  await drafts.publish('alice', page.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: unpublished.draftRevision,
    expectedPublishedRevision: null,
  });
  await expect(drafts.publish('alice', page.id, publishInput)).rejects.toThrow(
    'live page changed since this review',
  );
});
it('never stores password values in a draft', async () => {
  const { store, drafts } = setup();
  const d = await drafts.save('alice', null, {
    ...values,
    password: 'secret',
    passwordMode: 'set',
  });
  expect(JSON.stringify(store.draft(d.id, 'alice'))).not.toContain('secret');
});

it('duplicates only an owned page design into an empty private draft', async () => {
  const { store, drafts, upstream } = setup();
  let source = await drafts.save('alice', null, {
    allowDownload: false,
    title: 'Acme monthly work',
    slug: 'acme-monthly-work',
    description: 'Client-specific copy',
    albumIds: ['a'],
    theme: 'light',
    background: '#112233',
    foreground: '#ddeeff',
    accent: '#abcdef',
    alignment: 'center',
    headerLayout: 'overlay',
    headerSize: 'tall',
    logoSize: 112,
    titleSize: 3.5,
    descriptionSize: 1.25,
    headerSpacing: 3.5,
    customCss: ':scope { --pager-accent: #abcdef; }',
    clientUi: {
      showBanner: false,
      showLogo: true,
      showTitle: true,
      showDescription: false,
      showBrowsingControls: true,
      showAlbumSearch: false,
      showMonthFilter: true,
      showYearNavigation: true,
      showResultsCount: true,
      showAlbums: true,
      showAlbumCovers: true,
      showAlbumTitles: false,
      showAlbumDates: true,
      showAlbumItemCounts: true,
      showSharedLabels: false,
      showYearHeadings: true,
      showYearCounts: false,
      allowYearCollapse: true,
      showBranding: false,
    },
    galleryStyle: {
      fontFamily: 'system',
      titleFontWeight: 700,
      bodyFontSize: 1.1,
      bodyFontWeight: 500,
      cardTitleSize: 1.25,
      cardTitleWeight: 650,
      contentWidth: 1280,
      pagePadding: 24,
      gridMinWidth: 240,
      gridRowGap: 24,
      gridColumnGap: 12,
      coverAspectRatio: 1.5,
      cardRadius: 8,
      hoverTreatment: 'lift',
    },
    bannerPosition: 28,
    order: 'manual',
  });
  store.changeDraftBranding(
    store.draft(source.id, 'alice'),
    'logo',
    new Uint8Array([1, 2, 3]),
  );
  store.changeDraftBranding(
    store.draft(source.id, 'alice'),
    'banner',
    new Uint8Array([4, 5, 6]),
  );
  source = store.editor(source.id, 'alice');
  source = await drafts.publish('alice', source.id, {
    password: 'source-pin',
    passwordMode: 'set',
    expectedDraftRevision: source.draftRevision,
  });

  const duplicate = await drafts.duplicateDesign('alice', source.id);

  expect(duplicate.id).not.toBe(source.id);
  expect(duplicate).toMatchObject({
    ownerId: 'alice',
    allowDownload: true,
    title: '',
    description: '',
    slug: '',
    albumIds: [],
    order: 'newest',
    theme: 'light',
    background: '#112233',
    foreground: '#ddeeff',
    accent: '#abcdef',
    alignment: 'center',
    headerLayout: 'overlay',
    headerSize: 'tall',
    logoSize: 112,
    titleSize: 3.5,
    descriptionSize: 1.25,
    headerSpacing: 3.5,
    customCss: ':scope { --pager-accent: #abcdef; }',
    clientUi: source.clientUi,
    galleryStyle: source.galleryStyle,
    bannerPosition: 28,
    logo: true,
    banner: true,
    status: 'draft',
    publishedSlug: null,
    publishedRevision: null,
    hasPassword: false,
    hasUnpublishedChanges: true,
  });
  expect(store.get(duplicate.id)).toBeNull();
  expect(store.shares(duplicate.id)).toEqual([]);
  expect(store.draftBranding(duplicate.id, 'logo')).toEqual(
    new Uint8Array([1, 2, 3]),
  );
  expect(store.draftBranding(duplicate.id, 'banner')).toEqual(
    new Uint8Array([4, 5, 6]),
  );
  expect(upstream.createShare).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(duplicate)).not.toContain('source-pin');
  expect(JSON.stringify(duplicate)).not.toContain('key-a');

  store.changeDraftBranding(
    store.draft(duplicate.id, 'alice'),
    'logo',
    new Uint8Array([9]),
  );
  store.changeDraftBranding(store.draft(duplicate.id, 'alice'), 'banner', null);
  expect(store.draftBranding(source.id, 'logo')).toEqual(
    new Uint8Array([1, 2, 3]),
  );
  expect(store.draftBranding(source.id, 'banner')).toEqual(
    new Uint8Array([4, 5, 6]),
  );
  expect(store.draftBranding(duplicate.id, 'logo')).toEqual(
    new Uint8Array([9]),
  );
  expect(store.draftBranding(duplicate.id, 'banner')).toBeNull();
});

it('does not duplicate another owner’s private page design', async () => {
  const { store, drafts } = setup();
  const source = await drafts.save('alice', null, values);

  await expect(drafts.duplicateDesign('bob', source.id)).rejects.toThrow(
    'Page not found',
  );

  expect(store.editors('bob')).toEqual([]);
});

it('migrates v1 published pages, branding, and sessions without changing the live version', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'pager-v1-')),
    path = join(dir, 'pager.sqlite');
  let store = new Store(path);
  try {
    const { parsePageInput } = await import('../src/lib/contracts');
    const {
      password: _password,
      passwordMode: _mode,
      ...settings
    } = parsePageInput(values);
    void _password;
    void _mode;
    const page = {
      ...settings,
      id: 'legacy',
      ownerId: 'alice',
      revision: 7,
      status: 'published' as const,
      intent: null,
      passwordHash: 'existing-password-hash',
      logo: true,
      banner: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    store.put(page);
    store.putBranding(page.id, 'logo', new Uint8Array([3, 4]));
    const token = store.createSession(page, { a: 'native-cookie' });
    store.db.exec(
      'DROP TABLE draft_branding; DROP TABLE drafts; PRAGMA user_version=1',
    );
    store.close();
    store = new Store(path);
    expect(store.editor('legacy', 'alice').draftRevision).toBe(7);
    expect(store.editor('legacy', 'alice').hasPassword).toBe(true);
    expect(JSON.stringify(store.draft('legacy', 'alice'))).not.toContain(
      'existing-password-hash',
    );
    expect(store.editor('legacy', 'alice').hasUnpublishedChanges).toBe(false);
    expect(store.draftBranding('legacy', 'logo')).toEqual(
      new Uint8Array([3, 4]),
    );
    expect(store.publicPage('client')?.revision).toBe(7);
    expect(store.session(token, page)?.tokens.a).toBe('native-cookie');
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

it('recovers a failed publication and commits matching draft branding on retry', async () => {
  const { store, drafts, upstream } = setup();
  let draft = await drafts.save('alice', null, values);
  store.changeDraftBranding(
    store.draft(draft.id, 'alice'),
    'banner',
    new Uint8Array([9, 8]),
  );
  draft = store.editor(draft.id, 'alice');
  upstream.createShare.mockRejectedValueOnce(Error('offline'));
  await expect(
    drafts.publish('alice', draft.id, {
      password: '',
      passwordMode: 'keep',
      expectedDraftRevision: draft.draftRevision,
    }),
  ).rejects.toThrow('sharing is incomplete');
  expect(store.publicPage('client')).toBeNull();
  expect(store.branding(draft.id, 'banner')).toBeNull();
  const result = await drafts.operation('alice', draft.id, 'retry');
  expect('publishedSlug' in result && result.publishedSlug).toBe('client');
  expect(store.branding(draft.id, 'banner')).toEqual(new Uint8Array([9, 8]));
  expect(store.editor(draft.id, 'alice').hasUnpublishedChanges).toBe(false);
});

it('defaults older JSON records and publishes appearance changes only explicitly', async () => {
  const { store, drafts } = setup();
  let d = await drafts.save('alice', null, values);
  const old = store.draft(d.id, 'alice') as Partial<
    import('../src/lib/contracts').DraftRecord
  >;
  delete old.allowDownload;
  delete old.headerLayout;
  delete old.titleSize;
  delete old.descriptionSize;
  delete old.headerSpacing;
  delete old.customCss;
  delete old.headerSize;
  delete old.logoSize;
  store.db
    .prepare('UPDATE drafts SET document=? WHERE id=?')
    .run(JSON.stringify(old), d.id);
  expect(store.draft(d.id, 'alice')).toMatchObject({
    allowDownload: true,
    headerLayout: 'below',
    titleSize: 3,
    descriptionSize: 1.125,
    headerSpacing: 2.5,
    customCss: '',
    headerSize: 'standard',
    logoSize: 80,
  });
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  d = await drafts.save('alice', d.id, {
    ...values,
    headerLayout: 'overlay',
    customCss: '.ip-title { color: coral; }',
    expectedDraftRevision: d.draftRevision,
  });
  const oldLive = store.get(d.id)! as Partial<
    import('../src/lib/contracts').PageRecord
  >;
  delete oldLive.allowDownload;
  delete oldLive.headerLayout;
  delete oldLive.titleSize;
  delete oldLive.descriptionSize;
  delete oldLive.headerSpacing;
  delete oldLive.customCss;
  delete oldLive.headerSize;
  delete oldLive.logoSize;
  store.db
    .prepare('UPDATE pages SET document=? WHERE id=?')
    .run(JSON.stringify(oldLive), d.id);
  expect(store.publicPage('client')).toMatchObject({
    allowDownload: true,
    headerLayout: 'below',
    titleSize: 3,
    descriptionSize: 1.125,
    headerSpacing: 2.5,
    customCss: '',
    headerSize: 'standard',
    logoSize: 80,
  });
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(store.publicPage('client')).toMatchObject({
    headerLayout: 'overlay',
    customCss: '.ip-title { color: coral; }',
  });
  d = await drafts.save('alice', d.id, {
    ...values,
    customCss: '@import "https://example.com";',
    expectedDraftRevision: d.draftRevision,
  });
  expect(store.draft(d.id, 'alice').customCss).toContain('@import');
  await expect(
    drafts.publish('alice', d.id, {
      password: '',
      passwordMode: 'keep',
      expectedDraftRevision: d.draftRevision,
    }),
  ).rejects.toThrow('Custom CSS');
  expect(store.publicPage('client')?.headerLayout).toBe('overlay');
  d = await drafts.save('alice', d.id, {
    ...values,
    customCss: '',
    expectedDraftRevision: d.draftRevision,
  });
  await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(store.publicPage('client')?.customCss).toBe('');
});

it('keeps header composition, sizing, and typography private until the page is published', async () => {
  const { store, drafts } = setup();
  let d = await drafts.save('alice', null, values);
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });

  d = await drafts.save('alice', d.id, {
    ...values,
    headerSize: 'tall',
    logoSize: 112,
    titleSize: 3.5,
    descriptionSize: 1.25,
    headerSpacing: 3.5,
    expectedDraftRevision: d.draftRevision,
  });

  expect(store.draft(d.id, 'alice')).toMatchObject({
    headerSize: 'tall',
    logoSize: 112,
    titleSize: 3.5,
    descriptionSize: 1.25,
    headerSpacing: 3.5,
  });
  expect(store.publicPage('client')).toMatchObject({
    headerSize: 'standard',
    logoSize: 80,
    titleSize: 3,
    descriptionSize: 1.125,
    headerSpacing: 2.5,
  });

  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(store.publicPage('client')).toMatchObject({
    headerSize: 'tall',
    logoSize: 112,
    titleSize: 3.5,
    descriptionSize: 1.25,
    headerSpacing: 3.5,
  });
  expect(d.hasUnpublishedChanges).toBe(false);
});

it('rejects header settings outside their supported ranges', async () => {
  const { drafts } = setup();
  const invalidSettings = [
    { headerSize: 'extra-wide' },
    { logoSize: 47 },
    { logoSize: 161 },
    { titleSize: 1.4 },
    { titleSize: 4.1 },
    { descriptionSize: 0.8 },
    { descriptionSize: 1.6 },
    { headerSpacing: 1.4 },
    { headerSpacing: 5.1 },
  ];

  for (const appearance of invalidSettings) {
    await expect(
      drafts.save('alice', null, {
        title: '',
        slug: '',
        albumIds: [],
        ...appearance,
      }),
    ).rejects.toThrow();
  }
});

it('reviews and publishes download permissions privately on new and retained shares', async () => {
  const { store, drafts, upstream } = setup();
  let d = await drafts.save('alice', null, { ...values, allowDownload: false });
  expect(d.allowDownload).toBe(false);
  expect(upstream.createShare).not.toHaveBeenCalled();
  expect(drafts.review('alice', d.id, d.draftRevision).downloadChange).toEqual({
    before: null,
    after: false,
  });
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(upstream.createShare).toHaveBeenLastCalledWith(
    'a',
    expect.any(String),
    null,
    false,
  );
  expect(upstream.updateShare).toHaveBeenLastCalledWith(
    expect.any(String),
    null,
    expect.any(String),
    false,
  );
  d = await drafts.save('alice', d.id, {
    ...values,
    allowDownload: true,
    expectedDraftRevision: d.draftRevision,
  });
  expect(store.publicPage('client')?.allowDownload).toBe(false);
  const review = drafts.review('alice', d.id, d.draftRevision);
  expect(review.downloadChange).toEqual({ before: false, after: true });
  upstream.updateShare.mockRejectedValueOnce(Error('offline'));
  await expect(
    drafts.publish('alice', d.id, {
      password: '',
      passwordMode: 'keep',
      expectedDraftRevision: d.draftRevision,
      expectedPublishedRevision: review.expectedPublishedRevision,
    }),
  ).rejects.toThrow('sharing is incomplete');
  expect(store.get(d.id)).toMatchObject({
    allowDownload: true,
    intent: 'publish',
    status: 'error',
  });
  await drafts.operation('alice', d.id, 'retry');
  expect(store.publicPage('client')?.allowDownload).toBe(true);
  expect(upstream.createShare).toHaveBeenCalledTimes(1);
  expect(upstream.updateShare).toHaveBeenLastCalledWith(
    expect.any(String),
    null,
    expect.any(String),
    true,
  );
});

it('requires the current password exactly when protected shares must synchronize', async () => {
  const { store, drafts, upstream } = setup();
  let d = await drafts.save('alice', null, values);
  expect(
    drafts.review('alice', d.id, d.draftRevision, 'set').passwordAction,
  ).toBe('set');
  d = await drafts.publish('alice', d.id, {
    password: 'original',
    passwordMode: 'set',
    expectedDraftRevision: d.draftRevision,
  });
  d = await drafts.save('alice', d.id, {
    ...values,
    title: 'New appearance',
    expectedDraftRevision: d.draftRevision,
  });
  expect(
    drafts.review('alice', d.id, d.draftRevision).requiresCurrentPassword,
  ).toBe(false);
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(upstream.updateShare).toHaveBeenCalledTimes(1);
  d = await drafts.save('alice', d.id, {
    ...values,
    allowDownload: false,
    expectedDraftRevision: d.draftRevision,
  });
  expect(drafts.review('alice', d.id, d.draftRevision)).toMatchObject({
    requiresCurrentPassword: true,
    passwordAction: 'keep',
  });
  await expect(
    drafts.publish('alice', d.id, {
      password: 'incorrect',
      passwordMode: 'keep',
      expectedDraftRevision: d.draftRevision,
    }),
  ).rejects.toThrow('current page password');
  expect(store.publicPage('client')?.allowDownload).toBe(true);
  d = await drafts.publish('alice', d.id, {
    password: 'original',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(upstream.updateShare).toHaveBeenLastCalledWith(
    expect.any(String),
    'original',
    expect.any(String),
    false,
  );
  expect(drafts.review('alice', d.id, d.draftRevision, 'set')).toMatchObject({
    passwordAction: 'change',
    requiresCurrentPassword: false,
  });
  d = await drafts.publish('alice', d.id, {
    password: 'replacement',
    passwordMode: 'set',
    expectedDraftRevision: d.draftRevision,
  });
  expect(upstream.updateShare).toHaveBeenLastCalledWith(
    expect.any(String),
    'replacement',
    expect.any(String),
    false,
  );
  expect(drafts.review('alice', d.id, d.draftRevision, 'remove')).toMatchObject(
    { passwordAction: 'remove', requiresCurrentPassword: false },
  );
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'remove',
    expectedDraftRevision: d.draftRevision,
  });
  expect(d.hasPassword).toBe(false);
  expect(upstream.updateShare).toHaveBeenLastCalledWith(
    expect.any(String),
    null,
    expect.any(String),
    false,
  );
  expect(JSON.stringify(store.draft(d.id, 'alice'))).not.toMatch(
    /original|replacement/,
  );
  expect(JSON.stringify(store.get(d.id))).not.toMatch(/original|replacement/);
});

it('does not mark reverted draft settings as unpublished changes', async () => {
  const { drafts } = setup();
  let d = await drafts.save('alice', null, values);
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  d = await drafts.save('alice', d.id, {
    ...values,
    allowDownload: false,
    expectedDraftRevision: d.draftRevision,
  });
  expect(d.hasUnpublishedChanges).toBe(true);
  d = await drafts.save('alice', d.id, {
    ...values,
    allowDownload: true,
    expectedDraftRevision: d.draftRevision,
  });
  expect(d.hasUnpublishedChanges).toBe(false);
});
