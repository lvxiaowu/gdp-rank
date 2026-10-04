// 从国家统计局「国家数据」抓取：分省季度、分省年度、全国季度 / 年度、36 个主要城市年度 GDP。
// 输出到 raw/nbs/*.json（原始值，不做计算），供 build-data.mjs 使用。
import {
  NBS_SERIES as S,
  PROVINCE_START_YEAR,
  CITY_START_YEAR,
  SS_TO_PERIOD,
} from "../lib/config.mjs";
import { getDas, queryValues } from "../lib/nbs.mjs";
import { p, readJson, writeJson } from "../lib/io.mjs";

const now = new Date();
const thisYear = now.getFullYear();
const quarterRange = (from) => `${from}01SS-${thisYear}04SS`;
const yearRange = (from) => `${from}YY-${thisYear}YY`;

const regions = readJson(p("output/regions.json"));
const provinceDas = regions
  .filter((r) => r.level === "province")
  .map((r) => ({ text: r.name, value: `${r.code}000000` }));
const nationalDas = [{ text: "全国", value: "000000000000" }];

// "202603SS" -> {year: 2026, period: 'Q3'}；"2025YY" -> {year: 2025, period: 'FY'}
function parseTime(t) {
  const year = Number(t.slice(0, 4));
  if (t.endsWith("YY")) return { year, period: "FY" };
  return { year, period: SS_TO_PERIOD[t.slice(4, 6)] };
}

// 把 gdp、index 两个序列合并成 {code, year, period, gdp, index}
function merge(gdpRows, indexRows = []) {
  const map = new Map();
  const key = (r) => `${r.code}|${r.time}`;
  for (const r of gdpRows)
    map.set(key(r), { code: r.code, ...parseTime(r.time), gdp: r.value, index: null });
  for (const r of indexRows) {
    const row = map.get(key(r)) ?? { code: r.code, ...parseTime(r.time), gdp: null, index: null };
    row.index = r.value;
    map.set(key(r), row);
  }
  return [...map.values()].filter((r) => r.gdp != null || r.index != null);
}

async function step(name, fn) {
  process.stdout.write(`抓取 ${name} ... `);
  const rows = await fn();
  writeJson(p(`raw/nbs/${name}.json`), {
    fetched_at: now.toISOString(),
    source: "https://data.stats.gov.cn",
    rows,
  });
  console.log(`${rows.length} 条`);
  return rows;
}

await step("province-quarter", async () => {
  const q = {
    rootId: S.provinceQuarter.rootId,
    cid: S.provinceQuarter.cid,
    das: provinceDas,
    dts: quarterRange(PROVINCE_START_YEAR),
  };
  const gdp = await queryValues({ ...q, indicatorId: S.provinceQuarter.gdp });
  const index = await queryValues({ ...q, indicatorId: S.provinceQuarter.index });
  return merge(gdp, index);
});

await step("province-year", async () => {
  const base = {
    rootId: S.provinceYear.rootId,
    das: provinceDas,
    dts: yearRange(PROVINCE_START_YEAR),
  };
  const gdp = await queryValues({
    ...base,
    cid: S.provinceYear.gdpCid,
    indicatorId: S.provinceYear.gdp,
  });
  const index = await queryValues({
    ...base,
    cid: S.provinceYear.indexCid,
    indicatorId: S.provinceYear.index,
  });
  return merge(gdp, index);
});

await step("national-quarter", async () => {
  const gdp = await queryValues({
    rootId: S.nationalQuarter.rootId,
    cid: S.nationalQuarter.cid,
    indicatorId: S.nationalQuarter.gdp,
    das: nationalDas,
    dts: quarterRange(PROVINCE_START_YEAR),
  });
  return merge(gdp);
});

await step("national-year", async () => {
  const gdp = await queryValues({
    rootId: S.nationalYear.rootId,
    cid: S.nationalYear.cid,
    indicatorId: S.nationalYear.gdp,
    das: nationalDas,
    dts: yearRange(PROVINCE_START_YEAR),
  });
  return merge(gdp);
});

await step("city-year", async () => {
  const das = await getDas(S.cityYear.daCatalogId);
  const gdp = await queryValues({
    rootId: S.cityYear.rootId,
    cid: S.cityYear.cid,
    indicatorId: S.cityYear.gdp,
    das,
    dts: yearRange(CITY_START_YEAR),
  });
  // 直辖市在城市维度用 xx0100 代码
  return merge(gdp).map((r) =>
    r.code.endsWith("0000") ? { ...r, code: `${r.code.slice(0, 2)}0100` } : r
  );
});

console.log("✅ 原始数据已保存到 raw/nbs/");
