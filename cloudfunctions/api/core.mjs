// 业务逻辑核心：云函数（index.js）和 H5 本地预览（app/src/api/mock.ts）共用这一份代码。
// 只依赖一个数据源适配器 src，不直接访问数据库：
//   src.regions()                         -> Region[]
//   src.periods()                         -> Period[]
//   src.config()                          -> object（app_config）
//   src.statsByPeriod(level, year, period)-> Stat[]
//   src.statsByRegion(code)               -> Stat[]
//   src.getUser() / src.saveUser(doc)     -> 用户数据

export const PERIOD_ORDER = { Q1: 1, H1: 2, Q3: 3, FY: 4 };
export const PERIOD_LABEL = { Q1: "一季度", H1: "上半年", Q3: "前三季度", FY: "全年" };
const SORT_KEYS = ["gdp", "increment", "nominal_growth", "real_growth"];
const MUNICIPALITIES = ["110000", "120000", "310000", "500000"];
const USER_LIMITS = { favorites: 50, history: 20, compare: 4, search_history: 10 };

const byTimeDesc = (a, b) => b.year - a.year || PERIOD_ORDER[b.period] - PERIOD_ORDER[a.period];
const visible = (r) => !r.tags?.includes("hidden");
export const isMunicipality = (code) => MUNICIPALITIES.includes(code);
export const municipalityCityCode = (code) => `${code.slice(0, 2)}0100`;

// 列表里只返回页面需要的字段，减少传输量
function pickStat(s) {
  if (!s) return null;
  return {
    code: s.region_code,
    level: s.level,
    name: s.name,
    short_name: s.short_name,
    parent_code: s.parent_code,
    tags: s.tags,
    year: s.year,
    period: s.period,
    gdp: s.gdp,
    real_growth: s.real_growth,
    increment: s.increment,
    nominal_growth: s.nominal_growth,
    rank_national: s.rank_national,
    rank_province: s.rank_province,
    rank_change: s.rank_change,
    share: s.share,
    source: s.source,
    source_url: s.source_url,
    published_at: s.published_at,
  };
}

// 并列排名：值相同名次相同；值为空的不排名
function rankBy(list, key, order) {
  const dir = order === "asc" ? 1 : -1;
  const withValue = list.filter((s) => s[key] != null).sort((a, b) => dir * (a[key] - b[key]));
  const empty = list.filter((s) => s[key] == null);
  withValue.forEach((s, i) => {
    s.rank = i > 0 && withValue[i - 1][key] === s[key] ? withValue[i - 1].rank : i + 1;
  });
  empty.forEach((s) => (s.rank = null));
  return [...withValue, ...empty];
}

// 简单字符串哈希，用来判断客户端缓存的地区字典是否过期
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function inScope(region, scope) {
  if (!scope || scope === "all") return true;
  const [type, value] = scope.split(":");
  if (type === "province") return region.parent_code === value;
  if (type === "tag") return region.tags?.includes(value);
  return true;
}

// ---------------- actions ----------------

async function boot(src, { regionsVersion } = {}) {
  const [regions, periods, config] = await Promise.all([
    src.regions(),
    src.periods(),
    src.config(),
  ]);
  const version = hash(regions.map((r) => `${r.code}${r.name}${r.tags.join()}`).join("|"));
  return {
    config,
    periods,
    regionsVersion: version,
    // 版本没变时不重复下发地区字典
    regions: regionsVersion === version ? null : regions,
  };
}

async function latestStatOf(src, code) {
  const list = await src.statsByRegion(code);
  return pickStat(list.sort(byTimeDesc)[0]);
}

