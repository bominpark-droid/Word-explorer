import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2]; const port = +process.argv[3] || 8081;
const types = { '.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.db':'application/octet-stream','.png':'image/png','.ico':'image/x-icon','.json':'application/json','.ttf':'font/ttf' };
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(root,p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root,'index.html');
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
  fs.createReadStream(f).pipe(res);
}).listen(port);
