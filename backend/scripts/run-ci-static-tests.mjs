import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Only non-network, non-mutating static/security tests are run in CI here.
// Do not automatically execute staging/E2E tests against production data.
const backendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const testDir = join(backendRoot, 'tests');
const eligible = /-(?:static|security)\.test\.mjs$/;
const files = readdirSync(testDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && eligible.test(entry.name))
  .map((entry) => join('tests', entry.name))
  .sort();

if (files.length === 0) {
  console.error('ERROR: No CI static/security test files found.');
  process.exit(1);
}

console.log('Running CI static/security tests:');
for (const file of files) console.log(` - ${file}`);
const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: backendRoot,
  stdio: 'inherit',
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
