#!/usr/bin/env node
/**
 * Convert a native-text PDF to Markdown, extracting images into a separate folder.
 *
 * Uses pdfjs-dist (legacy build) directly:
 *   - text via page.getTextContent()
 *   - images via page.getOperatorList() -> page.objs.get(xObjectName)
 * Images are encoded as PNG using only Node built-ins (zlib + custom CRC32),
 * and written into an "<output>-images/" directory. The .md references them
 * with relative paths.
 *
 * Usage: node extract-pdf.mjs <input.pdf> [output.md] [imagesDir]
 */
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const path = require('path');
const fs = require('fs');

const globalRoot = path.join(process.env.APPDATA + '\\npm\\node_modules');
const pdfjs = await import(pathToFileURL(path.join(globalRoot, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);

if (typeof Math.sumPrecise !== 'function') {
  Math.sumPrecise = (...v) => v.reduce((a, b) => a + Number(b), 0);
}

// ------------------------------------------------------------------- op sets
const IMG_OPS = new Set([
  pdfjs.OPS.paintImageXObject,
  pdfjs.OPS.paintInlineImageXObject,
  pdfjs.OPS.paintJpegXObject,
]);
const IMG_MASK_OPS = new Set([pdfjs.OPS.paintImageMaskXObject]);

// --------------------------------------------------------- PNG encoder (pure)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng(width, height, kind, data) {
  let colorType, bytesPerPixel;
  if (kind === 3) { colorType = 6; bytesPerPixel = 4; }        // RGBA
  else if (kind === 2) { colorType = 2; bytesPerPixel = 3; }   // RGB
  else if (kind === 4) { colorType = 0; bytesPerPixel = 1; }   // gray 8bpp
  else if (kind === 1) { colorType = 0; bytesPerPixel = 1; }   // gray 1bpp
  else throw new Error('Unsupported image kind ' + kind);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width * bytesPerPixel + 1));
  let ro = 0;
  if (kind === 1) {
    const rowBytes = Math.ceil(width / 8);
    for (let y = 0; y < height; y++) {
      raw[ro++] = 0;
      for (let x = 0; x < rowBytes; x++) raw[ro++] = data[y * rowBytes + x];
    }
  } else {
    for (let y = 0; y < height; y++) {
      raw[ro++] = 0;
      const rowStart = y * width * bytesPerPixel;
      for (let x = 0; x < width * bytesPerPixel; x++) raw[ro++] = data[rowStart + x];
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
// ---------------------------------------------------------------- text layout
async function textToMarkdown(page) {
  const tc = await page.getTextContent();
  const items = (tc.items || []).filter((it) => it.str && it.str.trim());
  if (!items.length) return [];
  items.sort((a, b) => {
    const ay = -a.transform[5];
    const by = -b.transform[5];
    if (Math.abs(ay - by) > 6) return ay - by;
    return a.transform[4] - b.transform[4];
  });
  const lines = [];
  let cur = { y: null, text: '', lastX: 0 };
  for (const it of items) {
    const y = -it.transform[5];
    const yb = Math.round(y / 4) * 4;
    if (cur.y === null) {
      cur = { y: yb, text: it.str, lastX: it.transform[4] + (it.width || 0) };
    } else if (Math.abs(yb - cur.y) <= 4) {
      const gap = it.transform[4] - cur.lastX;
      cur.text += (gap > 2 ? ' ' : '') + it.str;
      cur.lastX = it.transform[4] + (it.width || 0);
    } else {
      lines.push(cur.text);
      cur = { y: yb, text: it.str, lastX: it.transform[4] + (it.width || 0) };
    }
  }
  if (cur.text) lines.push(cur.text);
  return lines;
}

// ---------------------------------------------------------------------- main
const [input, output, imagesArg] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node extract-pdf.mjs <input.pdf> [output.md] [imagesDir]');
  process.exit(1);
}

const absIn = path.resolve(input);
const outMd = output ? path.resolve(output) : absIn.replace(/\.pdf$/i, '') + '.md';
const baseName = path.basename(outMd, path.extname(outMd));
const imagesDir = path.resolve(imagesArg || path.join(path.dirname(outMd), baseName + '-images'));
fs.mkdirSync(imagesDir, { recursive: true });

const buf = new Uint8Array(fs.readFileSync(absIn));
const doc = await pdfjs.getDocument({ data: buf, password: '', useSystemFonts: true }).promise;

const mdParts = [];
let totalImages = 0;

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  let textLines = [];
  try { textLines = await textToMarkdown(page); } catch (e) { /* keep empty */ }

  const ops = await page.getOperatorList();
  const images = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (!IMG_OPS.has(fn) && !IMG_MASK_OPS.has(fn)) continue;
    const arg = ops.argsArray[i][0];
    let imgName = typeof arg === 'string' ? arg : (arg && (arg.objId ?? arg.xObjectName));
    if (imgName == null) continue;
    let real;
    try { real = await page.objs.get(imgName); } catch (e) { continue; }
    if (!real || !real.data || !real.width) continue;
    const kind = real.kind;
    if (IMG_MASK_OPS.has(fn) && kind !== 1) continue;
    images.push({ name: imgName, width: real.width, height: real.height, kind, data: real.data });
  }

  const seen = new Set();
  for (const im of images) {
    if (seen.has(im.name)) continue;
    seen.add(im.name);
    totalImages++;
    const fname = `page-${p}-img-${totalImages}.png`;
    fs.writeFileSync(path.join(imagesDir, fname), encodePng(im.width, im.height, im.kind, im.data));
    im.file = fname;
  }

  mdParts.push(`## Page ${p}\n`);
  mdParts.push(textLines.length ? textLines.join('\n') : '*（本页无文本内容）*');
  mdParts.push('');
  for (const im of images) {
    if (!im.file) continue;
    mdParts.push(`![${im.name}](./${baseName}-images/${im.file})`);
    mdParts.push('');
  }
  mdParts.push('---');
  mdParts.push('');
  try { await page.cleanup(); } catch (e) { /* ignore */ }
}

const md = `# ${path.basename(absIn, path.extname(absIn))}\n\n${mdParts.join('\n')}`;
fs.writeFileSync(outMd, md, 'utf8');

console.log(JSON.stringify({
  success: true,
  input: absIn,
  output: outMd,
  imagesDir,
  stats: { pages: doc.numPages, mode: 'native', images: totalImages },
}, null, 2));

