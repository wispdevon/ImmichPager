import { afterEach, expect, it } from 'vitest';
import { Store } from '../src/lib/server/store';
import { DraftService } from '../src/lib/server/drafts';
import type { Immich } from '../src/lib/server/immich';
const stores: Store[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup() {
  const store = new Store(':memory:');
  stores.push(store);
  const shares = new Map<
    string,
    { id: string; key: string; slug: string; assets: { id: string }[] }
  >();
  let loseResponse = false;
  const native = {
    photo: async (id: string, owner: string) => {
      if (owner !== 'alice' || id === 'foreign')
        throw Error('Photo not available');
      return { id };
    },
    listShares: async () => [...shares.values()],
    createPhotoShare: async (ids: string[], slug: string) => {
      const share = {
        id: slug,
        key: 'secret-' + slug,
        slug,
        assets: ids.map((id) => ({ id })),
      };
      shares.set(slug, share);
      if (loseResponse) {
        loseResponse = false;
        throw Error('response lost');
      }
      return share;
    },
    syncPhotoShare: async (id: string, ids: string[]) => {
      shares.get(id)!.assets = ids.map((id) => ({ id }));
    },
    updateShare: async () => {},
    deleteShare: async (id: string) => {
      shares.delete(id);
    },
  };
  const service = new DraftService(store, native as unknown as Immich);
  const values = (ids: string[]) => ({
    title: 'Photos',
    slug: 'photos',
    blocks: [
      { id: 'highlights', type: 'photos', photos: ids.map((id) => ({ id })) },
    ],
  });
  const publish = async (p: Awaited<ReturnType<typeof service.save>>) =>
    service.publish('alice', p.id, {
      expectedDraftRevision: p.draftRevision,
      passwordMode: 'keep',
      password: '',
    });
  return {
    store,
    shares,
    native,
    service,
    values,
    publish,
    lose: () => {
      loseResponse = true;
    },
  };
}
it('publishes exact photo membership without exposing draft changes', async () => {
  const { service, values, publish, shares, store } = setup();
  let p = await service.save('alice', null, values(['a', 'b']));
  expect(shares.size).toBe(0);
  p = await publish(p);
  expect([...shares.values()][0].assets.map((a) => a.id)).toEqual(['a', 'b']);
  p = await service.save('alice', p.id, {
    ...values(['b', 'c']),
    expectedDraftRevision: p.draftRevision,
  });
  expect([...shares.values()][0].assets.map((a) => a.id)).toEqual(['a', 'b']);
  expect(store.publicPage('photos')?.blocks?.[0]).toMatchObject({
    photos: [{ id: 'a' }, { id: 'b' }],
  });
  await publish(p);
  expect([...shares.values()][0].assets.map((a) => a.id)).toEqual(['b', 'c']);
  await service.operation('alice', p.id, 'unpublish');
  expect(shares.size).toBe(0);
});
it('recovers a lost individual-share response without leaking or duplicating shares', async () => {
  const { service, values, publish, shares, store, lose } = setup();
  const p = await service.save('alice', null, values(['a']));
  lose();
  await expect(publish(p)).rejects.toThrow('incomplete');
  expect(store.publicPage('photos')).toBeNull();
  expect(shares.size).toBe(1);
  await service.operation('alice', p.id, 'retry');
  expect(shares.size).toBe(1);
  expect(store.publicPage('photos')).not.toBeNull();
});
it('refuses foreign photos and permits a text-only publication without native links', async () => {
  const { service, values, publish, shares } = setup();
  await expect(
    service.save('alice', null, values(['foreign'])),
  ).rejects.toThrow();
  const p = await service.save('alice', null, {
    title: 'Text',
    slug: 'text',
    blocks: [{ id: 'intro', type: 'text', heading: 'Welcome' }],
  });
  await publish(p);
  expect(shares.size).toBe(0);
});
