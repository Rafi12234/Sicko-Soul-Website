const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let ts;
try { ts = require(require.resolve('typescript', { paths: [path.join(root, 'frontend')] })); }
catch { ts = require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }
const componentPaths = [
  'frontend/src/components/commerce/StockCount.tsx',
  'frontend/src/components/sections/Rack/index.tsx',
  'frontend/src/components/sections/Rack/RackCard.tsx',
  'frontend/src/components/sections/ProductArchive/ProductRecord.tsx',
  'frontend/src/components/sections/Drop/index.tsx',
  'frontend/src/components/commerce/DropFile.tsx',
  'frontend/src/components/commerce/ProductDetail/index.tsx',
];

test('all affected TS/TSX files parse without syntax diagnostics', () => {
  for (const file of [...componentPaths, 'frontend/src/lib/catalogApi.ts', 'frontend/src/data/products.ts', 'frontend/src/data/rack.ts', 'frontend/src/data/drop.ts']) {
    const result = ts.transpileModule(read(file), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
    });
    assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), [], file);
  }
});

test('stock totals derive from public API availability, not static data', () => {
  const mapper = read('frontend/src/lib/catalogApi.ts');
  const product = read('frontend/src/data/products.ts');
  const backend = read('backend/src/modules/products/products.mapper.ts');
  assert.match(mapper, /availableQty:\s*record\.availability\.availableQty/);
  assert.match(product, /availableQty:\s*number/);
  assert.match(backend, /availableQty\s*=\s*variants\.reduce\(/);
  assert.match(backend, /Math\.max\(0, onHandQty - reservedQty\)/);
});

test('all product grids display numeric stock from API-derived fields', () => {
  for (const relative of [
    'frontend/src/components/sections/Rack/RackCard.tsx',
    'frontend/src/components/sections/ProductArchive/ProductRecord.tsx',
    'frontend/src/components/sections/Drop/index.tsx',
    'frontend/src/components/commerce/DropFile.tsx',
    'frontend/src/components/commerce/ProductDetail/index.tsx',
  ]) {
    const file = read(relative);
    assert.match(file, /<StockCount availableQty=\{(?:product|piece)\.availableQty\}/, relative);
  }
});

test('New Drop and drop files hide stock for unreleased/sealed items', () => {
  const drop = read('frontend/src/components/sections/Drop/index.tsx');
  const detail = read('frontend/src/components/commerce/DropFile.tsx');
  assert.match(drop, /!piece\.sealed &&\s*\(\s*<StockCount/);
  assert.match(detail, /!locked &&\s*\(\s*<div[\s\S]*?<StockCount/);
});

test('product details show total and exact stock per size, including zero', () => {
  const detail = read('frontend/src/components/commerce/ProductDetail/index.tsx');
  const badge = read('frontend/src/components/commerce/StockCount.tsx');
  assert.match(detail, /TOTAL STOCK \/ ALL SIZES/);
  assert.match(detail, /variant\.availableQty\} LEFT/);
  assert.match(detail, /unavailable \? "SOLD OUT"/);
  assert.match(badge, /count === 0 \? "SOLD OUT"/);
  assert.match(badge, /count === 1 \? "UNIT" : "UNITS"/);
});

test('Hero and video controller are untouched from current main', () => {
  const {createHash} = require('node:crypto');
  function blob(file) { const bytes=Buffer.from(read(file));return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex') }
  assert.equal(blob('frontend/src/components/sections/Hero/index.tsx'),'d7121f69e0a1c501134b0b50d309218220752606');
  assert.equal(blob('frontend/src/components/sections/Drop/Drop.module.css'),'e69decf5004d29b4d885c37484ec24c99dc3673f');
  assert.equal(blob('frontend/src/components/sections/Preloader/index.tsx'),'629f0ae107f7f7e01a2fd5693d79c2f990103f65');
});
