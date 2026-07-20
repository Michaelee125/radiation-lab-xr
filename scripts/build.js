import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const runtimeEntries = [
  'index.html',
  'manifest.webmanifest',
  'service-worker.js',
  'css',
  'js',
  'vendor',
  'assets'
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist/client', { recursive: true });
await mkdir('dist/server', { recursive: true });

for (const entry of runtimeEntries) {
  await cp(entry, `dist/client/${entry}`, { recursive: true });
}

const worker = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') {
      url.pathname = '/index.html';
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  }
};
`;

await writeFile('dist/server/index.js', worker);
console.log('Built static WebXR site in dist/client with a Cloudflare-compatible worker entry.');
