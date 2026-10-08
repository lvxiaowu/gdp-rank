export type Level = "province" | "city";
export type PeriodKey = "Q1" | "H1" | "Q3" | "FY";
export type SortKey = "gdp" | "increment" | "nominal_growth" | "real_growth";

export interface Region {
  code: string;
  name: string;
  short_name: string;
  level: Level;
  parent_code: string | null;
  pinyin: string;
  initials: string;
  tags: string[];
}

export interface Period {
  _id: string;
  year: number;
  period: PeriodKey;
  label: string;
  province_count: number;
  province_total: number;
  city_count: number;
  city_total: number;
  status: "complete" | "partial" | "unpublished";
  updated_at: string;
}

export interface Stat {
  code: string;
  level: Level;
  name: string;
  short_name: string;
  parent_code: string | null;
  tags: string[];
  year: number;
  period: PeriodKey;
  gdp: number;
  real_growth: number | null;
  increment: number | null;
  nominal_growth: number | null;
  rank_national: number;
  rank_province: number | null;
  rank_change: number | null;
  share: number | null;
  source: "nbs" | "manual" | "city-yearbook" | "city-ranking";
  source_url: string;
  published_at: string | null;
  /** 榜单按当前排序方式计算的名次 */
  rank?: number | null;
}

export interface AdSlotConfig {
  unit_id: string;
  enabled?: boolean;
}

export interface AppConfig {
  ad_enabled?: boolean;
  ad_slots?: Record<string, AdSlotConfig>;
  hot_search?: string[];
  /** 热门对比，每项是一组地区代码 */
  hot_compare?: string[][];
  next_release_text?: string;
}

export interface PendingRegion {
  code: string;
  name: string;
  short_name: string;
  parent_code: string | null;
}

export interface RankingResult {
  items: Stat[];
  pending: PendingRegion[];
  pending_total: number;
  total: number;
  published: number;
  period: Period | null;
  page: number;
  page_size: number;
  pages: number;
}

/** 全市常住人口（绝对人数）；与 GDP 期次数据分开存储。 */
export interface PopulationStat {
  code: string;
  level: "city";
  name: string;
  short_name: string;
  parent_code: string | null;
  year: number;
  population: number;
  approximate?: boolean;
  rank?: number | null;
  source_url: string;
  source_name: string;
}

export interface PopulationRankingResult {
  items: PopulationStat[];
  pending: PendingRegion[];
  pending_total: number;
  total: number;
  published: number;
  year: number;
  current_year_published: number;
  needs_update: number;
  years: number[];
  sources: string[];
  page: number;
  page_size: number;
  pages: number;
}

export interface RegionResult {
  region: Region;
  parent: Region | null;
  year: number;
  period: PeriodKey;
  current: Stat | null;
  population: {
    year: number;
    population: number;
    source_name: string;
    covered: number;
    total: number;
  } | null;
  history: Stat[];
  children: Stat[];
  childrenTotal: number;
  childrenYear: number;
  childrenPeriod: PeriodKey;
  nearby: Stat[];
  municipalityCity: { code: string; rank_national: number | null } | null;
}

export interface CompareSeries {
  code: string;
  name: string;
  short_name: string;
  level: Level;
  points: Stat[];
}

export interface CompareResult {
  period: PeriodKey;
  years: number[];
  series: CompareSeries[];
  conclusion: string;
  mixedLevel: boolean;
}

export interface HomeResult {
  latest: Period | null;
  provinceTop: Stat[];
  growthTop: Stat[];
  favorites: Stat[];
}

export interface UserDoc {
  favorites: string[];
  history: string[];
  compare: string[];
  search_history: string[];
}

export interface BootResult {
  config: AppConfig;
  periods: Period[];
  regionsVersion: string;
  regions: Region[] | null;
}
