import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  AppError,
  appearanceDefaults,
  type DraftRecord,
  type DraftEditorPage,
  type PageRecord,
} from '../contracts';
import { tokenHash } from './security';

export type ShareRecord = {
  pageId: string;
  albumId: string;
  shareId: string;
  key: string;
  slug: string;
};
export type PageSession = { tokens: Record<string, string> };
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:')
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;',
    );
    const version = Number(
      (this.db.prepare('PRAGMA user_version').get() as { user_version: number })
        .user_version,
    );
    if (version > 2) throw new Error('Database is newer than this application');
    if (version < 1)
      this.db.exec(`
      BEGIN;
      CREATE TABLE pages (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, document TEXT NOT NULL);
      CREATE INDEX pages_owner ON pages(owner_id);
      CREATE TABLE shares (page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE, album_id TEXT NOT NULL, share_id TEXT NOT NULL, key TEXT NOT NULL, slug TEXT NOT NULL, PRIMARY KEY(page_id, album_id));
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE, revision INTEGER NOT NULL, expires_at INTEGER NOT NULL, document TEXT NOT NULL);
      CREATE TABLE branding (page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('logo','banner')), image BLOB NOT NULL, PRIMARY KEY(page_id,kind));
      CREATE TABLE attempts (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, resets_at INTEGER NOT NULL);
      PRAGMA user_version=1;
      COMMIT;
    `);
    if (version < 2) {
      this.db.exec(`BEGIN;
        CREATE TABLE drafts (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, document TEXT NOT NULL);
        CREATE INDEX drafts_owner ON drafts(owner_id);
        CREATE TABLE draft_branding (page_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('logo','banner')), image BLOB NOT NULL, PRIMARY KEY(page_id,kind));
      `);
      try {
        for (const row of this.db
          .prepare('SELECT document FROM pages')
          .all() as { document: string }[]) {
          const page = JSON.parse(row.document) as PageRecord;
          const {
            passwordHash: _password,
            status: _status,
            intent: _intent,
            ...settings
          } = page;
          void _password;
          void _status;
          void _intent;
          this.putDraft({
            ...settings,
            publishedDraftRevision:
              page.status === 'published' ? page.revision : null,
          });
        }
        this.db.exec(
          'INSERT INTO draft_branding SELECT * FROM branding; PRAGMA user_version=2; COMMIT;',
        );
      } catch (cause) {
        this.db.exec('ROLLBACK');
        throw cause;
      }
    }
    // An interrupted external operation remains private until its owner retries it.
    for (const row of this.db.prepare('SELECT document FROM pages').all() as {
      document: string;
    }[]) {
      const page = JSON.parse(row.document) as PageRecord;
      if (page.status === 'syncing') {
        page.status = 'error';
        this.put(page);
      }
    }
  }
  draft(id: string, ownerId: string): DraftRecord {
    const row = this.db
      .prepare('SELECT document FROM drafts WHERE id=? AND owner_id=?')
      .get(id, ownerId) as { document: string } | undefined;
    if (!row) throw new AppError(404, 'Page not found');
    return appearanceDefaults(JSON.parse(row.document));
  }
  putDraft(page: DraftRecord) {
    this.db
      .prepare(
        'INSERT INTO drafts VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document',
      )
      .run(page.id, page.ownerId, JSON.stringify(page));
  }
  editor(id: string, ownerId: string): DraftEditorPage {
    const draft = this.draft(id, ownerId),
      live = this.get(id);
    return {
      ...draft,
      status: live?.status ?? 'draft',
      intent: live?.intent ?? null,
      hasPassword: !!live?.passwordHash,
      revision: live?.revision ?? 0,
      draftRevision: draft.revision,
      publishedRevision: live?.status === 'published' ? live.revision : null,
      publishedSlug: live?.status === 'published' ? live.slug : null,
      hasUnpublishedChanges:
        !live || draft.publishedDraftRevision !== draft.revision,
    };
  }
  editors(ownerId: string) {
    return (
      this.db
        .prepare('SELECT id FROM drafts WHERE owner_id=? ORDER BY rowid DESC')
        .all(ownerId) as { id: string }[]
    ).map((row) => this.editor(row.id, ownerId));
  }
  deleteDraft(id: string) {
    this.db.prepare('DELETE FROM drafts WHERE id=?').run(id);
  }
  draftBranding(id: string, kind: string): Uint8Array | null {
    return (
      (
        this.db
          .prepare(
            'SELECT image FROM draft_branding WHERE page_id=? AND kind=?',
          )
          .get(id, kind) as { image: Uint8Array } | undefined
      )?.image ?? null
    );
  }
  changeDraftBranding(
    page: DraftRecord,
    kind: 'logo' | 'banner',
    image: Uint8Array | null,
  ) {
    this.db.exec('BEGIN');
    try {
      if (image)
        this.db
          .prepare(
            'INSERT INTO draft_branding VALUES (?,?,?) ON CONFLICT(page_id,kind) DO UPDATE SET image=excluded.image',
          )
          .run(page.id, kind, image);
      else
        this.db
          .prepare('DELETE FROM draft_branding WHERE page_id=? AND kind=?')
          .run(page.id, kind);
      page[kind] = !!image;
      page.revision++;
      page.updatedAt = new Date().toISOString();
      this.putDraft(page);
      this.db.exec('COMMIT');
    } catch (cause) {
      this.db.exec('ROLLBACK');
      throw cause;
    }
  }
  commitPublication(page: PageRecord, draft: DraftRecord) {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM branding WHERE page_id=?').run(page.id);
      this.db
        .prepare(
          'INSERT INTO branding SELECT * FROM draft_branding WHERE page_id=?',
        )
        .run(page.id);
      this.put(page);
      draft.publishedDraftRevision = draft.revision;
      this.putDraft(draft);
      this.db.exec('COMMIT');
    } catch (cause) {
      this.db.exec('ROLLBACK');
      throw cause;
    }
  }
  close() {
    this.db.close();
  }
  get(id: string): PageRecord | null {
    const row = this.db
      .prepare('SELECT document FROM pages WHERE id=?')
      .get(id) as { document: string } | undefined;
    return row ? appearanceDefaults(JSON.parse(row.document)) : null;
  }
  owned(id: string, ownerId: string) {
    const page = this.get(id);
    if (!page || page.ownerId !== ownerId)
      throw new AppError(404, 'Page not found');
    return page;
  }
  list(ownerId: string): PageRecord[] {
    return (
      this.db
        .prepare(
          'SELECT document FROM pages WHERE owner_id=? ORDER BY rowid DESC',
        )
        .all(ownerId) as { document: string }[]
    ).map((r) => appearanceDefaults(JSON.parse(r.document)));
  }
  publicPage(slug: string): PageRecord | null {
    const row = this.db
      .prepare('SELECT id FROM pages WHERE slug=?')
      .get(slug) as { id: string } | undefined;
    const page = row ? this.get(row.id) : null;
    return page?.status === 'published' ? page : null;
  }
  put(page: PageRecord) {
    try {
      this.db
        .prepare(
          'INSERT INTO pages VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, document=excluded.document',
        )
        .run(page.id, page.ownerId, page.slug, JSON.stringify(page));
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed: pages.slug'))
        throw new AppError(409, 'This page URL is already in use');
      throw error;
    }
  }
  delete(id: string) {
    this.db.prepare('DELETE FROM pages WHERE id=?').run(id);
  }
  shares(pageId: string): ShareRecord[] {
    return this.db
      .prepare(
        'SELECT page_id AS pageId,album_id AS albumId,share_id AS shareId,key,slug FROM shares WHERE page_id=?',
      )
      .all(pageId) as ShareRecord[];
  }
  putShare(share: ShareRecord) {
    this.db
      .prepare(
        'INSERT INTO shares VALUES (?,?,?,?,?) ON CONFLICT(page_id,album_id) DO UPDATE SET share_id=excluded.share_id,key=excluded.key,slug=excluded.slug',
      )
      .run(share.pageId, share.albumId, share.shareId, share.key, share.slug);
  }
  deleteShare(pageId: string, albumId: string) {
    this.db
      .prepare('DELETE FROM shares WHERE page_id=? AND album_id=?')
      .run(pageId, albumId);
  }
  createSession(page: PageRecord, tokens: Record<string, string>) {
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
    this.db
      .prepare('INSERT INTO sessions VALUES (?,?,?,?,?)')
      .run(
        tokenHash(token),
        page.id,
        page.revision,
        Date.now() + 12 * 60 * 60 * 1000,
        JSON.stringify({ tokens }),
      );
    return token;
  }
  session(token: string | undefined, page: PageRecord): PageSession | null {
    if (!token) return null;
    const row = this.db
      .prepare(
        'SELECT document FROM sessions WHERE token_hash=? AND page_id=? AND revision=? AND expires_at>?',
      )
      .get(tokenHash(token), page.id, page.revision, Date.now()) as
      | { document: string }
      | undefined;
    return row ? JSON.parse(row.document) : null;
  }
  branding(pageId: string, kind: string): Uint8Array | null {
    return (
      (
        this.db
          .prepare('SELECT image FROM branding WHERE page_id=? AND kind=?')
          .get(pageId, kind) as { image: Uint8Array } | undefined
      )?.image ?? null
    );
  }
  putBranding(pageId: string, kind: string, image: Uint8Array) {
    this.db
      .prepare(
        'INSERT INTO branding VALUES (?,?,?) ON CONFLICT(page_id,kind) DO UPDATE SET image=excluded.image',
      )
      .run(pageId, kind, image);
  }
  removeBranding(pageId: string, kind: string) {
    this.db
      .prepare('DELETE FROM branding WHERE page_id=? AND kind=?')
      .run(pageId, kind);
  }
  allowAttempt(bucket: string, limit = 10, window = 15 * 60 * 1000) {
    const now = Date.now();
    this.db.prepare('DELETE FROM attempts WHERE resets_at<?').run(now);
    this.db
      .prepare(
        'INSERT INTO attempts VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1',
      )
      .run(bucket, now + window);
    const row = this.db
      .prepare('SELECT count FROM attempts WHERE bucket=?')
      .get(bucket) as { count: number };
    return row.count <= limit;
  }
}