async function home(src, { favorites = [] } = {}) {
  const periods = await src.periods();
  const latest = periods.find((p) => p.province_count > 0) ?? null;
  let provinceTop = [];
  let growthTop = [];
  if (latest) {
    const stats = (await src.statsByPeriod("province", latest.year, latest.period)).map(pickStat);
    provinceTop = [...stats].sort((a, b) => b.gdp - a.gdp).slice(0, 5);
    growthTop = stats
      .filter((s) => s.real_growth != null)
      .sort((a, b) => b.real_growth - a.real_growth)
      .slice(0, 5);
  }
  const favStats = (
    await Promise.all(favorites.slice(0, 5).map((c) => latestStatOf(src, c)))
  ).filter(Boolean);
  return { latest, provinceTop, growthTop, favorites: favStats };
}

async function ranking(
  src,
  { level = "province", year, period, scope = "all", sort = "gdp", order = "desc" }
) {
  if (!SORT_KEYS.includes(sort)) sort = "gdp";
  const regions = (await src.regions()).filter(
    (r) => r.level === level && visible(r) && inScope(r, scope)
  );
  const regionCodes = new Set(regions.map((r) => r.code));
  const stats = (await src.statsByPeriod(level, year, period))
    .filter((s) => regionCodes.has(s.region_code))
    .map(pickStat);
  const published = new Set(stats.map((s) => s.code));
  const ranked = rankBy(stats, sort, order);
  // 名次变化只在「全国范围 + 按总量排序」时有意义
  const showRankChange =
    (scope === "all" || level === "province") && sort === "gdp" && order === "desc";
  const items = ranked.map((s) => ({ ...s, rank_change: showRankChange ? s.rank_change : null }));
  const pending = regions
    .filter((r) => !published.has(r.code))
    .map((r) => ({
      code: r.code,
      name: r.name,
      short_name: r.short_name,
      parent_code: r.parent_code,
    }));
  const periodDoc =
    (await src.periods()).find((p) => p.year === year && p.period === period) ?? null;
  return { items, pending, total: regions.length, published: stats.length, period: periodDoc };
}

async function region(src, { code, year, period }) {
  const regions = await src.regions();
  const info = regions.find((r) => r.code === code);
  if (!info) throw new Error("地区不存在");
  const history = (await src.statsByRegion(code)).sort(byTimeDesc).map(pickStat);
  if (!year || !period) {
    year = history[0]?.year;
    period = history[0]?.period;
  }
  const current = history.find((s) => s.year === year && s.period === period) ?? null;
  const parent = info.parent_code ? regions.find((r) => r.code === info.parent_code) : null;
  const result = {
    region: info,
    parent,
    year,
    period,
    current,
    history,
    children: [],
    childrenTotal: 0,
    nearby: [],
    municipalityCity: null,
  };

  if (info.level === "province" && isMunicipality(code)) {
    const cityCode = municipalityCityCode(code);
    const cityStat = (await src.statsByRegion(cityCode)).find(
      (s) => s.year === year && s.period === period
    );
    result.municipalityCity = { code: cityCode, rank_national: cityStat?.rank_national ?? null };
  } else if (info.level === "province") {
    const cities = regions.filter(
      (r) => r.level === "city" && r.parent_code === code && visible(r)
    );
    result.childrenTotal = cities.length;
    result.children = (await src.statsByPeriod("city", year, period))
      .filter((s) => s.parent_code === code)
      .map(pickStat)
      .sort((a, b) => b.gdp - a.gdp);
  } else if (current) {
    const all = (await src.statsByPeriod("city", year, period))
      .map(pickStat)
      .sort((a, b) => a.rank_national - b.rank_national);
    const idx = all.findIndex((s) => s.code === code);
    const start = Math.max(0, Math.min(idx - 2, all.length - 5));
    result.nearby = all.slice(start, start + 5);
  }
  return result;
}

const fmtYi = (n) => Math.round(Math.abs(n)).toLocaleString("en-US");

