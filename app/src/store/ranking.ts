// 榜单页的筛选条件。放在全局是因为首页、分组入口需要「带着条件」跳到榜单 Tab（switchTab 不能传参）。
import { reactive } from "vue";
import type { Level, PeriodKey, SortKey } from "@/types";

export const rankingState = reactive({
  metric: "gdp" as "gdp" | "population",
  level: "province" as Level,
  year: 0,
  period: "FY" as PeriodKey,
  /** all | province:440000 | tag:yrd */
  scope: "all",
  sort: "gdp" as SortKey,
  order: "desc" as "asc" | "desc",
  view: "card" as "card" | "table",
  /** 每次从外部修改条件时 +1，榜单页据此判断是否需要重新加载 */
  version: 0,
});

export function openRanking(opts: {
  level: Level;
  year?: number;
  period?: PeriodKey;
  scope?: string;
}) {
  rankingState.metric = "gdp";
  rankingState.level = opts.level;
  // 不指定期次时由榜单页自动选该层级最新一期（year = 0）
  rankingState.year = opts.year ?? 0;
  if (opts.period) rankingState.period = opts.period;
  rankingState.scope = opts.scope ?? "all";
  rankingState.sort = "gdp";
  rankingState.order = "desc";
  rankingState.version++;
  uni.switchTab({ url: "/pages/ranking/index" });
}
