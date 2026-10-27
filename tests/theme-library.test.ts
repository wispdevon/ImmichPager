import { describe, it, expect } from 'vitest';
import { Store } from '../src/lib/server/store';
import { ThemeLibrary } from '../src/lib/server/theme-library';
import { builtInThemes } from '../src/lib/themes';

describe('personal theme library', () => {
  it('isolates owners, rejects stale writes, and returns metadata in lists', () => {
    const store = new Store(':memory:');
    const library = new ThemeLibrary(store);
    try {
      const saved = library.create('alice', builtInThemes[0]);
      expect(library.list('bob').items).toEqual([]);
      expect(() => library.get('bob', saved.id)).toThrow('Theme not found');
      expect(library.list('alice').items[0]).not.toHaveProperty('definition');
      const changed = library.update(
        'alice',
        saved.id,
        { ...builtInThemes[0], name: 'My studio' },
        saved.revision,
      );
      expect(changed.revision).toBe(saved.revision + 1);
      expect(() =>
        library.update('alice', saved.id, builtInThemes[0], saved.revision),
      ).toThrow('another tab');
      expect(() => library.remove('bob', saved.id, changed.revision)).toThrow(
        'Theme not found',
      );
      library.remove('alice', saved.id, changed.revision);
      expect(library.list('alice').items).toEqual([]);
    } finally {
      store.db.close();
    }
  });
  it('adds schema 4 without copying private page data into themes', () => {
    const store = new Store(':memory:');
    try {
      expect(store.db.prepare('PRAGMA user_version').get()).toEqual({
        user_version: 4,
      });
      expect(new ThemeLibrary(store).list('alice').items).toEqual([]);
    } finally {
      store.db.close();
    }
  });
});

it('keeps page snapshots when saved themes are renamed or deleted', async () => {
  const { applyTheme } = await import('../src/lib/themes');
  const { pageInputSchema } = await import('../src/lib/contracts');
  const store = new Store(':memory:');
  try {
    const library = new ThemeLibrary(store),
      saved = library.create('alice', builtInThemes[0]);
    const page = applyTheme(
      pageInputSchema.parse({ title: 'Client', slug: 'client' }),
      saved.definition,
    );
    const changed = library.update(
      'alice',
      saved.id,
      { ...saved.definition, name: 'Renamed' },
      saved.revision,
    );
    library.remove('alice', saved.id, changed.revision);
    expect(page.pageTheme!.definition.name).toBe('Studio');
    expect(() =>
      library.create('alice', {
        ...builtInThemes[0],
        description: 'x'.repeat(97 * 1024),
      }),
    ).toThrow('96 KiB');
  } finally {
    store.close();
  }
});

it('migrates schema 3 while preserving draft, published, branding, share and session rows byte for byte', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'pager-themes-migrate-')),
    path = join(dir, 'pager.sqlite');
  let store = new Store(path);
  try {
    const { DraftService } = await import('../src/lib/server/drafts');
    const drafts = new DraftService(store, {} as never);
    const d = await drafts.save('alice', null, {
      title: 'Private words',
      slug: 'client',
      blocks: [
        {
          id: 'words',
          type: 'text',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Keep private' }],
              },
            ],
          },
        },
      ],
    });
    const published = {
      ...store.draft(d.id, 'alice'),
      status: 'published' as const,
      passwordHash: null,
      intent: null,
    };
    store.put(published);
    store.putBranding(d.id, 'logo', new Uint8Array([1, 2, 3]));
    store.changeDraftBranding(
      store.draft(d.id, 'alice'),
      'banner',
      new Uint8Array([4, 5, 6]),
    );
    store.createSession(published, {});
    const tables = [
      'pages',
      'drafts',
      'branding',
      'draft_branding',
      'shares',
      'photo_shares',
      'sessions',
    ];
    const before = tables.map((t) =>
      store.db.prepare(`SELECT * FROM ${t}`).all(),
    );
    store.db.exec('DROP TABLE themes; PRAGMA user_version=3');
    store.close();
    store = new Store(path);
    expect(
      tables.map((t) => store.db.prepare(`SELECT * FROM ${t}`).all()),
    ).toEqual(before);
    expect(store.db.prepare('PRAGMA user_version').get()).toEqual({
      user_version: 4,
    });
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

it('searches the complete owner library before paginating and treats query text literally', () => {
  const store = new Store(':memory:');
  try {
    const library = new ThemeLibrary(store);
    for (let n = 0; n < 55; n++)
      library.create('alice', { ...builtInThemes[0], name: `Design ${n}` });
    const target = library.create('alice', {
      ...builtInThemes[0],
      name: 'Unique %_ design',
    });
    library.create('bob', { ...builtInThemes[0], name: 'Unique %_ design' });
    const first = library.list('alice');
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBeTruthy();
    expect(library.list('alice', first.nextCursor!).items).toHaveLength(6);
    expect(library.list('alice', '', '%_').items.map((x) => x.id)).toEqual([
      target.id,
    ]);
  } finally {
    store.close();
  }
});
