import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function makeIcon(size, maskable = false) {
  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  const center = size / 2;
  const scale = size / 512;
  const colors = {
    background: [7, 17, 31, 255],
    ring: [73, 215, 255, 255],
    core: [217, 152, 255, 255],
    beam: [118, 239, 182, 255]
  };
  const outer = (maskable ? 172 : 205) * scale;
  const inner = (maskable ? 145 : 178) * scale;
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    scanlines[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.hypot(dx, dy);
      const ring = distance <= outer && distance >= inner;
      const core = distance <= 42 * scale;
      const horizontalBeam = Math.abs(dy) < 13 * scale && Math.abs(dx) < 133 * scale;
      const diagonalA = Math.abs(dy - dx * 0.58) < 10 * scale && distance < 132 * scale;
      const diagonalB = Math.abs(dy + dx * 0.58) < 10 * scale && distance < 132 * scale;
      const pixel = core ? colors.core : (ring ? colors.ring : ((horizontalBeam || diagonalA || diagonalB) ? colors.beam : colors.background));
      const offset = row + 1 + x * 4;
      scanlines.set(pixel, offset);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

await writeFile('assets/icons/icon-192.png', makeIcon(192));
await writeFile('assets/icons/icon-512.png', makeIcon(512));
await writeFile('assets/icons/icon-maskable-512.png', makeIcon(512, true));
console.log('Generated 192 px, 512 px and maskable PWA icons.');
