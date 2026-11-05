// Fixture estático del componente real: no inicia API, base de datos, correo ni una sesión del sistema.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../client/qa/confirm-dialog/dist');
const build = spawnSync(process.execPath, [path.resolve(__dirname, '../../client/node_modules/vite/bin/vite.js'), 'build', '--config', path.resolve(__dirname, '../../client/qa/confirm-dialog/vite.config.ts')], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
  const target = path.resolve(root, `.${name === '/' ? '/index.html' : name}`);
  if (!target.startsWith(root + path.sep) || req.method !== 'GET' || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(target).pipe(res);
}).listen(5180, '127.0.0.1');
