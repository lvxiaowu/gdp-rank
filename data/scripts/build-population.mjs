// Build an independent city_population collection from year-specific city population records.
import { p, readCsv, readJson, writeJson, writeJsonl } from "../lib/io.mjs";

const regions = readJson(p("output/regions.json"));
const cityByCode = new Map(regions.filter((r) => r.level === "city").map((r) => [r.code, r]));
const rows = readCsv(p("manual/city_population.csv"));
const docs = [];
const seen = new Set();

for (const [index, row] of rows.entries()) {
  const code = String(row.code ?? "").trim();
  const year = Number(row.year);
  const population = Number(row.population);
  const region = cityByCode.get(code);
  const key = `${code}_${year}`;
  if (!region) throw new Error(`city_population.csv 第 ${index + 2} 行：无效城市代码 ${code}`);
  if (!Number.isInteger(year) || year < 1900 || year > 2100)
    throw new Error(`city_population.csv 第 ${index + 2} 行：year 必须是有效年份`);
  if (seen.has(key))
    throw new Error(`city_population.csv 第 ${index + 2} 行：城市和年份重复 ${key}`);
  if (!Number.isSafeInteger(population) || population <= 0)
    throw new Error(`city_population.csv 第 ${index + 2} 行：population 必须是正整数（人）`);
  const sourceUrl = String(row.source_url ?? "").trim();
  if (!/^https:\/\//.test(sourceUrl))
    throw new Error(`city_population.csv 第 ${index + 2} 行：需要来源链接`);
  const sourceName = String(row.source_name ?? "").trim();
  if (!sourceName) throw new Error(`city_population.csv 第 ${index + 2} 行：需要来源名称`);
  const source = String(row.source ?? "census7").trim();
  if (!/^[a-z0-9-]+$/.test(source))
    throw new Error(`city_population.csv 第 ${index + 2} 行：source 格式无效`);
  seen.add(key);
  docs.push({
    _id: `${code}_${year}_${source}`,
    region_code: code,
    year,
    population,
    population_scope: "全市常住人口",
    source,
    source_url: sourceUrl,
    source_name: sourceName,
    updated_at: new Date().toISOString(),
  });
}

writeJson(p("output/city_population.json"), docs);
writeJsonl(p("output/jsonl/city_population.jsonl"), docs);
console.log(`人口数据：已整理 ${docs.length} 条城市-年份记录；其余城市不推算。`);
