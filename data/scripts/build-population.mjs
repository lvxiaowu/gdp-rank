// Build an independent city_population collection from transcribed 2020 census records.
import { p, readCsv, readJson, writeJson, writeJsonl } from "../lib/io.mjs";

const regions = readJson(p("output/regions.json"));
const cityByCode = new Map(regions.filter((r) => r.level === "city").map((r) => [r.code, r]));
const rows = readCsv(p("manual/city_population_2020.csv"));
const docs = [];
const seen = new Set();

for (const [index, row] of rows.entries()) {
  const code = String(row.code ?? "").trim();
  const population = Number(row.population);
  const region = cityByCode.get(code);
  if (!region) throw new Error(`city_population_2020.csv 第 ${index + 2} 行：无效城市代码 ${code}`);
  if (seen.has(code))
    throw new Error(`city_population_2020.csv 第 ${index + 2} 行：城市代码重复 ${code}`);
  if (!Number.isSafeInteger(population) || population <= 0)
    throw new Error(`city_population_2020.csv 第 ${index + 2} 行：population 必须是正整数（人）`);
  const sourceUrl = String(row.source_url ?? "").trim();
  if (!/^https:\/\//.test(sourceUrl))
    throw new Error(`city_population_2020.csv 第 ${index + 2} 行：需要来源链接`);
  const sourceName = String(row.source_name ?? "").trim();
  if (!sourceName) throw new Error(`city_population_2020.csv 第 ${index + 2} 行：需要来源名称`);
  seen.add(code);
  docs.push({
    _id: `${code}_2020_census7`,
    region_code: code,
    year: 2020,
    population,
    population_scope: "全市常住人口",
    source: "census7",
    source_url: sourceUrl,
    source_name: sourceName,
    updated_at: new Date().toISOString(),
  });
}

writeJson(p("output/city_population.json"), docs);
writeJsonl(p("output/jsonl/city_population.jsonl"), docs);
console.log(`人口数据：已整理 ${docs.length} 个城市；其余城市不推算。`);
