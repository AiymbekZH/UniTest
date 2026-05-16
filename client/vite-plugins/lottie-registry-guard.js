// Vite plugin: lottie-registry-guard
//
// Implements task 9.1 — build-time gate for the Lottie asset registry.
//
// Two pieces are exported:
//   - validateRegistryAndCredits({ assetFiles, registryKeys, creditsEntries })
//     A pure function that returns { ok, errors }. Kept independent of Vite so
//     the registry-validator property test (9.2) can exercise it directly.
//   - default export: a Vite plugin factory that wires the validator into
//     `buildStart`, reading filesystem state and invoking `this.error` if the
//     contract is violated.
//
// Validates Requirements 4.5, 10.1, 10.2, 10.3 (see Property 20 in design.md).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sibling-path resolution anchored to this file. The plugin lives at
// client/vite-plugins/lottie-registry-guard.js, so the assets directory is one
// level up under src/assets/lottie. Anchoring on import.meta.url means the
// plugin works no matter what `root` Vite resolves at runtime.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'lottie');
const REGISTRY_PATH = path.resolve(ASSETS_DIR, 'registry.js');
const CREDITS_PATH = path.resolve(ASSETS_DIR, 'CREDITS.md');

/**
 * camelCase registry key ("testSuccess") -> kebab-case basename ("test-success").
 * The registry exports camelCase keys; the JSON files and CREDITS sections use
 * kebab-case basenames. Comparison sets are aligned in kebab-case.
 */
