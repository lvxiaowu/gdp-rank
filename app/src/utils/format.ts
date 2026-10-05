// 数字与文案格式化，规则见原型文档 5.2。
import type { PeriodKey, SortKey } from "@/types";

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  Q1: "一季度",
  H1: "上半年",
  Q3: "前三季度",
  FY: "全年",
};
export const PERIOD_KEYS: PeriodKey[] = ["Q1", "H1", "Q3", "FY"];
export const SORT_LABEL: Record<SortKey, string> = {
  gdp: "总量",
  increment: "增长量",
  nominal_growth: "名义增速",
  real_growth: "实际增速",
};

const MINUS = "−";

/** 千分位整数。不用 toLocaleString，部分安卓机小程序环境不支持 */
export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? MINUS + s : s;
}

/** GDP 详情金额：保留一位小数，去掉无意义的 .0。 */
export function fmtGdpDecimal(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const [integer, decimal] = Math.abs(n).toFixed(1).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? MINUS : ""}${grouped}${decimal === "0" ? "" : `.${decimal}`}`;
}

/** 列表里的总量：145,847 亿 */
export const fmtGdp = (n: number | null | undefined) => (n == null ? "—" : `${fmtInt(n)} 亿`);

/** 详情页主数字：≥1 万亿显示万亿两位小数 */
export function fmtGdpBig(n: number | null | undefined): { value: string; unit: string } {
  if (n == null) return { value: "—", unit: "" };
  if (n >= 10000) return { value: (n / 10000).toFixed(2), unit: "万亿" };
  return { value: fmtGdpDecimal(n), unit: "亿" };
}

/** 增长量：+5,432 亿 */
export function fmtIncrement(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${fmtInt(n)} 亿`;
}

/** 增速：+5.4% */
export function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const v = Math.abs(n).toFixed(1);
  return `${n > 0 ? "+" : n < 0 ? MINUS : ""}${v}%`;
}

/** 占比：10.8% */
export const fmtShare = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`);

/** 涨跌样式：红涨绿跌 */
export function trendClass(n: number | null | undefined): "up" | "down" | "flat" {
  if (n == null || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

/** 名次变化：↑2 / ↓1 / — */
export function fmtRankChange(n: number | null | undefined): string {
  if (!n) return "—";
  return n > 0 ? `↑${n}` : `↓${Math.abs(n)}`;
}

export function fmtSortValue(sort: SortKey, value: number | null | undefined): string {
  if (sort === "gdp") return fmtGdp(value);
  if (sort === "increment") return fmtIncrement(value);
  return fmtPct(value);
}

export function periodLabel(year: number, period: PeriodKey) {
  return `${year}年${PERIOD_LABEL[period]}`;
}

/** 趋势图横轴：年度显示 2025，季度显示 25Q3 */
export function periodShort(year: number, period: PeriodKey, quarterly: boolean) {
  if (!quarterly) return String(year);
  const q = { Q1: "Q1", H1: "H1", Q3: "Q3", FY: "全年" }[period];
  return `${String(year).slice(2)}${q}`;
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}
