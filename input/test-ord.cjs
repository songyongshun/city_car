const path = require('path');
const r = path.join(process.env.APPDATA + '\\npm\\node_modules');
process.env.NODE_PATH = r; require('module').Module._initPaths();
if (typeof Math.sumPrecise !== 'function') Math.sumPrecise = (...v) => v.reduce((a, b) => a + Number(b), 0);

console.log('before unpdf require, DOMMatrix:', typeof globalThis.DOMMatrix);
const unpdf = require(path.join(r, '@opendocsg', 'pdf2md', 'node_modules', 'unpdf'));
console.log('after unpdf require, DOMMatrix:', typeof globalThis.DOMMatrix);
console.log('after unpdf require, ImageData:', typeof globalThis.ImageData);

// now try direct pdfjs load and open
(async () => {
  const pdfjs = await import('file:///' + path.join(r, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs').replace(/\\/g, '/'));
  const fs = require('fs');
  const data = new Uint8Array(fs.readFileSync(process.argv[2]));
  try {
    const t = await pdfjs.getDocument({ data, password: '', useSystemFonts: true }).promise;
    console.log('AFTER unpdf require, direct open OK pages:', t.numPages);
    await t.destroy();
  } catch (e) { console.error('FAIL', e.message); }
})();
