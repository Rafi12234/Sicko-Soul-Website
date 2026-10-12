import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const drop = readFileSync(resolve(root, "frontend/src/components/sections/Drop/index.tsx"), "utf8");
const streets = readFileSync(resolve(root, "frontend/src/components/sections/Streets/index.tsx"), "utf8");
test("New Drop background video is not grayscale filtered", () => {
  assert.match(drop, /<video\s+[\s\S]*?className="h-full w-full object-cover opacity-\[0\.22\]"/);
  assert.doesNotMatch(drop, /className="media-treat h-full w-full object-cover/);
});
test("Both database-backed Streets images use natural colors", () => {
  assert.match(streets, /src=\{images\.primary\.src\}[\s\S]*?className="object-cover"/);
  assert.match(streets, /src=\{images\.secondary\.src\}[\s\S]*?className="object-cover"/);
  assert.doesNotMatch(streets, /className="media-treat object-cover"/);
});
