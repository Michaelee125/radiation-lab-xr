import { chmod, cp, mkdir, rm, writeFile } from 'node:fs/promises';

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
await rm('dist/client/assets/.DS_Store', { force: true });

await cp('README.md', 'dist/README.md');
await cp('docs/部署与测试指南.md', 'dist/部署与测试指南.md');
await cp('scripts/server.js', 'dist/mac-test-server.mjs');
await cp('scripts/启动-Mac-测试.command', 'dist/启动-Mac-测试.command');
await chmod('dist/启动-Mac-测试.command', 0o755);

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
console.log('Built the deployable WebXR package in dist with Mac test launcher and Chinese guide.');
