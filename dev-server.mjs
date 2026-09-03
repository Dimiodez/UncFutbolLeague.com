import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif' };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  let target = normalize(join(root, pathname === '/' ? 'index.html' : pathname.slice(1)));
  if (!target.startsWith(root)) target = join(root, 'index.html');
  try {
    if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
  } catch {
    target = join(root, pathname.includes('.') ? pathname.slice(1) : 'index.html');
  }
  try {
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, () => console.log(`UFL preview: http://localhost:${port}`));
