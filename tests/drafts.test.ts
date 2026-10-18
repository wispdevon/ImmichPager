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
    expectedDraftRevision: d.draftRevision,
  });
  const draft = store.draft(d.id, 'alice');
  store.changeDraftBranding(draft, 'logo', new Uint8Array([1, 2]));
  d = store.editor(d.id, 'alice');
  expect(store.publicPage('client')?.title).toBe('Client');
  expect(store.branding(d.id, 'logo')).toBeNull();
  expect(store.session(token, store.get(d.id)!)).toEqual({ tokens: {} });
  expect(d.hasUnpublishedChanges).toBe(true);
  d = await drafts.publish('alice', d.id, {
    password: '',
    passwordMode: 'keep',
    expectedDraftRevision: d.draftRevision,
  });
  expect(store.publicPage('client')?.title).toBe('Changed');
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
it('never stores password values in a draft', async () => {
  const { store, drafts } = setup();
  const d = await drafts.save('alice', null, {
    ...values,
    password: 'secret',
    passwordMode: 'set',
  });
  expect(JSON.stringify(store.draft(d.id, 'alice'))).not.toContain('secret');
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
  delete old.headerLayout;
  delete old.customCss;
  store.db
    .prepare('UPDATE drafts SET document=? WHERE id=?')
    .run(JSON.stringify(old), d.id);
  expect(store.draft(d.id, 'alice')).toMatchObject({
    headerLayout: 'below',
    customCss: '',
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
  delete oldLive.headerLayout;
  delete oldLive.customCss;
  store.db
    .prepare('UPDATE pages SET document=? WHERE id=?')
    .run(JSON.stringify(oldLive), d.id);
  expect(store.publicPage('client')).toMatchObject({
    headerLayout: 'below',
    customCss: '',
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