function conclusionText(rows, period) {
  if (rows.length < 2 || rows.some((r) => !r)) return "";
  const label = `${rows[0].year}年${period === "FY" ? "" : PERIOD_LABEL[period]}`;
  if (rows.length === 2) {
    const [a, b] = rows;
    const diff = a.gdp - b.gdp;
    let text = `${label}，${a.short_name} GDP 比${b.short_name}${diff >= 0 ? "多" : "少"} ${fmtYi(diff)} 亿元`;
    if (a.real_growth != null && b.real_growth != null) {
      const g = Math.round((a.real_growth - b.real_growth) * 10) / 10;
      text +=
        g === 0 ? "，实际增速相同" : `，实际增速${g > 0 ? "高" : "低"} ${Math.abs(g)} 个百分点`;
    }
    return text + "。";
  }
  const top = [...rows].sort((x, y) => y.gdp - x.gdp)[0];
  const withGrowth = rows.filter((r) => r.real_growth != null);
  const fastest = withGrowth.sort((x, y) => y.real_growth - x.real_growth)[0];
  return (
    `${label}，${top.short_name}总量最高` +
    (fastest ? `，${fastest.short_name}实际增速最快。` : "。")
  );
}

async function compare(src, { codes = [], period = "FY", limit = 8 }) {
  const regions = await src.regions();
  const series = await Promise.all(
    codes.map(async (code) => {
      const info = regions.find((r) => r.code === code);
      const list = (await src.statsByRegion(code))
        .filter((s) => s.period === period)
        .sort(byTimeDesc)
        .map(pickStat);
      return {
        code,
        name: info?.name,
        short_name: info?.short_name,
        level: info?.level,
        points: list,
      };
    })
  );
  const years = [...new Set(series.flatMap((s) => s.points.map((p) => p.year)))]
    .sort((a, b) => b - a)
    .slice(0, limit);
  // 结论取所有地区都有数据的最近一年
  const commonYear = years.find((y) => series.every((s) => s.points.some((p) => p.year === y)));
  const latestRows = commonYear
    ? series.map((s) => s.points.find((p) => p.year === commonYear))
    : [];
  const levels = new Set(series.map((s) => s.level));
  return {
    period,
    years: [...years].reverse(),
    series: series.map((s) => ({
      ...s,
      points: s.points.filter((p) => years.includes(p.year)).reverse(),
    })),
    conclusion: conclusionText(latestRows, period),
    mixedLevel: levels.size > 1,
  };
}

function emptyUser() {
  return { favorites: [], history: [], compare: [], search_history: [] };
}

// 用户数据：收藏、最近查看、对比篮、搜索历史
async function user(src, { op, key, value } = {}) {
  if (op !== "get" && !(key in USER_LIMITS)) throw new Error(`未知字段 ${key}`);
  const doc = { ...emptyUser(), ...((await src.getUser()) ?? {}) };
  const list = () => (Array.isArray(doc[key]) ? doc[key] : []);
  switch (op) {
    case "get":
      return doc;
    case "toggle": {
      // 收藏、对比篮：有则删，无则加到最前
      const has = list().includes(value);
      if (!has && list().length >= USER_LIMITS[key])
        throw new Error(key === "compare" ? "最多对比 4 个地区" : "收藏已达上限");
      doc[key] = has ? list().filter((v) => v !== value) : [value, ...list()];
      break;
    }
    case "push":
      // 最近查看、搜索历史：去重后放到最前，超出上限截断
      doc[key] = [value, ...list().filter((v) => v !== value)].slice(0, USER_LIMITS[key]);
      break;
    case "set":
      doc[key] = (Array.isArray(value) ? value : []).slice(0, USER_LIMITS[key]);
      break;
    case "clear":
      doc[key] = [];
      break;
    default:
      throw new Error(`未知操作 ${op}`);
  }
  await src.saveUser(doc);
  return doc;
}

const actions = { boot, home, ranking, region, compare, user };

export async function handle(src, action, data) {
  const fn = actions[action];
  if (!fn) throw new Error(`未知 action：${action}`);
  // 期次统一按时间倒序，数据源不用关心顺序
  const wrapped = { ...src, periods: async () => [...(await src.periods())].sort(byTimeDesc) };
  return fn(wrapped, data ?? {});
}
