#!/usr/bin/env node
/**
 * Wrapper runner for pdf-to-markdown skill conversion.
 * - Polyfills Math.sumPrecise (used by some pdf.js builds, missing in this Node).
 * - Points NODE_PATH at the globally-installed npm modules.
 * - Delegates to the skill's converter with the requested mode.
 */

const path = require('path');

// --- Polyfill for engines missing Math.sumPrecise ---
if (typeof Math.sumPrecise !== 'function') {
  Math.sumPrecise = function sumPrecise(...values) {
    let sum = 0;
    for (const v of values) sum += Number(v);
    return sum;
  };
}

// --- Ensure global npm modules are resolvable ---
const globalRoot = process.env.NPM_GLOBAL_ROOT ||
  path.join(process.env.APPDATA || '', 'npm', 'node_modules');
const existing = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
if (!existing.includes(globalRoot)) {
  existing.push(globalRoot);
}
process.env.NODE_PATH = existing.join(path.delimiter);
require('module').Module._initPaths();

// Route unpdf (used by @opendocsg/pdf2md) to the globally-installed pdfjs-dist legacy
// build, which correctly opens empty-password encrypted PDFs on this Node version.
const unpdfRoot = path.join(globalRoot, '@opendocsg', 'pdf2md', 'node_modules', 'unpdf');
const pdfjsEntry = path.join(globalRoot, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');
try {
  const { pathToFileURL } = require('url');
  const unpdf = require(unpdfRoot);
  unpdf.definePDFJSModule(() => import(pathToFileURL(pdfjsEntry).href));
} catch (e) {
  // If unpdf/pdfjs can't be wired, fall through and let converter attempt default resolution.
}

// --- Parse CLI args (mirrors the skill CLI) ---
const argv = process.argv.slice(2);
const parsed = { input: null, output: null, mode: 'auto' };
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  const next = argv[i + 1];
  switch (arg) {
    case '--input': case '-i': parsed.input = next; i++; break;
    case '--output': case '-o': parsed.output = next; i++; break;
    case '--mode': case '-m': parsed.mode = next; i++; break;
    default:
      if (!arg.startsWith('-') && !parsed.input) parsed.input = arg;
  }
}

(async () => {
  const { convert } = require(path.join(
    'C:\\Users\\swan', '.agents', 'skills', 'pdf-to-markdown', 'scripts', 'lib', 'converter.cjs'
  ));
  const result = await convert({ input: parsed.input, output: parsed.output, mode: parsed.mode });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
})().catch(err => {
  console.error(JSON.stringify({ success: false, error: err.message, stack: err.stack }));
  process.exit(1);
});
