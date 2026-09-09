#!/usr/bin/env node
/**
 * Generates the app icon, adaptive icon and splash image referenced by app.json.
 *
 * Zero dependencies: PNGs are encoded by hand (IHDR / IDAT / IEND) using the
 * zlib deflate that ships with Node. Run with:
 *
 *   npm run assets:generate
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets');

// ─── Palette ──────────────────────────────────────────────────────────────────

const CREAM = [0xf8, 0xf4, 0xef]; // #f8f4ef — app background
const CLAY = [0xb4, 0x6e, 0x48]; // #b46e48 — accent

// ─── PNG encoding ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encodes raw RGB rows (no filter bytes) into an 8-bit truecolour PNG. */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── The mark ─────────────────────────────────────────────────────────────────

/**
 * Draws the Kinesiotherapy mark: an open arc (motion) with a dot resting in its
 * gap. `markRadius` is the radius of the arc's centre line, in pixels.
 */
function renderMark(width, height, markRadius) {
  const cx = width / 2;
  const cy = height / 2;

  const stroke = markRadius * 0.30;      // arc thickness
  const rInner = markRadius - stroke / 2;
  const rOuter = markRadius + stroke / 2;
  const dotR = stroke * 0.62;
  const dotY = cy - markRadius;          // sits in the gap, at the top
  const gapHalf = 0.42;                  // half-width of the arc gap, radians

  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = CREAM[0];
    rgb[i + 1] = CREAM[1];
    rgb[i + 2] = CREAM[2];
  }

  // Only the mark's bounding box needs per-pixel work.
  const pad = 2;
  const x0 = Math.max(0, Math.floor(cx - rOuter - pad));
  const x1 = Math.min(width - 1, Math.ceil(cx + rOuter + pad));
  const y0 = Math.max(0, Math.floor(cy - rOuter - dotR - pad));
  const y1 = Math.min(height - 1, Math.ceil(cy + rOuter + pad));

  const SS = 4; // supersampling factor per axis, for smooth edges
  const samples = SS * SS;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        const py = y + (sy + 0.5) / SS;
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;

          const ddx = px - cx;
          const ddy = py - dotY;
          if (ddx * ddx + ddy * ddy <= dotR * dotR) {
            hits++;
            continue;
          }

          const dx = px - cx;
          const dy = py - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < rInner || dist > rOuter) continue;

          // Angle measured from straight up, wrapped to [-pi, pi].
          let a = Math.atan2(dx, -dy);
          if (a > Math.PI) a -= 2 * Math.PI;
          if (Math.abs(a) <= gapHalf) continue; // the gap

          hits++;
        }
      }

      if (hits === 0) continue;
      const t = hits / samples;
      const o = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) {
        rgb[o + c] = Math.round(CREAM[c] * (1 - t) + CLAY[c] * t);
      }
    }
  }

  return rgb;
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

const TARGETS = [
  // Full-bleed store icon.
  { file: 'icon.png', width: 1024, height: 1024, markRadius: 1024 * 0.30 },
  // Android adaptive foreground: keep the mark inside the 66% safe zone.
  { file: 'adaptive-icon.png', width: 1024, height: 1024, markRadius: 1024 * 0.20 },
  // Splash (iPhone 14 Pro Max logical canvas), shown with resizeMode "contain".
  { file: 'splash.png', width: 1284, height: 2778, markRadius: 1284 * 0.17 },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const { file, width, height, markRadius } of TARGETS) {
  const png = encodePng(width, height, renderMark(width, height, markRadius));
  const path = join(OUT_DIR, file);
  writeFileSync(path, png);
  console.log(`wrote ${path} (${width}x${height}, ${(png.length / 1024).toFixed(1)} KB)`);
}
