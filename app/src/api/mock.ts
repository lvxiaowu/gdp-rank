// 仅 H5 本地预览使用：读取数据脚本生成的 ../data/output/*.json，用与云函数相同的 core.mjs 处理请求。
// 用户数据存在 localStorage。小程序构建通过条件编译剔除本文件。
import { handle } from "@core";
import type { AppConfig, Period, Region, Stat, UserDoc } from "@/types";

interface MockData {
  regions: Region[];
  stats: (Stat & { region_code: string })[];
  periods: Period[];
}

let loading: Promise<MockData> | null = null;
function load() {
  loading ??= Promise.all([
    import("@data/regions.json"),
    import("@data/gdp_stats.json"),
    import("@data/periods.json"),
  ]).then(([r, s, p]) => ({
    regions: r.default as unknown as Region[],
    stats: s.default as unknown as MockData["stats"],
    periods: p.default as unknown as Period[],
  }));
  return loading;
}

// 本地预览用的运营配置，线上在云数据库 app_config 集合里维护
const MOCK_CONFIG: AppConfig = {
  ad_enabled: false,
  ad_slots: {},
  hot_search: ["广东", "江苏", "深圳", "上海", "成都", "杭州", "苏州", "重庆"],
  hot_compare: [
    ["440000", "320000"],
    ["310000", "110000"],
    ["440300", "440100"],
    ["510100", "500100"],
    ["330100", "320100"],
  ],
  next_release_text: "2026年前三季度数据，预计 10 月下旬起陆续发布",
};

const USER_KEY = "mock_user";

export async function mockCall(action: string, data?: object) {
  const db = await load();
  const src = {
    regions: async () => db.regions,
    periods: async () => db.periods,
    config: async () => MOCK_CONFIG,
    statsByPeriod: async (level: string, year: number, period: string) =>
      db.stats.filter((s) => s.level === level && s.year === year && s.period === period),
    statsByRegion: async (code: string) => db.stats.filter((s) => s.region_code === code),
    getUser: async () => JSON.parse(localStorage.getItem(USER_KEY) || "null") as UserDoc | null,
    saveUser: async (doc: UserDoc) => localStorage.setItem(USER_KEY, JSON.stringify(doc)),
  };
  // 模拟网络延迟，方便看到加载态
  await new Promise((r) => setTimeout(r, 200));
  return handle(src, action, data);
}
