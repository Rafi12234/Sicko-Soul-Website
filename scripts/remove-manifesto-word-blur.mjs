/**
 * Performance-only migration for the Manifesto reveal. Removes two per-word
 * CSS blur tweens but leaves all existing styling, GSAP motion and code intact.
 * Run from the repository root: node scripts/remove-manifesto-word-blur.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.cwd(), process.argv[2] ?? 'frontend/src/components/sections/Manifesto/index.tsx');
const before = readFileSync(target, 'utf8');
const startBlur = /^([ \t]*)filter:\s*["']blur\(2px\)["'],\s*\r?\n/gm;
const endBlur = /^([ \t]*)filter:\s*["']blur\(0px\)["'],\s*\r?\n/gm;
const oldStarts = [...before.matchAll(startBlur)].length;
const oldEnds = [...before.matchAll(endBlur)].length;

if (oldStarts === 0 && oldEnds === 0) {
  console.log('Manifesto per-word blur not present; no changes made.');
} else if (oldStarts !== 1 || oldEnds !== 1) {
  console.error(`Expected exactly one start and end blur tween; found ${oldStarts}/${oldEnds}. No changes made.`);
  process.exitCode = 1;
} else {
  const after = before.replace(startBlur, '').replace(endBlur, '');
  if (after === before) throw new Error('No changes made unexpectedly');
  writeFileSync(target, after, 'utf8');
  console.log('Removed only the two per-word Manifesto blur tween properties.');
}
