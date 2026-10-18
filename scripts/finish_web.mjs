// Run after `expo export` (see build_web.sh): copies the extra web files into
// dist/ and writes version.json (dictionary fingerprint), the service worker
// and the <head> tags that make the page installable.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const copy = (from, to) => fs.copyFileSync(path.join(root, from), path.join(dist, to));

copy('node_modules/sql.js/dist/sql-wasm-browser.js', 'sql-wasm-browser.js');
copy('node_modules/sql.js/dist/sql-wasm-browser.wasm', 'sql-wasm-browser.wasm');
copy('assets/db/dict.db', 'dict.db');
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png']) copy('web-extras/' + f, f);

const dictHash = createHash('md5').update(fs.readFileSync(path.join(dist, 'dict.db'))).digest('hex').slice(0, 12);
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify({ dict: dictHash }));

let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const base = (JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '').replace(/\/$/, '');
const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1].replace(base + '/', ''));
const precache = ['./', 'index.html', 'favicon.ico', 'sql-wasm-browser.js', 'sql-wasm-browser.wasm', 'manifest.webmanifest', 'icon-192.png', ...scripts];

const build = createHash('md5').update(html + JSON.stringify(precache)).digest('hex').slice(0, 10);
const sw = fs
  .readFileSync(path.join(root, 'web-extras/sw.template.js'), 'utf8')
  .replace('__BUILD__', build)
  .replace('__PRECACHE__', JSON.stringify(precache));
fs.writeFileSync(path.join(dist, 'sw.js'), sw);

const tags = `<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="theme-color" content="#2F6FEB">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Word Explorer">
`;
html = html.replace('</head>', tags + '</head>');
// A relative base lets the manifest and icons resolve under any sub-path.
if (!html.includes('<base')) html = html.replace('<head>', `<head>\n<base href="${base}/">`);
fs.writeFileSync(path.join(dist, 'index.html'), html);
console.log('web build ready: dict', dictHash, 'build', build, 'precache', precache.length, 'files');
