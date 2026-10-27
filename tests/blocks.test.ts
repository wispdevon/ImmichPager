import { describe, expect, it } from 'vitest';
import {
  normalizeContent,
  blocksSchema,
  hasContent,
  richTextSchema,
} from '../src/lib/blocks';

describe('page building blocks', () => {
  it('converts a legacy album list without changing its ordering', () => {
    const page = normalizeContent({
      albumIds: ['b', 'a'],
      order: 'manual' as const,
    });
    expect(page.blocks).toEqual([
      {
        id: 'legacy-albums',
        type: 'albums',
        heading: '',
        albumIds: ['b', 'a'],
        layout: 'cards',
        order: 'manual',
        grouping: 'year',
      },
    ]);
  });
  it('derives a unique album share set across repeated blocks', () => {
    const blocks = blocksSchema.parse([
      { id: 'one', type: 'albums', albumIds: ['b', 'a'] },
      { id: 'two', type: 'albums', albumIds: ['a'] },
    ]);
    expect(normalizeContent({ blocks }).albumIds).toEqual(['b', 'a']);
    expect(() => normalizeContent({ blocks, albumIds: ['different'] })).toThrow(
      'conflict',
    );
  });
  it('accepts photo-only and text-only pages but not empty content', () => {
    expect(
      hasContent(
        blocksSchema.parse([
          { id: 'photos', type: 'photos', photos: [{ id: 'asset' }] },
        ]),
      ),
    ).toBe(true);
    expect(
      hasContent(
        blocksSchema.parse([
          {
            id: 'text',
            type: 'text',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Hello' }],
                },
              ],
            },
          },
        ]),
      ),
    ).toBe(true);
    expect(
      hasContent(blocksSchema.parse([{ id: 'empty', type: 'text' }])),
    ).toBe(false);
  });
  it('rejects duplicate identities and unsupported rich text or link protocols', () => {
    expect(
      blocksSchema.safeParse([
        { id: 'x', type: 'albums' },
        { id: 'x', type: 'photos' },
      ]).success,
    ).toBe(false);
    expect(
      richTextSchema.safeParse({
        type: 'doc',
        content: [{ type: 'script', text: 'evil' }],
      }).success,
    ).toBe(false);
    expect(
      richTextSchema.safeParse({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [
                  { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                ],
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

it('migrates v2 content while retaining published capabilities and sessions', async () => {
  const { Store } = await import('../src/lib/server/store');
  const { parsePageInput } = await import('../src/lib/contracts');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = mkdtempSync(join(tmpdir(), 'pager-block-migration-'));
  const path = join(directory, 'pager.sqlite');
  let store = new Store(path);
  try {
    const {
      password: _password,
      passwordMode: _mode,
      ...settings
    } = parsePageInput({
      title: 'Legacy',
      slug: 'legacy',
      albumIds: ['b', 'a'],
      order: 'manual',
    });
    void _password;
    void _mode;
    const page = {
      ...settings,
      id: 'legacy',
      ownerId: 'alice',
      status: 'published' as const,
      intent: null,
      revision: 7,
      passwordHash: 'existing-hash',
      logo: false,
      banner: false,
      createdAt: '',
      updatedAt: '',
    };
    store.put(page);
    store.putDraft({
      ...settings,
      id: page.id,
      ownerId: 'alice',
      revision: 8,
      publishedDraftRevision: 7,
      logo: false,
      banner: false,
      createdAt: '',
      updatedAt: '',
    });
    store.putShare({
      pageId: page.id,
      albumId: 'a',
      shareId: 'native-id',
      key: 'native-key',
      slug: 'native-slug',
    });
    const session = store.createSession(page, { a: 'cookie' });
    store.db.exec(
      'DROP TABLE themes; DROP TABLE photo_shares; PRAGMA user_version=2',
    );
    store.close();
    store = new Store(path);
    expect(store.publicPage('legacy')?.blocks?.[0]).toMatchObject({
      albumIds: ['b', 'a'],
      order: 'manual',
      layout: 'cards',
      grouping: 'year',
    });
    expect(store.shares(page.id)[0].key).toBe('native-key');
    expect(store.session(session, store.get(page.id)!)?.tokens.a).toBe(
      'cookie',
    );
    expect(store.editor(page.id, 'alice').hasUnpublishedChanges).toBe(false);
    expect(store.db.prepare('PRAGMA user_version').get()).toEqual({
      user_version: 4,
    });
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
