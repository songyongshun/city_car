#!/usr/bin/env node
/* Inspect PDF: page count, encryption, image operators per page. */
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
  console.log('numPages:', doc.numPages);
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    let imgOps = 0, paintXObject = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const f = ops.fnArray[i];
      if (f === pdfjs.OPS.paintImageXObject || f === pdfjs.OPS.paintInlineImageXObject || f === pdfjs.OPS.paintJpegXObject) imgOps++;
      if (f === pdfjs.OPS.paintXObject) paintXObject++;
    }
    console.log(`page ${p}: paintImage/Jpeg=${imgOps} paintXObject=${paintXObject}`);
    await page.cleanup();
  }
  await doc.destroy();
})().catch(e => { console.error('ERR', e && e.message, e && e.name); process.exit(1); });
