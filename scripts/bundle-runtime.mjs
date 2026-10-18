import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// The bundle contains compiled JavaScript, not this workstation's native modules.
// Install production dependencies inside the target-architecture Docker image.
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.deploy/runtime');
await readFile(resolve(root, 'build/handler.js'));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of [
  'build',
  'server',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'LICENSE',
  'NOTICE',
]) {
  await cp(resolve(root, file), resolve(output, file), { recursive: true });
}
await cp(resolve(root, 'Dockerfile.runtime'), resolve(output, 'Dockerfile'));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
await writeFile(
  resolve(output, 'bundle.json'),
  JSON.stringify({ revision, createdAt: new Date().toISOString() }, null, 2),
);
console.log('Runtime Docker build context: .deploy/runtime');
