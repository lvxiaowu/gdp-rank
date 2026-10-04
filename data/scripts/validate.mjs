// 数据校验（原型文档第九章的规则）。有 ❌ 错误时退出码为 1，阻止上传；⚠️ 警告需要人工确认。
import { CHECK, MUNICIPALITIES } from "../lib/config.mjs";
import { p, readJson } from "../lib/io.mjs";

const regions = readJson(p("output/regions.json"));
const records = readJson(p("output/gdp_records.json"));
const recordMap = new Map(records.map((r) => [r._id, r]));
const name = (code) => regions.find((r) => r.code === code)?.name ?? code;
const label = (r) => `${name(r.region_code)} ${r.year} ${r.period}`;

const errors = [];
const warnings = [];

// 直辖市的城市记录是省级记录的副本，不重复检查
const isMunicipalityCity = (r) =>
  MUNICIPALITIES.some((m) => r.region_code === `${m.slice(0, 2)}0100`);

for (const r of records) {
  if (isMunicipalityCity(r)) continue;
  if (!r.source_url) errors.push(`${label(r)}：缺少来源链接`);
  if (r.gdp != null && !(r.gdp > 0)) errors.push(`${label(r)}：GDP 不是正数（${r.gdp}）`);
  if (CHECK.skipGrowthYears.includes(r.year)) continue;
  if (
    r.real_growth != null &&
    (r.real_growth < CHECK.realGrowthMin || r.real_growth > CHECK.realGrowthMax)
  ) {
    warnings.push(
      `${label(r)}：实际增速 ${r.real_growth}% 超出 ${CHECK.realGrowthMin}%~${CHECK.realGrowthMax}%`
    );
  }
  const prev = recordMap.get(`${r.region_code}_${r.year - 1}_${r.period}`);
  if (prev?.gdp && r.gdp && Math.abs(r.gdp / prev.gdp - 1) > CHECK.yoyChangeMax) {
    warnings.push(
      `${label(r)}：总量同比变化 ${((r.gdp / prev.gdp - 1) * 100).toFixed(1)}%，超过 ${CHECK.yoyChangeMax * 100}%`
    );
  }
}

// 省内城市合计 vs 全省：只在该省所有城市都有数据时比较
const citiesByProvince = Map.groupBy(
  regions.filter(
    (r) =>
      r.level === "city" && !r.tags.includes("hidden") && !MUNICIPALITIES.includes(r.parent_code)
  ),
  (r) => r.parent_code
);
const periodKeys = new Set(records.map((r) => `${r.year}_${r.period}`));
for (const [prov, cities] of citiesByProvince) {
  for (const key of periodKeys) {
    const provRec = recordMap.get(`${prov}_${key}`);
    if (!provRec?.gdp) continue;
    const values = cities.map((c) => recordMap.get(`${c.code}_${key}`)?.gdp);
    if (values.some((v) => v == null)) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    const dev = sum / provRec.gdp - 1;
    if (Math.abs(dev) > CHECK.citySumDeviation) {
      warnings.push(
        `${name(prov)} ${key.replace("_", " ")}：各市合计 ${sum.toFixed(0)} 与全省 ${provRec.gdp} 偏差 ${(dev * 100).toFixed(1)}%`
      );
    }
  }
}

if (warnings.length)
  console.warn(`⚠️ ${warnings.length} 条警告：\n` + warnings.map((w) => "  " + w).join("\n"));
if (errors.length) {
  console.error(`❌ ${errors.length} 条错误：\n` + errors.map((e) => "  " + e).join("\n"));
  process.exit(1);
}
console.log(
  `✅ 校验通过（${records.length} 条记录${warnings.length ? `，${warnings.length} 条警告请人工确认` : ""}）`
);
