const fs = require('fs');
const zlib = require('zlib');

const W = 1024;
const H = 1024;

const bg0 = [6, 6, 12, 255];
const bg1 = [16, 16, 29, 255];
const gold = [200, 150, 12, 255];
const goldHi = [255, 233, 166, 255];
const goldDark = [84, 57, 4, 255];
const blue = [0, 174, 239, 255];
const white = [234, 250, 255, 255];

const data = Buffer.alloc(H * (1 + W * 4));

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

function blend(x, y, rgba) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const row = y * (1 + W * 4);
  const i = row + 1 + x * 4;
  const a = rgba[3] / 255;
  data[i] = Math.round(data[i] * (1 - a) + rgba[0] * a);
  data[i + 1] = Math.round(data[i + 1] * (1 - a) + rgba[1] * a);
  data[i + 2] = Math.round(data[i + 2] * (1 - a) + rgba[2] * a);
  data[i + 3] = 255;
}

function insideRounded(x, y, rx, ry, rw, rh, rr) {
  const cx = Math.max(rx + rr, Math.min(x, rx + rw - rr));
  const cy = Math.max(ry + rr, Math.min(y, ry + rh - rr));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= rr * rr;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function fillPoly(poly, colorFn) {
  const minX = Math.max(0, Math.floor(Math.min(...poly.map(p => p[0]))));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(...poly.map(p => p[0]))));
  const minY = Math.max(0, Math.floor(Math.min(...poly.map(p => p[1]))));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...poly.map(p => p[1]))));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPoly(x + 0.5, y + 0.5, poly)) blend(x, y, colorFn(x, y));
    }
  }
}

function strokePoly(poly, rgba, width) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    drawLine(a[0], a[1], b[0], b[1], rgba, width);
  }
}

function drawLine(x0, y0, x1, y1, rgba, width) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  const r = width / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) {
      for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
        const d = Math.hypot(xx - x, yy - y);
        if (d <= r) blend(xx, yy, [rgba[0], rgba[1], rgba[2], Math.round(rgba[3] * (1 - d / (r + 1)))]);
      }
    }
  }
}

function drawCircle(cx, cy, radius, rgba) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 <= r2) blend(x, y, rgba);
    }
  }
}

function drawRing(cx, cy, radius, width, rgba) {
  const r0 = radius - width / 2;
  const r1 = radius + width / 2;
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) {
    for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= r0 && d <= r1) blend(x, y, [rgba[0], rgba[1], rgba[2], Math.round(rgba[3] * (1 - Math.abs(d - radius) / (width / 2 + 1)))]);
    }
  }
}

for (let y = 0; y < H; y++) {
  const row = y * (1 + W * 4);
  data[row] = 0;
  for (let x = 0; x < W; x++) {
    const i = row + 1 + x * 4;
    const nx = (x - W / 2) / (W / 2);
    const ny = (y - H / 2) / (H / 2);
    const d = Math.min(1, Math.sqrt(nx * nx + ny * ny));
    const c = mix(bg1, bg0, d * 0.9);
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  }
}

// Arc reactor aura
for (let r = 220; r > 88; r -= 4) drawCircle(512, 512, r, [blue[0], blue[1], blue[2], Math.max(2, Math.round((220 - r) / 9))]);
drawCircle(512, 512, 104, [0, 174, 239, 95]);
drawCircle(512, 512, 74, [0, 174, 239, 180]);
drawCircle(512, 512, 38, [234, 250, 255, 230]);
drawRing(512, 512, 116, 5, [0, 174, 239, 130]);
drawRing(512, 512, 152, 2, [0, 174, 239, 60]);

// Outer frame
drawRing(512, 512, 462, 4, [200, 150, 12, 44]);
drawRing(512, 512, 430, 2, [0, 174, 239, 24]);

// Vertex V
const v = [[290, 302], [374, 302], [512, 722], [650, 302], [734, 302], [548, 760], [476, 760]];
fillPoly(v, (x, y) => {
  const t = Math.max(0, Math.min(1, (x + y - 550) / 580));
  return mix(goldHi, mix(gold, goldDark, t), t * 0.85);
});
strokePoly([[290, 302], [374, 302], [512, 722], [650, 302], [734, 302]], [255, 233, 166, 120], 10);

// Lower black cut and blue internal edge
const cut = [[344, 676], [448, 676], [512, 820], [576, 676], [680, 676], [568, 846], [456, 846]];
fillPoly(cut, () => [5, 5, 10, 190]);
drawLine(448, 676, 512, 820, [0, 174, 239, 110], 6);
drawLine(576, 676, 512, 820, [0, 174, 239, 110], 6);

// HUD ticks
drawLine(216, 512, 306, 512, [200, 150, 12, 82], 3);
drawLine(718, 512, 808, 512, [200, 150, 12, 82], 3);
drawLine(512, 184, 512, 266, [0, 174, 239, 58], 3);
drawLine(512, 758, 512, 840, [0, 174, 239, 58], 3);

function crcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
}

const table = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, payload) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(payload.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, payload])));
  return Buffer.concat([len, name, payload, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(data, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/icon.png', png);
fs.writeFileSync('assets/adaptive-icon.png', png);
console.log(`Generated assets/icon.png (${W}x${H})`);
