import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const requiredFiles = [
  'index.html', 'manifest.webmanifest', 'service-worker.js', 'AGENTS.md', 'README.md',
  'css/styles.css', 'js/app.js', 'js/config.js', 'js/state.js', 'js/physics-model.js',
  'js/radiation-emitter.js', 'js/shield-interaction.js', 'js/gm-counter.js',
  'js/ui-controller.js', 'js/quest-controls.js', 'vendor/aframe.min.js',
  'assets/fonts/Roboto-msdf.json', 'assets/fonts/Roboto-msdf.png',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png'
];

for (const file of requiredFiles) {
  const info = await stat(file);
  assert.ok(info.isFile() && info.size > 0, `${file} must be a non-empty file`);
}

assert.ok((await stat('vendor/aframe.min.js')).size > 1_000_000, 'Local A-Frame bundle appears incomplete');

const authoredRuntimeFiles = requiredFiles.filter((file) =>
  /^(index\.html|manifest\.webmanifest|service-worker\.js|css\/|js\/)/.test(file)
);
for (const file of authoredRuntimeFiles) {
  const contents = await readFile(file, 'utf8');
  assert.doesNotMatch(contents, /(?:src|href)=["']https?:\/\//i, `${file} contains a remote runtime dependency`);
  assert.doesNotMatch(contents, /fetch\(["']https?:\/\//i, `${file} contains a remote runtime fetch`);
}

const html = await readFile('index.html', 'utf8');
for (const marker of [
  'alpha-particle-model', 'beta-particle-model', 'gamma-particle-model',
  'paper-shield', 'aluminium-shield', 'lead-shield', 'quest-shield-grab',
  'Show particle paths', 'EXAM MODEL: LEAD MAKES THE GM READING ZERO (BACKGROUND OMITTED).'
]) {
  if (marker === 'Show particle paths') {
    assert.match(await readFile('README.md', 'utf8'), /Show particle paths/i);
  } else {
    assert.match(html + await readFile('js/radiation-emitter.js', 'utf8'), new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
}

const worker = await readFile('service-worker.js', 'utf8');
for (const file of requiredFiles.filter((value) => /^(index|manifest|css|js|vendor|assets)/.test(value))) {
  assert.ok(worker.includes(file), `${file} is missing from the offline app shell`);
}

console.log(`Project structure check passed (${requiredFiles.length} required runtime/project files).`);
