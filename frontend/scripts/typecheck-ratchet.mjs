#!/usr/bin/env node
// noImplicitAny ratchet.
//
// The project still compiles with `strict: false`, and enabling noImplicitAny
// globally today would fail on a few hundred pre-existing implicit anys. This
// script records that backlog per file in tsconfig.strict-baseline.json so the
// debt can be cleared feature by feature: a file may drop out of the baseline,
// but no file may gain new implicit anys.
//
//   node scripts/typecheck-ratchet.mjs            check against the baseline
//   node scripts/typecheck-ratchet.mjs --update   lower the baseline to today's counts
//
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'tsconfig.strict-baseline.json');
const update = process.argv.includes('--update');

// Invoke the compiler's own entry point so this works without a shell, on any OS.
const compiler = [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), path.join(root, '..', 'node_modules', 'typescript', 'bin', 'tsc')]
  .find(candidate => existsSync(candidate));
if (!compiler) {
  console.error('TypeScript is not installed; run the install first.');
  process.exit(1);
}

const run = spawnSync(
  process.execPath,
  [compiler, '-p', 'tsconfig.json', '--noEmit', '--noImplicitAny'],
  { cwd: root, encoding: 'utf8' },
);
const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;

const counts = {};
for (const line of output.split(/\r?\n/)) {
  const match = line.match(/^(.+?)\(\d+,\d+\): error TS\d+:/);
  if (!match) continue;
  const file = match[1].replace(/\\/g, '/');
  counts[file] = (counts[file] ?? 0) + 1;
}

const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
if (total === 0 && run.status !== 0) {
  console.error('tsc did not run cleanly; its output was:\n');
  console.error(output.trim() || '(no output)');
  process.exit(1);
}

const sorted = Object.fromEntries(Object.keys(counts).sort().map(file => [file, counts[file]]));

if (update) {
  writeFileSync(baselinePath, `${JSON.stringify({ total, files: sorted }, null, 2)}\n`);
  console.log(`Baseline updated: ${total} implicit anys across ${Object.keys(sorted).length} files.`);
  process.exit(0);
}

let baseline = { total: 0, files: {} };
try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
} catch {
  console.error(`No readable baseline at ${path.relative(root, baselinePath)}; run with --update.`);
  process.exit(1);
}

const regressions = Object.entries(sorted)
  .map(([file, count]) => ({ file, count, before: baseline.files[file] ?? 0 }))
  .filter(entry => entry.count > entry.before)
  .sort((a, b) => b.count - b.before - (a.count - a.before));

const fixed = Object.entries(baseline.files)
  .filter(([file, before]) => (sorted[file] ?? 0) < before)
  .reduce((sum, [file, before]) => sum + before - (sorted[file] ?? 0), 0);

if (regressions.length > 0) {
  console.error(`Implicit-any regressions (${total} total, baseline ${baseline.total}):`);
  for (const entry of regressions) {
    console.error(`  ${entry.file}: ${entry.before} -> ${entry.count}`);
  }
  console.error('\nAnnotate the new values, or run with --update only after clearing them.');
  process.exit(1);
}

console.log(`No new implicit anys (${total} total, baseline ${baseline.total}).`);
if (fixed > 0) {
  console.log(`${fixed} cleared since the baseline; rerun with --update to lower it.`);
}
