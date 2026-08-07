import fs from 'fs';

// Exact VitePress slugify (the default used to generate heading anchors)
const slugify = (str) =>
  str.normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')   // combining marks
    .replace(/[\u0000-\u001f]/g, '')   // control chars
    .replace(/[\s~`!@#$%^&*()\-_+=\[\]{}|\\;:"“”‘’<>,.?/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase();

const file = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
for (const line of lines) {
  const m = line.match(/^(#{2,6})\s+(.+?)\s*$/);
  if (m) {
    // remove a trailing custom anchor id like {#foo} if present
    const title = m[2].replace(/\s*\{#.*\}\s*$/, '').trim();
    console.log(m[1].length + ' | ' + title + ' => #' + slugify(title));
  }
}
