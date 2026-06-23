// Generates SaveBack's PWA icons with zero dependencies: a jade rounded tile
// with a white heart (the app's "save" mark). Pure pixel math -> PNG via zlib.
//
//   node scripts/generate-icons.mjs   (or: npm run icons)

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const JADE = [12, 168, 108]; // #0CA86C
const WHITE = [255, 255, 255];

// ---- PNG encoding (RGBA, 8-bit) ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- shapes ----
// Classic implicit heart curve in (u right, v up) space.
function inHeart(u, v) {
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
}

// Rounded-square test, cx/cy in [-1, 1], rr = corner radius fraction.
function inRoundRect(cx, cy, rr) {
  const px = Math.abs(cx);
  const py = Math.abs(cy);
  if (px <= 1 - rr || py <= 1 - rr) return px <= 1 && py <= 1;
  const dx = px - (1 - rr);
  const dy = py - (1 - rr);
  return dx * dx + dy * dy <= rr * rr;
}

function render(size, { fullBleed = false, heartFrac = 0.66, rr = 0.235 } = {}) {
  const SS = 4; // supersampling for smooth edges
  const n = SS * SS;
  const rgba = Buffer.alloc(size * size * 4);
  const R = heartFrac / 1.13; // heart half-extent -> heartFrac of the tile
  const Cv = -0.13; // vertical centering of the heart curve

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rs = 0,
        gs = 0,
        bs = 0,
        covered = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = ((x + (sx + 0.5) / SS) / size) * 2 - 1;
          const fy = ((y + (sy + 0.5) / SS) / size) * 2 - 1;
          const insideTile = fullBleed
            ? Math.abs(fx) <= 1 && Math.abs(fy) <= 1
            : inRoundRect(fx, fy, rr);
          if (!insideTile) continue;
          const u = fx / R;
          const v = -fy / R + Cv;
          const col = inHeart(u, v) ? WHITE : JADE;
          rs += col[0];
          gs += col[1];
          bs += col[2];
          covered++;
        }
      }
      const idx = (y * size + x) * 4;
      if (covered === 0) {
        rgba[idx] = rgba[idx + 1] = rgba[idx + 2] = rgba[idx + 3] = 0;
      } else {
        rgba[idx] = Math.round(rs / covered);
        rgba[idx + 1] = Math.round(gs / covered);
        rgba[idx + 2] = Math.round(bs / covered);
        rgba[idx + 3] = Math.round((covered / n) * 255);
      }
    }
  }
  return png(size, rgba);
}

mkdirSync("public/icons", { recursive: true });
mkdirSync("app", { recursive: true });

const outputs = [
  // Next.js metadata conventions -> favicon + apple-touch.
  ["app/icon.png", 256, { heartFrac: 0.66 }],
  ["app/apple-icon.png", 180, { fullBleed: true, heartFrac: 0.6 }],
  // Manifest icons.
  ["public/icons/icon-192.png", 192, { heartFrac: 0.66 }],
  ["public/icons/icon-512.png", 512, { heartFrac: 0.66 }],
  ["public/icons/maskable-192.png", 192, { fullBleed: true, heartFrac: 0.55 }],
  ["public/icons/maskable-512.png", 512, { fullBleed: true, heartFrac: 0.55 }],
];

for (const [path, size, opts] of outputs) {
  writeFileSync(path, render(size, opts));
  console.log(`  ${path} (${size}x${size})`);
}
console.log("✓ icons generated");
