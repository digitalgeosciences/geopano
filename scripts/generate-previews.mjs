/**
 * generate-previews.mjs
 * ---------------------
 * Generates low-resolution JPEG previews (512px wide, quality 35) for every
 * panorama in public/uploads/.  The previews are written to
 * public/uploads/preview/ and used by Pannellum's `preview` option so users
 * see *something* within ~0.5 s while the full-res image streams in.
 *
 * Usage:  node scripts/generate-previews.mjs
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';

const SRC_DIR = 'public/uploads';
const OUT_DIR = 'public/uploads/preview';
const PREVIEW_WIDTH = 512;       // px – matches Pannellum's preview default
const JPEG_QUALITY = 35;          // small enough for instant load (~20-50 KB)

async function main() {
  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const files = await readdir(SRC_DIR);
  const images = files.filter(
    (f) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase()) && !f.startsWith('.')
  );

  console.log(`\n  📸  Generating ${images.length} preview images…\n`);

  for (const file of images) {
    const src = join(SRC_DIR, file);
    const outName = file.replace(extname(file), '.jpg');
    const dst = join(OUT_DIR, outName);

    try {
      const srcStats = await stat(src);
      const srcMB = (srcStats.size / (1024 * 1024)).toFixed(1);

      // Use failOn:'none' to tolerate corrupt JPEG headers/EXIF
      const info = await sharp(src, { failOn: 'none' })
        .resize({ width: PREVIEW_WIDTH })
        .jpeg({ quality: JPEG_QUALITY, progressive: true })
        .toFile(dst);

      const outKB = (info.size / 1024).toFixed(0);
      const savedPct = ((1 - info.size / srcStats.size) * 100).toFixed(0);
      console.log(
        `  ✓  ${file.padEnd(18)} ${srcMB.padStart(5)} MB  →  preview/${outName.padEnd(18)} ${outKB.padStart(4)} KB  (${savedPct}% smaller)`
      );
    } catch (err) {
      console.error(`  ✗  ${file}: ${err.message}`);
    }
  }

  console.log('\n  Done.\n');
}

main();
