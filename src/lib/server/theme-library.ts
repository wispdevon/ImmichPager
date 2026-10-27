import { randomUUID } from 'node:crypto';
import { AppError } from '../contracts';
import {
  themeDefinitionSchema,
  validateThemeSize,
  type ThemeDefinition,
} from '../theme-schema';
import type { Store } from './store';

export type ThemeRecord = {
  id: string;
  revision: number;
  definition: ThemeDefinition;
  updatedAt: string;
};
type Row = {
  id: string;
  revision: number;
  document: string;
  updated_at: string;
};
export class ThemeLibrary {
  constructor(private store: Store) {}
  private validate(value: unknown) {
    try {
      validateThemeSize(value);
    } catch {
      throw new AppError(413, 'Theme files must be no larger than 96 KiB.');
    }
    return themeDefinitionSchema.parse(value);
  }
  get(owner: string, id: string): ThemeRecord {
    const row = this.store.db
      .prepare(
        'SELECT id,revision,document,updated_at FROM themes WHERE id=? AND owner_id=?',
      )
      .get(id, owner) as Row | undefined;
    if (!row) throw new AppError(404, 'Theme not found');
    return {
      id: row.id,
      revision: row.revision,
      definition: JSON.parse(row.document),
      updatedAt: row.updated_at,
    };
  }
  list(owner: string, cursor = '', search = '') {
    const rows = this.store.db
      .prepare(
        "SELECT id,revision,document,updated_at FROM themes WHERE owner_id=? AND id>? AND instr(lower(json_extract(document, '$.name')), lower(?))>0 ORDER BY id LIMIT 51",
      )
      .all(owner, cursor, search.slice(0, 100)) as Row[];
    const items = rows.slice(0, 50).map((row) => {
      const d = JSON.parse(row.document) as ThemeDefinition;
      return {
        id: row.id,
        revision: row.revision,
        name: d.name,
        description: d.description,
        layout: d.layout,
        modes: Object.keys(d.variants),
        updatedAt: row.updated_at,
      };
    });
    return { items, nextCursor: rows.length > 50 ? items.at(-1)!.id : null };
  }
  create(owner: string, value: unknown) {
    const definition = this.validate(value),
      id = randomUUID(),
      now = new Date().toISOString();
    this.store.db
      .prepare('INSERT INTO themes VALUES (?,?,?,?,?)')
      .run(id, owner, 1, JSON.stringify(definition), now);
    return this.get(owner, id);
  }
  update(
    owner: string,
    id: string,
    value: unknown,
    expected: number | undefined,
  ) {
    this.get(owner, id);
    const definition = this.validate(value);
    const result = this.store.db
      .prepare(
        'UPDATE themes SET document=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?',
      )
      .run(
        JSON.stringify(definition),
        new Date().toISOString(),
        id,
        owner,
        expected ?? -1,
      );
    if (!result.changes)
      throw new AppError(
        409,
        'This theme changed in another tab. Reload it before saving.',
      );
    return this.get(owner, id);
  }
  remove(owner: string, id: string, expected: number | undefined) {
    this.get(owner, id);
    const result = this.store.db
      .prepare('DELETE FROM themes WHERE id=? AND owner_id=? AND revision=?')
      .run(id, owner, expected ?? -1);
    if (!result.changes)
      throw new AppError(
        409,
        'This theme changed in another tab. Reload it before deleting.',
      );
    return { deleted: true };
  }
}
