import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const path = require('path');
const fs = require('fs');
const r = path.join(process.env.APPDATA + '\\npm\\node_modules');
const pdfjs = await import(pathToFileURL(path.join(r, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);
(async () => {
  const buf = new Uint8Array(fs.readFileSync('.\\《智能汽车实训》实验指导（python版）-V3.1-20240220.pdf'));
  const doc = await pdfjs.getDocument({ data: buf, password: '', useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  console.log('page.objs type:', typeof page.objs);
  console.log('page.objs keys sample:', page.objs && Object.keys(page.objs).slice(0, 5));
  console.log('page.objs.get exists:', typeof page.objs && typeof page.objs.get);
  const names = page.objs ? Object.keys(page.objs) : [];
  for (const name of names.slice(0, 3)) {
    const obj = page.objs.get(name);
    console.log('obj', name, 'type:', obj && obj.type);
  }
  await page.cleanup();
})().catch(e => console.error(e.message));
