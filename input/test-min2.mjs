#!/usr/bin/env node
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const path = require('path');
const fs = require('fs');
const r = path.join(process.env.APPDATA + '\\npm\\node_modules');
const pdfjs = await import(pathToFileURL(path.join(r, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);

if (typeof Math.sumPrecise !== 'function') {
  Math.sumPrecise = (...v) => v.reduce((a, b) => a + Number(b), 0);
}

(async () => {
  const buf = new Uint8Array(fs.readFileSync(process.argv[2]));
  const doc = await pdfjs.getDocument({ data: buf, password: '', useSystemFonts: true }).promise;
  console.log('opened pages:', doc.numPages);
  await doc.destroy();
})().catch(e => { console.error('FAIL', e.message, '| name:', e.name); process.exit(1); });

