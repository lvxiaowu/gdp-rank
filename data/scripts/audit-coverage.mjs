// 按统计期检查城市GDP和三类增长指标的覆盖，并打印缺失城市数量。
import { PERIODS } from "../lib/config.mjs";
import { p, readJson } from "../lib/io.mjs";

const regions = readJson(p("output/regions.json"));
const stats = readJson(p("output/gdp_stats.json"));
const cities = regions.filter((r) => r.level === "city" && !r.tags.includes("hidden"));
const cityStats = stats.filter((r) => r.level === "city");
const periods = [...new Set(cityStats.map((r) => `${r.year}_${r.period}`))].sort((a, b) => {
  const [yearA, periodA] = a.split("_");
  const [yearB, periodB] = b.split("_");
  return Number(yearA) - Number(yearB) || PERIODS.indexOf(periodA) - PERIODS.indexOf(periodB);
});
console.log("期次\tGDP城市数/总数\t增长量\t名义增速\t实际增速");
for (const period of periods) {
  const [year, label] = period.split("_");
  const rows = cityStats.filter((r) => `${r.year}_${r.period}` === period);
  const has = (field) => rows.filter((r) => r[field] != null).length;
  console.log(
    `${year}-${label}\t${rows.length}/${cities.length}\t${has("increment")}\t${has("nominal_growth")}\t${has("real_growth")}`
  );
}

for (const period of [
  "2026_Q1",
  "2026_H1",
  "2023_H1",
  "2025_Q1",
  "2024_Q1",
  "2025_FY",
  "2024_FY",
  "2017_FY",
]) {
  const [year, label] = period.split("_");
  const rows = cityStats.filter((r) => `${r.year}_${r.period}` === period);
  const present = new Set(rows.map((r) => r.region_code));
  const missing = cities.filter((city) => !present.has(city.code));
  console.log(`\n${year}-${label} 缺少GDP：${missing.length}城`);
  console.log(missing.map((r) => r.short_name).join("、") || "无");
}
