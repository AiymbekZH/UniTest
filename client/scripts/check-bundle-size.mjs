#!/usr/bin/env node
// CI bundle-size guard.
// Reads gzip-compressed sizes of entry chunks in client/dist/assets/ and
// compares against client/scripts/bundle-size-baseline.json.
// Threshold: +10 KB gzip vs baseline. Exits 1 on regression.
//
// On first run (no baseline file): writes the current sizes as the baseline
// and exits 0 with a "Baseline written" message.
//
// To update baseline intentionally: delete baseline file or run with the
// --update flag.
//
// CLI flags:
//   --build    Run `vite build` before measuring (also implicit when dist is missing).
//   --update   Overwrite the baseline file with current sizes and exit 0.
//
// Validates: Requirements 3.1, 3.4
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.resolve(__dirname, '..');
const DIST_ASSETS = path.resolve(CLIENT_ROOT, 'dist', 'assets');
const BASELINE_PATH = path.resolve(__dirname, 'bundle-size-baseline.json');
const THRESHOLD_BYTES = 10 * 1024; // +10 KB gzip per Requirement 3.4

const args = new Set(process.argv.slice(2));
const SHOULD_UPDATE = args.has('--update');
const SHOULD_BUILD = args.has('--build');

// Optional: build first if --build flag was passed (or dist is missing).
if (SHOULD_BUILD || !existsSync(DIST_ASSETS)) {
  console.log('Running `vite build`...');
  const r = spawnSync('npx', ['vite', 'build'], { cwd: CLIENT_ROOT, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error('vite build failed; aborting bundle-size check');
    process.exit(r.status || 1);
  }
}

if (!existsSync(DIST_ASSETS)) {
  console.error(`No dist directory found at ${DIST_ASSETS}. Run with --build or run \`npm run build\` first.`);
  process.exit(1);
}

// Lazy-chunk filter: skip files whose name suggests they are lazy.
// Vite preserves the original module name in the chunk filename, so chunks
// containing LottiePlayer, lottie-web/lottie_light, or any *.json asset are
// excluded. Everything else counts toward the entry budget.
function isLazyChunk(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.map')) return true; // sourcemaps don't count
  if (!lower.endsWith('.js')) return true; // we measure JS only
  // Lottie-related lazy chunks
  if (lower.includes('lottieplayer')) return true;
  if (lower.includes('lottie_light')) return true;
  if (lower.includes('lottie-web')) return true;
  // JSON asset chunks (Vite emits them as foo-<hash>.js when imported via dynamic import())
  // The asset filenames are typed: bell, trophy, loading, empty, test-success, reaction-fire.
  // Match those names defensively.
  const lottieAssetRoots = ['bell', 'trophy', 'loading', 'empty', 'test-success', 'reaction-fire'];
  for (const root of lottieAssetRoots) {
    if (lower.startsWith(root + '-') || lower === root + '.js') return true;
  }
  return false;
}

const files = (await readdir(DIST_ASSETS)).sort();
const entry = [];
for (const f of files) {
  if (isLazyChunk(f)) continue;
  const buf = await readFile(path.join(DIST_ASSETS, f));
  const gz = gzipSync(buf).byteLength;
  entry.push({ file: f, raw: buf.byteLength, gzip: gz });
}
const totalGzip = entry.reduce((acc, e) => acc + e.gzip, 0);

console.log('Entry chunks (gzip):');
for (const e of entry) console.log(`  ${e.file}: ${e.gzip} B`);
console.log(`Total entry gzip: ${totalGzip} B (${(totalGzip / 1024).toFixed(2)} KB)`);

let baseline = null;
if (existsSync(BASELINE_PATH)) {
  try {
    baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
  } catch (e) {
    console.error('baseline file is not valid JSON:', e.message);
    process.exit(1);
  }
}

if (!baseline || SHOULD_UPDATE) {
  await writeFile(
    BASELINE_PATH,
    JSON.stringify({ totalGzip, files: entry, recordedAt: new Date().toISOString() }, null, 2)
  );
  console.log(`Baseline ${baseline ? 'updated' : 'written'} at ${BASELINE_PATH}`);
  process.exit(0);
}

const baselineTotal = Number(baseline.totalGzip ?? 0);
const delta = totalGzip - baselineTotal;
console.log(`Baseline gzip: ${baselineTotal} B`);
console.log(`Delta vs baseline: ${delta >= 0 ? '+' : ''}${delta} B`);

if (delta > THRESHOLD_BYTES) {
  console.error(`\nFAIL: entry bundle gzip grew by ${delta} B (>${THRESHOLD_BYTES} B threshold).`);
  console.error(
    'See Requirement 3.4. If this growth is intentional, regenerate the baseline with: node scripts/check-bundle-size.mjs --update'
  );
  process.exit(1);
}
console.log('\nOK: bundle size within +10 KB threshold of baseline.');
