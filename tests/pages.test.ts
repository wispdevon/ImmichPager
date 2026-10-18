import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Store } from '../src/lib/server/store';
import { PageService } from '../src/lib/server/pages';
import type { Immich, NativeShare } from '../src/lib/server/immich';
import { parsePageInput } from '../src/lib/contracts';
import { hashPassword, verifyPassword } from '../src/lib/server/security';

class FakeImmich {
  shares = new Map<string, NativeShare>();
  passwords = new Map<string, string | null>();
  failDelete = false;
  async albums() { return [{ id: 'a', albumName: 'January', ownerId: 'alice', assetCount: 4 }]; }
  async album(id: string) { return (await this.albums()).find(a => a.id === id)!; }
  async listShares() { return [...this.shares.values()]; }
  async createShare(albumId: string, slug: string, password: string | null) {
    const share = { id: slug, key: `key-${slug}`, slug, album: { id: albumId } } as NativeShare;
    this.shares.set(share.id, share); this.passwords.set(share.id, password); return share;
  }
  async updateShare(id: string, password: string | null) { this.passwords.set(id, password); }
  async deleteShare(id: string) { if (this.failDelete) throw Error('offline'); this.shares.delete(id); }
}

describe('page ownership and share lifecycle', () => {
  let store: Store;
  let immich: FakeImmich;
  let pages: PageService;
  beforeEach(() => { store = new Store(':memory:'); immich = new FakeImmich(); pages = new PageService(store, immich as unknown as Immich); });
  afterEach(() => store.close());
  const input = () => parsePageInput({ title: 'Acme photography', slug: 'acme', albumIds: ['a'] });

  it('creates drafts without publishing albums', async () => {
    const page = await pages.save('alice', null, input());
    expect(page.status).toBe('draft'); expect(immich.shares.size).toBe(0);
  });
  it('hides another photographer’s pages and refuses their album', async () => {
    const page = await pages.save('alice', null, input());
    expect(() => store.owned(page.id, 'bob')).toThrow();
    expect(store.list('bob')).toEqual([]);
    await expect(pages.save('bob', null, input())).rejects.toThrow();
  });
  it('reserves system routes and prevents duplicate global slugs', async () => {
    for (const slug of ['manage', 'api', 'assets', 'media', 'health', 'ready', 'Bad/Path']) {
      expect(() => parsePageInput({ title: 'A', slug })).toThrow();
    }
    await pages.save('alice', null, input());
    await expect(pages.save('alice', null, input())).rejects.toThrow();
  });
  it('publishes dedicated password-protected shares and preserves the URL', async () => {
    const page = await pages.save('alice', null, { ...input(), passwordMode: 'set', password: 'client-pin' });
    await pages.publish('alice', page.id, 'client-pin');
    expect(store.owned(page.id, 'alice').status).toBe('published');
    expect([...immich.passwords.values()]).toEqual(['client-pin']);
    const renamed = await pages.save('alice', page.id, { ...input(), title: 'Acme shoots' });
    expect(renamed.slug).toBe('acme'); expect(renamed.status).toBe('published');
  });
  it('fails closed when revocation fails and can retry without creating duplicates', async () => {
    const page = await pages.save('alice', null, input());
    await pages.publish('alice', page.id, '');
    immich.failDelete = true;
    await expect(pages.unpublish('alice', page.id)).rejects.toThrow();
    expect(store.owned(page.id, 'alice').status).toBe('error');
    expect(store.publicPage('acme')).toBeNull();
    immich.failDelete = false;
    await pages.retry('alice', page.id, '');
    expect(store.owned(page.id, 'alice').status).toBe('draft');
    expect(immich.shares.size).toBe(0);
  });
  it('invalidates existing client sessions after membership or password changes', async () => {
    const page = await pages.save('alice', null, input());
    await pages.publish('alice', page.id, '');
    const current = store.owned(page.id, 'alice');
    const token = store.createSession(current, {});
    expect(store.session(token, current)).not.toBeNull();
    await pages.save('alice', page.id, { ...input(), passwordMode: 'set', password: 'new-password' });
    expect(store.session(token, store.owned(page.id, 'alice'))).toBeNull();
    expect(store.publicPage('acme')).toBeNull();
  });
  it('adopts a native share created before an interrupted response', async () => {
    const page = await pages.save('alice', null, input());
    const slug = `pager-${page.id}-a`;
    await immich.createShare('a', slug, null);
    await pages.publish('alice', page.id, '');
    expect(immich.shares.size).toBe(1);
    expect(store.shares(page.id)[0].shareId).toBe(slug);
  });
});

describe('password hashing', () => {
  it('salts hashes and rejects the wrong password', async () => {
    const hash = await hashPassword('123456');
    expect(hash).not.toContain('123456');
    expect(await verifyPassword('123456', hash)).toBe(true);
    expect(await verifyPassword('654321', hash)).toBe(false);
    expect(await hashPassword('123456')).not.toBe(hash);
  });
});
