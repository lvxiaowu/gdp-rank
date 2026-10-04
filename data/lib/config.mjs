// 国家统计局「国家数据」新版接口（data.stats.gov.cn/dg/website）的指标 ID。
// 这些 ID 是 2026-10 从网站前端抓包得到的；网站改版后若接口报错，按 README「接口失效怎么办」重新抓。

export const NBS_BASE = "https://data.stats.gov.cn/dg/website/publicrelease/web/external";

export const NBS_SERIES = {
  // 分省季度：地区生产总值累计值（亿元）、地区生产总值指数（上年同期=100）累计值
  provinceQuarter: {
    rootId: "854f819b04104191a5ae2f2cba270e6c",
    cid: "44ecf9ea21884caea5451c35e9c08fff",
    gdp: "dc168397231c49f391ee9e11966de389",
    index: "23c7f329424d4e90b22abc092a5b676f",
  },
  // 分省年度：地区生产总值（亿元）、地区生产总值指数（上年=100），两个指标在不同目录下
  provinceYear: {
    rootId: "c4d82af16c3d4f0cb4f09d4af7d5888e",
    gdpCid: "6f8fbd415cbc40ffa7ecb7fd917f2598",
    gdp: "aff57de5ee994283974705914fbed246",
    indexCid: "05cf8a895d3e41658f4dbc56fdfabf9b",
    index: "8fc8b9f0d07944688b199884db43cb68",
  },
  // 全国季度：国内生产总值累计值（现价，亿元），用于计算「占全国比重」
  nationalQuarter: {
    rootId: "a94b8b7365a94874968cabbe392cf679",
    cid: "28d936104e304aa191e338eb82b6dc09",
    gdp: "8c5fab362d124fa7b91af833b3bd7397",
  },
  // 全国年度：国内生产总值（亿元）
  nationalYear: {
    rootId: "884c062607104a91967b22742537f44f",
    cid: "f7fd25aaad184414875632cf2327da60",
    gdp: "7dc6a2ee6c614960b7059991e0cc4d96",
  },
  // 主要城市年度（36 个城市）：地区生产总值（当年价格，亿元）。没有实际增速。
  cityYear: {
    rootId: "2d06bab01494417e9052ef0f8d93e23e",
    cid: "75a85abe58c749e0ad1d85be343e9056",
    gdp: "35613910b9ad47e19cf79ae041ccb7ed",
    daCatalogId: "5772e42228f948149cf5d6a11d07bce1",
  },
};

// 数据起始年份
export const PROVINCE_START_YEAR = 2015;
export const CITY_START_YEAR = 2018;

// 期次：统计局季度代码 01~04SS 对应累计值
export const PERIODS = ["Q1", "H1", "Q3", "FY"];
export const PERIOD_LABEL = { Q1: "一季度", H1: "上半年", Q3: "前三季度", FY: "全年" };
export const SS_TO_PERIOD = { "01": "Q1", "02": "H1", "03": "Q3", "04": "FY" };

export const NATIONAL_CODE = "000000";
export const MUNICIPALITIES = ["110000", "120000", "310000", "500000"];

// 校验阈值（见原型文档第九章）
export const CHECK = {
  citySumDeviation: 0.03,
  realGrowthMin: -10,
  realGrowthMax: 15,
  yoyChangeMax: 0.3,
  // 2020~2021 年受疫情和低基数影响，增速大起大落属正常，不做增速和同比检查
  skipGrowthYears: [2020, 2021],
};
