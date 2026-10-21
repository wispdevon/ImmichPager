import { spawnSync } from 'node:child_process';

// All targets are local fixtures. Never accept an upstream URL or credentials.
const checks = [
  [
    'API, ownership, image authorization, sharing and gateway contracts',
    [
      'exec',
      'vitest',
      'run',
      'tests/immich.test.ts',
      'tests/photos.test.ts',
      'tests/pages.test.ts',
      'tests/gateway.test.ts',
    ],
  ],
  ['Production gallery and sidebar build', ['build']],
  [
    'Sidebar placement, iframe integration and upstream viewer navigation',
    [
      'exec',
      'playwright',
      'test',
      'e2e/pages.spec.ts',
      '--grep',
      'client album grid|ownership, same-origin writes',
    ],
  ],
];

for (const [label, args] of checks) {
  console.log(`\nCompatibility check: ${label}`);
  const result = spawnSync('pnpm', args, { stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  '\nFixture contracts passed. Live-version compatibility still requires the documented review.',
);
