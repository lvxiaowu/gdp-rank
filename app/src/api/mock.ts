// 本地预览：读取 data/output/*.json，用与云函数相同的 core.mjs 处理请求。
// 未配置云环境 ID 时，H5 和微信开发者工具都走这里；用户数据存在本地 storage。
import { handle } from "@core";
import regionsData from "@data/regions.json";
import compactStatsData from "@data/gdp_mock_compact.json";
import periodsData from "@data/periods.json";
import populationData from "@data/city_population.json";
import type { AppConfig, Period, PeriodKey, Region, Stat, UserDoc } from "@/types";

interface MockData {
  regions: Region[];
  stats: (Stat & { region_code: string })[];
  population: {
    region_code: string;
    year: number;
    population: number;
    source_url: string;
    source_name: string;
  }[];
  periods: Period[];
}

type CompactStatRow = [
  number,
  number,
  PeriodKey,
  number,
  number | null,
  number | null,
  number | null,
  number,
  number | null,
  number | null,
  number | null,
  number,
  number,
  string | null,
];
const compactStats = compactStatsData as {
  sources: MockData["stats"][number]["source"][];
  urls: string[];
  rows: CompactStatRow[];
};
const regions = regionsData as unknown as Region[];
const regionByIndex = regions;
const stats = compactStats.rows.map((row) => {
  const region = regionByIndex[row[0]];
  return {
    region_code: region.code,
    level: region.level,
    name: region.name,
    short_name: region.short_name,
    parent_code: region.parent_code,
    tags: region.tags,
    year: row[1],
    period: row[2],
    gdp: row[3],
    real_growth: row[4],
    increment: row[5],
    nominal_growth: row[6],
    rank_national: row[7],
    rank_province: row[8],
    rank_change: row[9],
    share: row[10],
    source: compactStats.sources[row[11]],
    source_url: compactStats.urls[row[12]],
    published_at: row[13],
  };
});

const mockData: MockData = {
  regions,
  stats: stats as unknown as MockData["stats"],
  periods: periodsData as unknown as Period[],
  population: populationData as unknown as MockData["population"],
};

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
  const db = mockData;
  const src = {
    regions: async () => db.regions,
    periods: async () => db.periods,
    config: async () => MOCK_CONFIG,
    statsByPeriod: async (level: string, year: number, period: string) =>
      db.stats.filter((s) => s.level === level && s.year === year && s.period === period),
    statsByRegion: async (code: string) => db.stats.filter((s) => s.region_code === code),
    populationRows: async () => db.population,
    getUser: async () => (uni.getStorageSync(USER_KEY) || null) as UserDoc | null,
    saveUser: async (doc: UserDoc) => uni.setStorageSync(USER_KEY, doc),
  };
  // 模拟网络延迟，方便看到加载态
  await new Promise((r) => setTimeout(r, 200));
  return handle(src, action, data);
}
