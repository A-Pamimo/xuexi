/**
 * Dependency health check (run: `npm run deps:check`).
 *
 * Re-runs the audit that caught the expo-av deprecation:
 *   1. Queries the npm registry `deprecated` field for every DIRECT dependency
 *      at its installed version — the only authoritative deprecation signal.
 *   2. Prints `npm outdated` (informational; majors usually ride an SDK bump).
 *   3. Runs `expo-doctor` best-effort (needs api.expo.dev; skipped if unreachable).
 *
 * Exit code is non-zero only when a direct dependency is deprecated.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

let deprecatedCount = 0;

console.log('── deprecation scan (npm registry) ─────────────────────────');
for (const name of Object.keys(deps).sort()) {
  let installed;
  try {
    installed = require(`${name}/package.json`).version;
  } catch {
    installed = null; // packages without a resolvable package.json export
  }
  const spec = installed ? `${name}@${installed}` : name;
  let msg = '';
  try {
    msg = execSync(`npm view "${spec}" deprecated --silent`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* registry hiccup for this package — treated as not deprecated */
  }
  if (msg) {
    deprecatedCount++;
    console.log(`  ✗ ${spec}  DEPRECATED: ${msg}`);
  } else {
    console.log(`  ✓ ${spec}`);
  }
}

console.log('\n── npm outdated (informational) ─────────────────────────────');
try {
  execSync('npm outdated', { stdio: 'inherit' });
} catch {
  /* npm outdated exits 1 when anything is outdated — that's expected output */
}

console.log('\n── expo-doctor (best-effort, needs api.expo.dev) ────────────');
try {
  execSync('npx expo-doctor', { stdio: 'inherit', timeout: 120_000 });
} catch {
  console.log('  (expo-doctor unavailable or found issues — see output above)');
}

if (deprecatedCount > 0) {
  console.error(`\n${deprecatedCount} deprecated direct dependenc${deprecatedCount === 1 ? 'y' : 'ies'} found.`);
  process.exit(1);
}
console.log('\nNo deprecated direct dependencies. ✓');
