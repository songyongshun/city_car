#!/usr/bin/env node
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const path = require('path');
const fs = require('fs');
const r = path.join(process.env.APPDATA + '\\npm\\node_modules');
const pdfjs = await import(pathToFileURL(path.join(r, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);
if (typeof Math.sumPrecise !== 'function') Math.sumPrecise = (...v) => v.reduce((a, b) => a + Number(b), 0);

(async () => {
  const buf = new Uint8Array(fs.readFileSync(process.argv[2]));
  const doc = await pdfjs.getDocument({ data: buf, password: '', useSystemFonts: true }).promise;
  const nameByVal = {};
  for (const [nm, val] of Object.entries(pdfjs.OPS)) nameByVal[val] = nm;
  const page = await doc.getPage(5);
  const ops = await page.getOperatorList();
  let shown = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const f = ops.fnArray[i];
    const nm = nameByVal[f];
    if (nm && nm.includes('Image')) {
      const img = ops.argsArray[i][0];
      console.log(`op#${i} fn=${f} name=${nm} argJSON=${JSON.stringify(img)}`);
      if (img && typeof img === 'string') {
        try {
          const real = await page.objs.get(img);
          console.log('  resolved keys:', real && Object.keys(real));
          console.log('  w:', real && real.width, 'h:', real && real.height, 'kind:', real && real.kind, 'bpc:', real && real.bpc);
          if (real && real.data) console.log('  data:', real.data.constructor.name, 'len', real.data.length, 'head', Array.from(real.data.slice(0, 6)));
        } catch (e) { console.log('  resolve err', e.message); }
      }
      if (++shown >= 3) break;
    }
  }
})().catch(e => { console.error('FAIL', e.message, e.name); process.exit(1); });
