import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.DEMO_PORT = '3200';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'immichpager-e2e-'));
process.argv.push('--production');
process.on('exit', () =>
  rmSync(process.env.DATA_DIR, { recursive: true, force: true }),
);
await import('./demo.mjs');