export function camelToKebab(s) {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Pure validator. Returns { ok: boolean, errors: string[] }.
 *
 * Inputs:
 *   - assetFiles: string[]   -> kebab-case basenames without extension,
 *                               e.g. ['bell','trophy','test-success',...]
 *   - registryKeys: string[] -> camelCase keys exported by registry.js
 *   - creditsEntries: Array<{ name: string, license: string, commercial: string, uiAttribution: string }>
 *     where `name` is the JSON filename WITH extension, e.g. 'bell.json'.
 *
 * Conditions producing an error (per Property 20):
 *   (a) registryKeys contains duplicates
 *   (b) set(registryKeys-as-kebab) !== set(assetFiles)
 *   (c) at least one registry key has no corresponding entry in creditsEntries
 *       (matched by basename + ".json")
 *   (d) at least one creditsEntry has commercial !== 'yes' or uiAttribution !== 'no'
 */
export function validateRegistryAndCredits({ assetFiles, registryKeys, creditsEntries }) {
  const errors = [];

  // (a) duplicates in registryKeys
  if (registryKeys.length !== new Set(registryKeys).size) {
    const dups = registryKeys.filter((k, i, a) => a.indexOf(k) !== i);
    errors.push(
      `[lottie-registry-guard] duplicate registry keys: ${[...new Set(dups)].join(', ')}`
    );
  }

  // (b) registryKeys (as kebab-case basenames) must match assetFiles set
  const kebabRegistryNames = registryKeys.map(camelToKebab);
  const expectedFromRegistry = new Set(kebabRegistryNames);
  const actualFiles = new Set(assetFiles);
  const missingFiles = [...expectedFromRegistry].filter((f) => !actualFiles.has(f));
  const orphanFiles = [...actualFiles].filter((f) => !expectedFromRegistry.has(f));
  if (missingFiles.length > 0) {
    errors.push(
      `[lottie-registry-guard] registry keys without matching JSON file: ${missingFiles
        .map((n) => n + '.json')
        .join(', ')}`
    );
  }
  if (orphanFiles.length > 0) {
    errors.push(
      `[lottie-registry-guard] asset files without registry entry: ${orphanFiles
        .map((n) => n + '.json')
        .join(', ')}`
    );
  }

  // (c) every registry key must have a CREDITS entry (match by basename + .json)
  const creditsByName = new Map(creditsEntries.map((e) => [e.name, e]));
  for (const kebabName of kebabRegistryNames) {
    const expectedName = kebabName + '.json';
    if (!creditsByName.has(expectedName)) {
      errors.push(`[lottie-registry-guard] missing CREDITS.md entry for: ${expectedName}`);
    }
  }

  // (d) every CREDITS entry must declare commercial=yes and uiAttribution=no
  for (const entry of creditsEntries) {
    if (entry.commercial !== 'yes') {
      errors.push(
        `[CREDITS] ${entry.name}: Commercial use must be 'yes' (got '${entry.commercial}')`
      );
    }
    if (entry.uiAttribution !== 'no') {
      errors.push(
        `[CREDITS] ${entry.name}: UI attribution required must be 'no' (got '${entry.uiAttribution}')`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Parse the CREDITS.md text into entries. Each section starts with `## <filename>.json`.
 * Required fields per section: License, Commercial use, UI attribution required.
 * Tolerant of trailing notes after the filename in the section heading.
 */
export function parseCreditsMd(text) {
  const entries = [];
  // Split on lines starting with `## `; first chunk is the document preamble.
  const sections = text.split(/^##\s+/m).slice(1);
  for (const section of sections) {
    const lines = section.split('\n');
    const headerLine = lines[0].trim();
    // Section header is the filename (e.g. "bell.json"). Stop at whitespace to
    // tolerate trailing parenthetical notes some authors leave on the heading.
    const name = headerLine.split(/\s+/)[0];
    if (!name) continue;
    const fields = {};
    for (const raw of lines.slice(1)) {
      // Match `- **Field**: value` (bold field name, value to end of line).
      const m = /^\s*-\s+\*\*([^*]+)\*\*\s*:\s*(.+?)\s*$/.exec(raw);
      if (!m) continue;
      const k = m[1].trim();
      const v = m[2].trim();
      fields[k] = v;
    }
    entries.push({
      name,
      license: fields['License'] ?? '',
      commercial: fields['Commercial use'] ?? '',
      uiAttribution: fields['UI attribution required'] ?? '',
    });
  }
  return entries;
}

/**
 * Extract top-level keys from `registry.js` source by regex.
 *
 * This is the primary mechanism (instead of dynamic `import()` of registry.js)
 * because registry.js statically imports `lucide-react`, which is a CJS package
 * that Node ESM may refuse to resolve in some plugin contexts. Regex scanning
 * is robust to that — we only need the literal key names, not the runtime
 * values. The pattern matches `<key>: {` shapes that follow lines like
 * `lottieRegistry = Object.freeze({` until the matching closing brace.
 */
export function extractRegistryKeysFromSource(source) {
  // Find the body of `Object.freeze({ ... })` (or a plain `{ ... }`) attached to
  // an export of `lottieRegistry`. We scan forward from the export statement.
  const exportIdx = source.search(/export\s+const\s+lottieRegistry\s*=/);
  if (exportIdx === -1) return [];

  // Find the first `{` after the export statement and walk balanced braces.
  let i = source.indexOf('{', exportIdx);
  if (i === -1) return [];
  const start = i + 1;
  let depth = 1;
  i++;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  const body = source.slice(start, i);

  // Within the literal body, top-level keys are at indentation depth 1 — i.e.
  // they are `<key>: {` patterns whose preceding context is the literal itself.
  // We scan for `<ident>: {` at the start of a line (after optional whitespace),
  // but only at brace depth 0 within `body`.
  const keys = [];
  let d = 0;
  let lineStart = true;
  for (let j = 0; j < body.length; j++) {
    const ch = body[j];
    if (ch === '\n') {
      lineStart = true;
      continue;
    }
    if (lineStart && /\s/.test(ch)) continue;
    if (lineStart && d === 0 && /[A-Za-z_$]/.test(ch)) {
      // Try to consume an identifier followed by optional whitespace then `:` then optional whitespace then `{`.
      const rest = body.slice(j);
      const m = /^([A-Za-z_$][\w$]*)\s*:\s*\{/.exec(rest);
      if (m) {
        keys.push(m[1]);
      }
    }
    lineStart = false;
    if (ch === '{') d++;
    else if (ch === '}') d--;
  }
  return keys;
}

/**
 * Vite plugin factory.
 *
 * `buildStart` reads:
 *   1. all *.json basenames in client/src/assets/lottie/
 *   2. registry.js source (regex-parsed for top-level keys)
 *   3. CREDITS.md (regex-parsed for { name, license, commercial, uiAttribution })
 * and runs validateRegistryAndCredits. Any error fails the build via this.error.
 */
export default function lottieRegistryGuard() {
  return {
    name: 'lottie-registry-guard',

    async buildStart() {
      try {
        // 1. Asset files: every *.json in client/src/assets/lottie/ (basename only).
        const dirEntries = await fs.readdir(ASSETS_DIR);
        const assetFiles = dirEntries
          .filter((n) => n.toLowerCase().endsWith('.json'))
          .map((n) => n.slice(0, -'.json'.length));

        // 2. Registry keys: regex-extract from registry.js source.
        const registrySource = await fs.readFile(REGISTRY_PATH, 'utf8');
        const registryKeys = extractRegistryKeysFromSource(registrySource);

        // 3. CREDITS.md sections.
        const creditsText = await fs.readFile(CREDITS_PATH, 'utf8');
        const creditsEntries = parseCreditsMd(creditsText);

        const { ok, errors } = validateRegistryAndCredits({
          assetFiles,
          registryKeys,
          creditsEntries,
        });
        if (!ok) {
          this.error(errors.join('\n'));
        }
      } catch (err) {
        this.error(
          '[lottie-registry-guard] ' + (err && err.message ? err.message : String(err))
        );
      }
    },
  };
}
