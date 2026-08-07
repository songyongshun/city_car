const path = require('path'), fs = require('fs');
const r = path.join(process.env.APPDATA + '\\npm\\node_modules');
process.env.NODE_PATH = r; require('module').Module._initPaths();
if (typeof Math.sumPrecise !== 'function') Math.sumPrecise = (...v) => v.reduce((a, b) => a + Number(b), 0);
(async () => {
  const pdfjs = await import('file:///' + path.join(r, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs').replace(/\\/g, '/'));
  const data = new Uint8Array(fs.readFileSync(process.argv[2]));
  try {
    const t = await pdfjs.getDocument({ data, password: '', useSystemFonts: true }).promise;
    console.log('minimal cjs open OK pages:', t.numPages);
    await t.destroy();
  } catch (e) { console.error('FAIL', e.message); }
})();
