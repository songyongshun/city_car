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
  const page = await doc.getPage(5);
  const ops = await page.getOperatorList();
  console.log('fnArray length:', ops.fnArray.length);
  let imgCount = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
      const arg = ops.argsArray[i][0];
      const imgName = typeof arg === 'string' ? arg : (arg && (arg.objId ?? arg.xObjectName));
      if (imgName) {
        try {
          const real = await page.objs.get(imgName);
          console.log('found image', imgName, 'type:', real && real.type, 'w:', real && real.width, 'h:', real && real.height, 'data:', real && !!real.data);
          imgCount++;
          if (imgCount >= 2) break;
        } catch (e) { console.log('get failed', imgName, e.message); }
      }
    }
  }
  await page.cleanup();
})().catch(e => console.error(e.message));
