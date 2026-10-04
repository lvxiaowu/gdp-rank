// 将 CNKI《中国城市统计年鉴》年度数据快照规范化为本项目原始 GDP 记录。
// 用法：node scripts/import-city-yearbook.mjs <data.json> [output.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
const output = process.argv[3] ?? path.join(root, "raw/city-yearbook.json");
if (!input) throw new Error("请提供 CNKI 城市统计年鉴 data.json 路径");

const data = JSON.parse(fs.readFileSync(input, "utf8"));
const gdpByCity = data["GDP(亿元)"];
const growthByCity = data["GDP增长率(%)"];
if (!gdpByCity || typeof gdpByCity !== "object") throw new Error('输入文件缺少 "GDP(亿元)" 指标');

const years = Array.from({ length: 9 }, (_, i) => 2015 + i).filter((year) => year !== 2017);
const rows = [];
for (const [name, yearly] of Object.entries(gdpByCity)) {
  for (const year of years) {
    const raw = yearly[`${year}年`];
    if (raw == null || raw === "") continue;
    const gdp = Number(raw);
    if (!Number.isFinite(gdp) || gdp <= 0) continue;
    const growthRaw = growthByCity?.[name]?.[`${year}年`];
    const real_growth = growthRaw == null || growthRaw === "" ? null : Number(growthRaw);
    rows.push({
      name,
      year,
      period: "FY",
      gdp,
      real_growth: Number.isFinite(real_growth) ? real_growth : null,
    });
  }
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      source: "CNKI 中国城市统计年鉴数据（年度 GDP 总量及 GDP 增长率）",
      source_url: "https://data.oversea.cnki.net/area/yearData?dcode=D02",
      source_snapshot: "https://github.com/wuhulamb/cnki-data",
      coverage: "2015-2016、2018-2023；年鉴未收录的城市年份不推算",
      rows,
    },
    null,
    2
  ) + "\n"
);
console.log(`已规范化 ${rows.length} 条城市年度 GDP，写入 ${output}`);
