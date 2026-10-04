// 生成 TabBar 占位图标（81×81 PNG，未选中灰色 / 选中主色）。设计稿出来后直接替换 src/static/tabbar/ 下的文件即可。
// 用法：node tools/gen-tabbar-icons.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const SIZE = 81;
const STROKE = 5.5;
const COLORS = { normal: [143, 149, 158], active: [51, 112, 255] };
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/static/tabbar");

// 点到线段距离
function segDist(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
const polyline =
  (pts, closed = false) =>
  (x, y) => {
    let d = Infinity;
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) d = Math.min(d, segDist(x, y, pts[i], pts[(i + 1) % pts.length]));
    return d <= STROKE / 2;
  };
const ring = (cx, cy, r) => (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - r) <= STROKE / 2;
const arc = (cx, cy, r, fromDeg, toDeg) => (x, y) => {
  const a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
  const inRange = a >= fromDeg && a <= toDeg;
  return inRange && Math.abs(Math.hypot(x - cx, y - cy) - r) <= STROKE / 2;
};
const rect = (x1, y1, x2, y2) => (x, y) => x >= x1 && x <= x2 && y >= y1 && y <= y2;
const union =
  (...fs) =>
  (x, y) =>
    fs.some((f) => f(x, y));

const ICONS = {
  home: union(
    polyline([
      [14, 38],
      [40.5, 15],
      [67, 38],
    ]),
    polyline([
      [21, 33],
      [21, 66],
      [60, 66],
      [60, 33],
    ]),
    polyline([
      [34, 66],
      [34, 48],
      [47, 48],
      [47, 66],
    ])
  ),
  ranking: union(
    polyline([
      [12, 66],
      [69, 66],
    ]),
    polyline([
      [17, 66],
      [17, 44],
      [31, 44],
      [31, 66],
    ]),
    polyline([
      [33.5, 66],
      [33.5, 22],
      [47.5, 22],
      [47.5, 66],
    ]),
    polyline([
      [50, 66],
      [50, 36],
      [64, 36],
      [64, 66],
    ])
  ),
  compare: union(
    polyline([
      [12, 64],
      [26, 44],
      [40, 52],
      [56, 26],
      [69, 34],
    ]),
    polyline([
      [12, 34],
      [28, 30],
      [42, 18],
      [69, 22],
    ]),
    rect(10, 68, 71, 71)
  ),
  mine: union(ring(40.5, 28, 12), arc(40.5, 70, 25, -180, 0)),
};

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(shape, [r, g, b]) {
  const SS = 4; // 4×4 超采样抗锯齿
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 4 + 1)] = 0;
    for (let x = 0; x < SIZE; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) if (shape(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hit++;
      const o = y * (SIZE * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = Math.round((hit / (SS * SS)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, shape] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(OUT, `${name}.png`), png(shape, COLORS.normal));
  fs.writeFileSync(path.join(OUT, `${name}-active.png`), png(shape, COLORS.active));
}
console.log(`✅ TabBar 图标已生成到 ${path.relative(process.cwd(), OUT)}`);
