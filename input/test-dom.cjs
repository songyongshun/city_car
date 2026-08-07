const fs = require('fs'), path = require('path');
if (typeof Math.sumPrecise !== 'function') Math.sumPrecise = (...v) => v.reduce((a, b) => a + Number(b), 0);
const r = path.join(process.env.APPDATA + '\\npm\\node_modules');
process.env.NODE_PATH = r; require('module').Module._initPaths();

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class {
    constructor(i) { if (Array.isArray(i) && i.length === 6) { this.a=i[0];this.b=i[1];this.c=i[2];this.d=i[3];this.e=i[4];this.f=i[5]; } else { this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0; } }
    translateSelf(tx,ty=0){this.e=this.a*tx+this.c*ty+this.e;this.f=this.b*tx+this.d*ty+this.f;return this;}
    scaleSelf(sx,sy=sx){this.a*=sx;this.b*=sx;this.c*=sy;this.d*=sy;return this;}
  };
}
(async () => {
  const pdfjs = await import('file:///' + path.join(r, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs').replace(/\\/g, '/'));
  const data = new Uint8Array(fs.readFileSync(process.argv[2]));
  try {
    const t = await pdfjs.getDocument({ data, password: '', useSystemFonts: true }).promise;
    console.log('with DOMMatrix polyfill: OK pages', t.numPages);
    await t.destroy();
  } catch (e) { console.error('FAIL', e.message); }
})();
