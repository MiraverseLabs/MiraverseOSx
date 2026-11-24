import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Keep project paths on the same drive when node_modules is a Windows junction.
// Storybook's dispatcher launches another Node process, so propagate the flags.
const packageRoot = fileURLToPath(new URL('../node_modules/storybook/', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const entry = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.storybook;
const result = spawnSync(process.execPath, [path.join(packageRoot, entry), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --preserve-symlinks --preserve-symlinks-main`.trim(),
  },
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
