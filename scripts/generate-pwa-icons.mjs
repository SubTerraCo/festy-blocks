/**
 * Generates PWA PNG icons from public/favicon.svg.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svg = await readFile(join(publicDir, 'favicon.svg'));

const outputs = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'maskable-512x512.png', size: 512, maskable: true },
];

for (const { file, size, maskable } of outputs) {
  let pipeline = sharp(svg, { density: 300 }).resize(size, size, {
    fit: 'contain',
    background: maskable ? { r: 134, g: 59, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (maskable) {
    pipeline = pipeline.extend({
      top: Math.round(size * 0.1),
      bottom: Math.round(size * 0.1),
      left: Math.round(size * 0.1),
      right: Math.round(size * 0.1),
      background: { r: 134, g: 59, b: 255, alpha: 1 },
    });
  }
  await pipeline.png().toFile(join(publicDir, file));
  console.log(`Wrote public/${file}`);
}
