// 合并统计局原始数据与人工录入数据，计算增长量、名义增速、排名、名次变化、占比，
// 输出云数据库要用的四个集合：regions / gdp_records / gdp_stats / periods（json + jsonl 两份）。
import { PERIODS, PERIOD_LABEL, MUNICIPALITIES } from "../lib/config.mjs";
import { p, readJson, readCsv, writeJson, writeJsonl, round } from "../lib/io.mjs";

const updatedAt = new Date().toISOString();
const regions = readJson(p("output/regions.json"));
const regionByCode = new Map(regions.map((r) => [r.code, r]));
const raw = (name) => readJson(p(`raw/nbs/${name}.json`), { rows: [] }).rows;

const NBS_URL = "https://data.stats.gov.cn";
const records = new Map(); // key: code_year_period
const keyOf = (code, year, period) => `${code}_${year}_${period}`;

function put(code, year, period, gdp, realGrowth, source) {
  const region = regionByCode.get(code);
  if (!region) return;
  const key = keyOf(code, year, period);
  const prev = records.get(key);
  records.set(key, {
    _id: key,
    region_code: code,
    level: region.level,
    year,
    period,
    gdp: gdp ?? prev?.gdp ?? null,
    real_growth: realGrowth ?? prev?.real_growth ?? null,
    source: source.type,
    source_url: source.url,
    published_at: source.published_at ?? null,
    note: source.note ?? "",
    updated_at: updatedAt,
  });
}

const indexToGrowth = (index) => (index == null ? null : round(index - 100, 1));
const nbs = { type: "nbs", url: NBS_URL };

// 1. 省级：季度累计值；全年优先用年度数据库（终核数）
for (const r of raw("province-quarter"))
  put(r.code, r.year, r.period, r.gdp, indexToGrowth(r.index), nbs);
for (const r of raw("province-year")) put(r.code, r.year, "FY", r.gdp, indexToGrowth(r.index), nbs);

// 2. 城市：直辖市直接复用省级数据（因此直辖市有季度数据）；其他 32 个主要城市只有年度总量
for (const code of MUNICIPALITIES) {
  for (const rec of [...records.values()].filter((x) => x.region_code === code)) {
    put(`${code.slice(0, 2)}0100`, rec.year, rec.period, rec.gdp, rec.real_growth, nbs);
  }
}
for (const r of raw("city-year")) {
  if (records.has(keyOf(r.code, r.year, "FY"))) continue;
  put(r.code, r.year, "FY", r.gdp, null, nbs);
}

// 3. 人工录入（覆盖接口数据）
const manualErrors = [];
const findRegion = (level, name, province) => {
  const clean = (s) => String(s ?? "").trim();
  const n = clean(name);
  const prov = clean(province);
  const provCode = prov
    ? regions.find((r) => r.level === "province" && (r.name === prov || r.short_name === prov))
        ?.code
    : null;
  const hits = regions.filter(
    (r) =>
      r.level === level &&
      (r.name === n || r.short_name === n) &&
      (!provCode || r.parent_code === provCode || r.code === provCode)
  );
  return hits.length === 1 ? hits[0] : null;
};
readCsv(p("manual/gdp_manual.csv")).forEach((row, i) => {
  const line = i + 2;
  const region = findRegion(row.level, row.region, row.province);
  if (!region)
    return manualErrors.push(
      `第 ${line} 行：找不到地区「${row.province ?? ""}${row.region}」（或有重名，请填 province）`
    );
  if (!PERIODS.includes(row.period))
    return manualErrors.push(`第 ${line} 行：period 必须是 ${PERIODS.join("/")}`);
  if (!row.source_url) return manualErrors.push(`第 ${line} 行：source_url 不能为空`);
  const gdp = row.gdp === "" ? null : Number(row.gdp);
  const growth = row.real_growth === "" || row.real_growth == null ? null : Number(row.real_growth);
  if (gdp != null && !(gdp > 0)) return manualErrors.push(`第 ${line} 行：gdp 不是有效数字`);
  put(region.code, Number(row.year), row.period, gdp, growth, {
    type: "manual",
    url: row.source_url,
    published_at: row.published_at || null,
    note: row.note,
  });
});
if (manualErrors.length) {
  console.error("❌ manual/gdp_manual.csv 有错误：\n" + manualErrors.join("\n"));
  process.exit(1);
}

// 4. 全国总量（算省份占全国比重）
const national = new Map();
for (const r of [...raw("national-quarter"), ...raw("national-year")]) {
  if (r.gdp != null) national.set(`${r.year}_${r.period}`, r.gdp);
}

