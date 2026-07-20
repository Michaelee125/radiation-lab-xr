import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = process.cwd();
const port = Number.parseInt(process.env.PORT || '4173', 10);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = resolve(root, `.${requestedPath}`);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) throw new Error('Invalid path');
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': filePath.endsWith('service-worker.js') ? 'no-cache' : 'no-store',
      'Service-Worker-Allowed': '/'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Radiation Lab XR running at http://127.0.0.1:${port}`);
});
