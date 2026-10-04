// 图表用 SVG 画成图片（<image src="data:image/svg+xml;base64,...">），H5 和小程序都能显示，不依赖图表库。
// SVG 里只画柱、线、点、网格；坐标轴文字用页面里的 view 叠加，避免不同平台字体渲染差异。

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64(ascii: string): string {
  let out = "";
  for (let i = 0; i < ascii.length; i += 3) {
    const a = ascii.charCodeAt(i);
    const b = ascii.charCodeAt(i + 1);
    const c = ascii.charCodeAt(i + 2);
    const n = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += Number.isNaN(b) ? "=" : B64[(n >> 6) & 63];
    out += Number.isNaN(c) ? "=" : B64[n & 63];
  }
  return out;
}
const toDataUri = (svg: string) => `data:image/svg+xml;base64,${base64(svg)}`;

export const SERIES_COLORS = ["#3370FF", "#FF8800", "#00B42A", "#7B61FF"];

interface Box {
  width: number;
  height: number;
  padTop: number;
  padBottom: number;
}
const BOX: Box = { width: 600, height: 300, padTop: 20, padBottom: 10 };

/** 计算刻度范围，留 10% 余量 */
function range(values: number[], includeZero: boolean) {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return { min: 0, max: 1 };
  let min = Math.min(...v);
  const max = Math.max(...v);
  if (includeZero) min = Math.min(0, min);
  const pad = (max - min || Math.abs(max) || 1) * 0.1;
  return { min: includeZero && min >= 0 ? 0 : min - pad, max: max + pad };
}

function grid() {
  let s = "";
  for (let i = 0; i <= 3; i++) {
    const y = BOX.padTop + ((BOX.height - BOX.padTop - BOX.padBottom) * i) / 3;
    s += `<line x1="0" y1="${y}" x2="${BOX.width}" y2="${y}" stroke="#E5E6EB" stroke-width="1"/>`;
  }
  return s;
}

const yOf = (v: number, r: { min: number; max: number }) =>
  BOX.padTop + (1 - (v - r.min) / (r.max - r.min || 1)) * (BOX.height - BOX.padTop - BOX.padBottom);

/** 柱状（总量）+ 折线（增速）双轴图 */
export function barLineChart(bars: (number | null)[], line: (number | null)[], active: number) {
  const n = bars.length;
  const slot = BOX.width / Math.max(n, 1);
  const barR = range(
    bars.filter((x): x is number => x != null),
    true
  );
  const lineR = range(
    line.filter((x): x is number => x != null),
    false
  );
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX.width}" height="${BOX.height}" viewBox="0 0 ${BOX.width} ${BOX.height}">`;
  svg += grid();
  bars.forEach((v, i) => {
    if (v == null) return;
    const w = slot * 0.46;
    const x = i * slot + (slot - w) / 2;
    const y = yOf(v, barR);
    const fill = i === active ? "#3370FF" : "#C9D8FF";
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${BOX.height - BOX.padBottom - y}" rx="4" fill="${fill}"/>`;
  });
  const pts = line.map((v, i) => (v == null ? null : [i * slot + slot / 2, yOf(v, lineR)]));
  const path = pts
    .filter(Boolean)
    .map((p) => p!.join(","))
    .join(" ");
  if (path)
    svg += `<polyline points="${path}" fill="none" stroke="#FF8800" stroke-width="3" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => {
    if (!p) return;
    svg += `<circle cx="${p[0]}" cy="${p[1]}" r="${i === active ? 7 : 5}" fill="#fff" stroke="#FF8800" stroke-width="3"/>`;
  });
  svg += `</svg>`;
  return { src: toDataUri(svg), barMax: barR.max, lineMin: lineR.min, lineMax: lineR.max };
}

/** 多条折线（对比页） */
export function multiLineChart(series: (number | null)[][], active: number) {
  const n = Math.max(0, ...series.map((s) => s.length));
  const slot = BOX.width / Math.max(n, 1);
  const r = range(
    series.flat().filter((x): x is number => x != null),
    false
  );
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX.width}" height="${BOX.height}" viewBox="0 0 ${BOX.width} ${BOX.height}">`;
  svg += grid();
  if (active >= 0) {
    const x = active * slot + slot / 2;
    svg += `<line x1="${x}" y1="${BOX.padTop}" x2="${x}" y2="${BOX.height - BOX.padBottom}" stroke="#C9CDD4" stroke-width="2" stroke-dasharray="6 4"/>`;
  }
  series.forEach((values, si) => {
    const color = SERIES_COLORS[si % SERIES_COLORS.length];
    const pts = values.map((v, i) => (v == null ? null : [i * slot + slot / 2, yOf(v, r)]));
    // 缺数据的地方断开
    let seg: number[][] = [];
    const flush = () => {
      if (seg.length > 1)
        svg += `<polyline points="${seg.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`;
      seg = [];
    };
    pts.forEach((p) => (p ? seg.push(p) : flush()));
    flush();
    pts.forEach((p) => {
      if (p)
        svg += `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="${color}" stroke-width="3"/>`;
    });
  });
  svg += `</svg>`;
  return { src: toDataUri(svg), min: r.min, max: r.max };
}
