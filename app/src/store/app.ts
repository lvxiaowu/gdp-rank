// 全局数据：运营配置、期次列表、地区字典。启动时通过 boot 拉取一次。
// 地区字典缓存在本地，版本号不变时云函数不重复下发，行政区划调整也不需要发版。
import { computed, reactive } from "vue";
import { api } from "@/api";
import type { AppConfig, Level, Period, Region } from "@/types";

const REGIONS_CACHE_KEY = "regions_cache_v1";

export const appState = reactive({
  ready: false,
  error: "",
  config: {} as AppConfig,
  periods: [] as Period[],
  regions: [] as Region[],
});

let regionMap = new Map<string, Region>();
let bootPromise: Promise<void> | null = null;

function setRegions(list: Region[]) {
  appState.regions = list;
  regionMap = new Map(list.map((r) => [r.code, r]));
}

export function boot(force = false): Promise<void> {
  if (bootPromise && !force) return bootPromise;
  bootPromise = (async () => {
    const cache = uni.getStorageSync(REGIONS_CACHE_KEY) as { version: string; list: Region[] } | "";
    if (cache && cache.list?.length) setRegions(cache.list);
    try {
      const res = await api.boot(cache ? cache.version : undefined);
      appState.config = res.config ?? {};
      appState.periods = res.periods;
      if (res.regions) {
        setRegions(res.regions);
        uni.setStorageSync(REGIONS_CACHE_KEY, { version: res.regionsVersion, list: res.regions });
      }
      appState.ready = true;
      appState.error = "";
    } catch (err) {
      appState.error = (err as Error).message;
      bootPromise = null;
      throw err;
    }
  })();
  return bootPromise;
}

export const getRegion = (code: string | null | undefined) =>
  code ? regionMap.get(code) : undefined;

export const latestPeriod = computed(
  () => appState.periods.find((p) => p.province_count > 0) ?? null
);

/** 某层级已有数据的期次（倒序） */
export function publishedPeriods(level: Level): Period[] {
  return appState.periods.filter(
    (p) => (level === "province" ? p.province_count : p.city_count) > 0
  );
}

/** 某层级最新一期有数据的期次；城市优先取有较多城市的期次 */
export function latestPeriodFor(level: Level): Period | null {
  const list = publishedPeriods(level);
  if (level === "province") return list[0] ?? null;
  const max = Math.max(0, ...list.map((p) => p.city_count));
  // 城市季度数据往往只有少数城市，默认选覆盖城市数接近最多的最近一期
  return list.find((p) => p.city_count >= max * 0.5) ?? list[0] ?? null;
}

export function findPeriod(year: number, period: string) {
  return appState.periods.find((p) => p.year === year && p.period === period) ?? null;
}
