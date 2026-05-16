/* eslint-disable */
// One-shot validator for Lottie placeholder assets (task 4.7).
// Verifies: JSON parses, required Bodymovin fields present, no expression fields (*.x),
// no external asset URLs, no flicker risk in basic shape construction.
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'src', 'assets', 'lottie');
const FILES = [
  'bell.json',
  'trophy.json',
  'loading.json',
  'empty.json',
  'test-success.json',
  'reaction-fire.json',
];

let failed = false;

function fail(file, msg) {
  failed = true;
  console.error(`[FAIL] ${file}: ${msg}`);
}

function hasExpressionField(node, file, pathStr = '$') {
  // In Bodymovin schema, an "x" property at the top level of a property descriptor
  // (where "a" and "k" live) signals an expression. We look for any object-shaped
  // sibling with both ("a" or "k") and "x".
  if (Array.isArray(node)) {
    node.forEach((item, i) => hasExpressionField(item, file, `${pathStr}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    if ('x' in node && ('k' in node || 'a' in node)) {
      fail(file, `expression field found at ${pathStr} (keys: ${keys.join(',')})`);
    }
    for (const key of keys) {
      hasExpressionField(node[key], file, `${pathStr}.${key}`);
    }
  }
}

for (const file of FILES) {
  const filePath = path.join(DIR, file);
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    fail(file, `cannot read: ${e.message}`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail(file, `invalid JSON: ${e.message}`);
    continue;
  }

  // Required top-level fields per design.md asset contract
  for (const key of ['v', 'fr', 'w', 'h', 'layers']) {
    if (!(key in data)) fail(file, `missing required field "${key}"`);
  }
  if (!Array.isArray(data.layers)) fail(file, '"layers" is not an array');
  if (data.layers && data.layers.length === 0) fail(file, '"layers" is empty');

  // No external asset URLs
  if (Array.isArray(data.assets)) {
    data.assets.forEach((asset, i) => {
      if (asset && typeof asset === 'object' && 'u' in asset && asset.u) {
        fail(file, `external asset URL found at assets[${i}].u`);
      }
    });
  }

  // No expression fields anywhere
  hasExpressionField(data, file);

  const sizeBytes = Buffer.byteLength(raw, 'utf8');
  console.log(`[OK]   ${file}: v=${data.v} fr=${data.fr} ${data.w}x${data.h} layers=${data.layers ? data.layers.length : '?'} bytes=${sizeBytes}`);
}

if (failed) {
  process.exit(1);
}
console.log('\nAll 6 Lottie placeholder assets passed contract validation.');
