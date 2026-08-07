import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
if (typeof Math.sumPrecise !== 'function') Math.sumPrecise = (...v) => v.reduce((a,b)=>a+Number(b),0);

const r = path.join(process.env.APPDATA + '\\npm\\node_modules');
process.env.NODE_PATH = r; require('module').Module._initPaths();
const unpdf = require(path.join(r, '@opendocsg', 'pdf2md', 'node_modules', 'unpdf'));

await unpdf.definePDFJSModule(() => import(pathToFileURL(path.join(r, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href));
const pdfjs = await unpdf.getResolvedPDFJS();
console.log('pdfjs version:', pdfjs.version, '| workerSrc:', pdfjs.GlobalWorkerOptions && pdfjs.GlobalWorkerOptions.workerSrc);

(async () => {
  const data = new Uint8Array(fs.readFileSync(process.argv[2]));
  // 1) direct via resolved pdfjs
  try {
    const t = await pdfjs.getDocument({ data, password: '', useSystemFonts: true }).promise;
    console.log('direct legacy OK pages:', t.numPages);
    await t.destroy();
  } catch (e) { console.error('direct FAIL:', e.message); }
  // 2) via unpdf getDocumentProxy
  try {
    const d = await unpdf.getDocumentProxy(data, { verbosity: 0, password: '' });
    console.log('unpdf getDocumentProxy OK pages:', d.numPages);
    await d.destroy();
  } catch (e) { console.error('unpdf getDocumentProxy FAIL:', e.message); }
})();


