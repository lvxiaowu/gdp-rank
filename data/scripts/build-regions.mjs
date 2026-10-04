// 生成地区字典 output/regions.json：31 个省级 + 地级及以上城市（含 4 个直辖市）。
// 区划数据来自 china-division（国家统计局统计用区划代码），城市分组标签在下方维护。
import { createRequire } from "node:module";
import { pinyin } from "pinyin-pro";
import { MUNICIPALITIES } from "../lib/config.mjs";
import { p, writeJson } from "../lib/io.mjs";

const require = createRequire(import.meta.url);
const provinces = require("china-division/dist/provinces.json");
const cities = require("china-division/dist/cities.json");

// ---- 分组标签（按城市简称） ----
const CAPITALS =
  "石家庄 太原 呼和浩特 沈阳 长春 哈尔滨 南京 杭州 合肥 福州 南昌 济南 郑州 武汉 长沙 广州 南宁 海口 成都 贵阳 昆明 拉萨 西安 兰州 西宁 银川 乌鲁木齐";
const SUB_PROVINCIAL =
  "广州 深圳 南京 杭州 宁波 厦门 济南 青岛 武汉 成都 西安 沈阳 大连 长春 哈尔滨";
const SEPARATE_PLAN = "大连 青岛 宁波 厦门 深圳";
const PRD = "广州 深圳 珠海 佛山 江门 东莞 中山 惠州 肇庆";
const CHENGYU_SC = "成都 自贡 泸州 德阳 绵阳 遂宁 内江 乐山 南充 眉山 宜宾 广安 达州 雅安 资阳";
const split = (s) => new Set(s.split(" "));
const sets = {
  capital: split(CAPITALS),
  sub_provincial: split(SUB_PROVINCIAL),
  separate_plan: split(SEPARATE_PLAN),
  prd: split(PRD),
  chengyu: split(CHENGYU_SC + " 重庆"),
};
// 长三角 = 上海 + 江苏 + 浙江 + 安徽全部地级市（41 城）；京津冀 = 北京 + 天津 + 河北（13 城）
const YRD_PROVINCES = new Set(["31", "32", "33", "34"]);
const JJJ_PROVINCES = new Set(["11", "12", "13"]);
// 长期无 GDP 数据、默认不展示的地区
const HIDDEN = new Set(["460300"]); // 三沙

const ETHNIC = "朝鲜|土家|苗|侗|布依|白|傣|景颇|傈僳|哈尼|彝|壮|藏|羌|回|蒙古|哈萨克|柯尔克孜";
function shortName(name, level) {
  if (level === "province") {
    const m = name.match(/^(内蒙古|广西|西藏|宁夏|新疆)/);
    if (m) return m[1];
    return name.replace(/(省|市)$/, "");
  }
  const zz = name.match(new RegExp(`^(.+?)(${ETHNIC})族?.*自治州$`));
  if (zz) return zz[1];
  return name.replace(/(市|地区|盟)$/, "");
}

function py(short) {
  const arr = pinyin(short, { toneType: "none", type: "array", v: true });
  return { pinyin: arr.join(""), initials: arr.map((s) => s[0]).join("") };
}

const regions = [];

for (const prov of provinces) {
  const code = `${prov.code}0000`;
  const short = shortName(prov.name, "province");
  regions.push({
    _id: code,
    code,
    name: prov.name,
    short_name: short,
    level: "province",
    parent_code: null,
    ...py(short),
    tags: MUNICIPALITIES.includes(code) ? ["municipality"] : [],
  });
}

// 直辖市同时作为城市参与城市榜，城市代码用 xx0100，避免与省级代码冲突
for (const code of MUNICIPALITIES) {
  const prov = regions.find((r) => r.code === code);
  const cityCode = `${code.slice(0, 2)}0100`;
  const tags = ["municipality"];
  if (YRD_PROVINCES.has(code.slice(0, 2))) tags.push("yrd");
  if (JJJ_PROVINCES.has(code.slice(0, 2))) tags.push("jjj");
  if (sets.chengyu.has(prov.short_name)) tags.push("chengyu");
  regions.push({
    _id: cityCode,
    code: cityCode,
    name: prov.name,
    short_name: prov.short_name,
    level: "city",
    parent_code: code,
    ...py(prov.short_name),
    tags,
  });
}

for (const c of cities) {
  // 跳过直辖市的「市辖区」「县」和「省直辖县级行政区划」
  if (MUNICIPALITIES.includes(`${c.provinceCode}0000`)) continue;
  if (/市辖区|县$|省直辖|自治区直辖/.test(c.name)) continue;
  const code = `${c.code}00`;
  const short = shortName(c.name, "city");
  const tags = [];
  for (const [tag, set] of Object.entries(sets)) if (set.has(short)) tags.push(tag);
  if (YRD_PROVINCES.has(c.provinceCode)) tags.push("yrd");
  if (JJJ_PROVINCES.has(c.provinceCode)) tags.push("jjj");
  if (HIDDEN.has(code)) tags.push("hidden");
  regions.push({
    _id: code,
    code,
    name: c.name,
    short_name: short,
    level: "city",
    parent_code: `${c.provinceCode}0000`,
    ...py(short),
    tags,
  });
}

// 自检：分组数量应与原型文档一致
const count = (tag) => regions.filter((r) => r.level === "city" && r.tags.includes(tag)).length;
const expected = {
  municipality: 4,
  capital: 27,
  sub_provincial: 15,
  separate_plan: 5,
  yrd: 41,
  prd: 9,
  jjj: 13,
  chengyu: 16,
};
for (const [tag, n] of Object.entries(expected)) {
  if (count(tag) !== n)
    console.warn(`⚠️ 分组 ${tag} 有 ${count(tag)} 个城市，预期 ${n}，请检查标签名单`);
}

writeJson(p("output/regions.json"), regions);
const cityCount = regions.filter((r) => r.level === "city").length;
console.log(`✅ regions.json：${regions.length - cityCount} 个省级，${cityCount} 个城市`);
