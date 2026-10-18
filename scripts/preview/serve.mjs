// Static server that mimics GitHub Pages: serves <root> under /Word-explorer/
// with no special headers. Usage: node serve.mjs <root> [port] [prefix]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
const port = +process.argv[3] || 8081;
const prefix = process.argv[4] ?? '/Word-explorer';
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.db': 'application/octet-stream',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf', '.css': 'text/css',
};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!p.startsWith(prefix + '/')) {
    res.writeHead(p === prefix ? 301 : 404, p === prefix ? { Location: prefix + '/' } : {});
    return res.end();
  }
  p = p.slice(prefix.length);
  let f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port);
