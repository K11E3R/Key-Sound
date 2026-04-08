// Generates icons/icon.png (128x128) — no external deps, pure Node.js
// Run: node scripts/gen-icon.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 128, H = 128;

// RGBA pixel buffer
const buf = Buffer.alloc(W * H * 4, 0);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b, a);
}

function roundRect(x, y, w, h, radius, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx, py = y + dy;
      const cx = dx < radius ? radius : dx >= w - radius ? w - 1 - radius : dx;
      const cy = dy < radius ? radius : dy >= h - radius ? h - 1 - radius : dy;
      const ddx = dx < radius ? radius - dx : dx >= w - radius ? dx - (w - 1 - radius) : 0;
      const ddy = dy < radius ? radius - dy : dy >= h - radius ? dy - (h - 1 - radius) : 0;
      if (Math.sqrt(ddx * ddx + ddy * ddy) <= radius) {
        setPixel(px, py, r, g, b, a);
      }
    }
  }
}

// ── Background: dark #1e1e2e ──────────────────────────────────────────────────
roundRect(0, 0, W, H, 20, 0x1e, 0x1e, 0x2e);

// ── Keyboard body: #2d2d44 with border ───────────────────────────────────────
roundRect(12, 50, 76, 44, 8, 0x44, 0x44, 0x66);   // border shadow
roundRect(13, 51, 74, 42, 7, 0x2d, 0x2d, 0x44);   // body fill

// ── Keys row 1 (y=58) ─────────────────────────────────────────────────────────
const keyColor = [0x45, 0x47, 0x5a];
const keyPositions = [19, 33, 47, 61, 75];
const keyWidths    = [11, 11, 11, 11,  8];
for (let i = 0; i < 5; i++) {
  roundRect(keyPositions[i], 58, keyWidths[i], 9, 2, ...keyColor);
}

// ── Keys row 2 (y=71) — highlighted middle key: #89b4fa ──────────────────────
roundRect(19, 71, 11, 9, 2, ...keyColor);
roundRect(33, 71, 11, 9, 2, ...keyColor);
roundRect(47, 71, 25, 9, 2, 0x89, 0xb4, 0xfa);   // accent key
roundRect(75, 71, 8,  9, 2, ...keyColor);

// ── Spacebar row 3 (y=84) ─────────────────────────────────────────────────────
roundRect(24, 84, 52, 6, 2, 0x58, 0x5b, 0x70);

// ── Sound waves (right side) — 3 arcs via dots ───────────────────────────────
// Draw arc segments by sampling a circle arc and painting thick dots
function arc(cx, cy, rx, ry, startDeg, endDeg, thickness, r, g, b) {
  for (let deg = startDeg; deg <= endDeg; deg += 0.5) {
    const rad = deg * Math.PI / 180;
    const px = Math.round(cx + rx * Math.cos(rad));
    const py = Math.round(cy + ry * Math.sin(rad));
    for (let dy = -thickness; dy <= thickness; dy++)
      for (let dx = -thickness; dx <= thickness; dx++)
        if (dx*dx + dy*dy <= thickness*thickness)
          setPixel(px+dx, py+dy, r, g, b);
  }
}

// Wave 1 — close, bright
arc(86, 64, 14, 10, -40, 40, 2, 0x89, 0xb4, 0xfa);
// Wave 2 — medium, lighter
arc(86, 64, 22, 17, -45, 45, 1, 0x89, 0xb4, 0xfa);
// Wave 3 — far, faint
arc(86, 64, 30, 24, -50, 50, 1, 0x60, 0x90, 0xd0);

// ── Write PNG ─────────────────────────────────────────────────────────────────
function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) {
    crc ^= b;
    for (let k = 0; k < 8; k++)
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeBytes, data, crc]);
}

const sig = Buffer.from([137,80,78,71,13,10,26,10]);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 2;   // RGB (no alpha — we'll use RGBA mode 6)
ihdr[9] = 6;   // RGBA
ihdr[10] = ihdr[11] = ihdr[12] = 0;

// IDAT — raw scanlines with filter byte 0
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;  // filter = None
  buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const compressed = zlib.deflateSync(raw, { level: 9 });

const out = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '..', 'icons', 'icon.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log('Generated', outPath, out.length, 'bytes');
