import { expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/lib/server/store';
import { parsePageInput, type PageRecord } from '../src/lib/contracts';
it('preserves pages and sessions on restart, and recovers interrupted synchronization privately', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pager-store-'));
  const file = join(directory, 'pager.sqlite');
  let store = new Store(file);
  try {
    const {
      password: _password,
      passwordMode: _mode,
      ...settings
    } = parsePageInput({ title: 'Acme', slug: 'acme' });
    void _password;
    void _mode;
    const page: PageRecord = {
      ...settings,
      id: 'page',
      ownerId: 'alice',
      status: 'published',
      intent: null,
      revision: 1,
      passwordHash: null,
      logo: false,
      banner: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    store.put(page);
    const session = store.createSession(page, { a: 'native-authorization' });
    store.close();
    store = new Store(file);
    expect(store.publicPage('acme')?.title).toBe('Acme');
    expect(store.session(session, page)?.tokens.a).toBe('native-authorization');
    store.put({ ...page, status: 'syncing', intent: 'unpublish' });
    store.close();
    store = new Store(file);
    expect(store.owned(page.id, 'alice').status).toBe('error');
    expect(store.owned(page.id, 'alice').intent).toBe('unpublish');
    expect(store.publicPage('acme')).toBeNull();
    expect(store.allowAttempt('test', 1)).toBe(true);
    expect(store.allowAttempt('test', 1)).toBe(false);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
