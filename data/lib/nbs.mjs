import { NBS_BASE } from "./config.mjs";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Referer: "https://data.stats.gov.cn/dg/website/page.html",
  "Content-Type": "application/json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 统计局网站有 WAF，请求之间留间隔，失败重试
async function request(path, { method = "GET", body } = {}, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(NBS_BASE + path, {
        method,
        headers: HEADERS,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      const json = JSON.parse(text);
      if (!json.success) throw new Error(`接口返回失败: ${json.message}`);
      await sleep(600);
      return json.data;
    } catch (err) {
      if (i === retries) throw new Error(`${path} 请求失败：${err.message}`);
      await sleep(1500 * (i + 1));
    }
  }
}

export async function getDas(daCatalogId) {
  const list = await request(`/getDasByDaCatalogId?daCid=${daCatalogId}`);
  return list.map((d) => ({ text: d.name_text, value: d.name_value }));
}

/**
 * 查询一个指标在多个地区、一段时间内的值。
 * @param {object} q
 * @param {string} q.rootId 数据库根节点
 * @param {string} q.cid 指标所在目录
 * @param {string} q.indicatorId 指标 ID（一次只查一个，多个指标时接口只返回第一个）
 * @param {{text:string,value:string}[]} q.das 地区，value 为 12 位区划代码；全国为 000000000000
 * @param {string} q.dts 时间范围，季度如 "201501SS-202604SS"，年度如 "2015YY-2025YY"
 * @returns {Promise<{code:string, area:string, time:string, value:number|null}[]>}
 */
export async function queryValues({ rootId, cid, indicatorId, das, dts }) {
  const data = await request("/stream/esData", {
    method: "POST",
    body: {
      cid,
      indicatorIds: [indicatorId],
      daCatalogId: "",
      das,
      showType: das.length > 1 ? 3 : 1,
      dts: [dts],
      rootId,
    },
  });
  const rows = [];
  for (const period of data || []) {
    for (const v of period.values || []) {
      if (v._id !== indicatorId) continue;
      const code = (v.areaCode || v.da || "").slice(0, 6);
      rows.push({
        code,
        area: v.area || v.da_name,
        time: period.code,
        value: v.value === "" || v.value == null ? null : Number(v.value),
      });
    }
  }
  return rows;
}