// 5. 计算统计值
const visible = (code) => !regionByCode.get(code)?.tags.includes("hidden");
const allRecords = [...records.values()].filter((r) => r.gdp != null && visible(r.region_code));

// 并列排名：总量相同名次相同（1,1,3）
function rank(list) {
  const sorted = [...list].sort((a, b) => b.gdp - a.gdp);
  const result = new Map();
  sorted.forEach((r, i) =>
    result.set(
      r.region_code,
      i > 0 && sorted[i - 1].gdp === r.gdp ? result.get(sorted[i - 1].region_code) : i + 1
    )
  );
  return result;
}
const groupKey = (r) => `${r.level}_${r.year}_${r.period}`;
const groups = Map.groupBy(allRecords, groupKey);
const nationalRanks = new Map([...groups].map(([k, list]) => [k, rank(list)]));
const provinceRanks = new Map();
for (const [k, list] of groups) {
  if (!k.startsWith("city")) continue;
  for (const [parent, cities] of Map.groupBy(
    list,
    (r) => regionByCode.get(r.region_code).parent_code
  )) {
    provinceRanks.set(`${k}_${parent}`, rank(cities));
  }
}

const stats = allRecords.map((r) => {
  const region = regionByCode.get(r.region_code);
  const prev = records.get(keyOf(r.region_code, r.year - 1, r.period));
  const increment = prev?.gdp != null ? round(r.gdp - prev.gdp, 0) : null;
  const nominal = prev?.gdp ? round(((r.gdp - prev.gdp) / prev.gdp) * 100, 1) : null;
  const rankNational = nationalRanks.get(groupKey(r)).get(r.region_code);
  const prevRank = nationalRanks.get(`${r.level}_${r.year - 1}_${r.period}`)?.get(r.region_code);
  let share = null;
  let rankProvince = null;
  if (r.level === "province") {
    const total = national.get(`${r.year}_${r.period}`);
    share = total ? round((r.gdp / total) * 100, 1) : null;
  } else {
    rankProvince =
      provinceRanks.get(`${groupKey(r)}_${region.parent_code}`)?.get(r.region_code) ?? null;
    const provRec = records.get(keyOf(region.parent_code, r.year, r.period));
    share =
      !MUNICIPALITIES.includes(region.parent_code) && provRec?.gdp
        ? round((r.gdp / provRec.gdp) * 100, 1)
        : null;
  }
  return {
    ...r,
    name: region.name,
    short_name: region.short_name,
    parent_code: region.parent_code,
    tags: region.tags,
    gdp: round(r.gdp, 0),
    increment,
    nominal_growth: nominal,
    rank_national: rankNational,
    rank_province: rankProvince,
    rank_change: prevRank ? prevRank - rankNational : null,
    share,
  };
});

// 6. 期次发布状态
const provinceTotal = regions.filter((r) => r.level === "province").length;
const cityTotal = regions.filter((r) => r.level === "city" && visible(r.code)).length;
const periods = [...Map.groupBy(stats, (s) => `${s.year}_${s.period}`)]
  .map(([id, list]) => {
    const provinceCount = list.filter((s) => s.level === "province").length;
    const cityCount = list.filter((s) => s.level === "city").length;
    const { year, period } = list[0];
    return {
      _id: id,
      year,
      period,
      label: `${year}年${PERIOD_LABEL[period]}`,
      province_count: provinceCount,
      province_total: provinceTotal,
      city_count: cityCount,
      city_total: cityTotal,
      status:
        provinceCount >= provinceTotal ? "complete" : provinceCount > 0 ? "partial" : "unpublished",
      updated_at: updatedAt,
    };
  })
  .sort((a, b) => b.year - a.year || PERIODS.indexOf(b.period) - PERIODS.indexOf(a.period));

const sortRecords = (a, b) => a._id.localeCompare(b._id);
const outputs = {
  regions,
  gdp_records: [...records.values()].sort(sortRecords),
  gdp_stats: stats.sort(sortRecords),
  periods,
};
for (const [name, rows] of Object.entries(outputs)) {
  writeJson(p(`output/${name}.json`), rows);
  writeJsonl(p(`output/jsonl/${name}.jsonl`), rows);
}

const latest = periods.find((x) => x.province_count > 0);
console.log(
  `✅ gdp_records ${outputs.gdp_records.length} 条，gdp_stats ${stats.length} 条，periods ${periods.length} 个`
);
console.log(
  `   最新期次：${latest?.label}，省级 ${latest?.province_count}/${provinceTotal}，城市 ${latest?.city_count}/${cityTotal}`
);
