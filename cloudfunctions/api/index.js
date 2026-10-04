// 云函数入口：小程序所有数据请求都走这一个函数，按 action 分发到 core.mjs。
// 调用：wx.cloud.callFunction({ name: "api", data: { action: "ranking", data: {...} } })
// 返回：{ ok: true, data } 或 { ok: false, message }
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const MAX_LIMIT = 1000; // 服务端单次最多取 1000 条
const CACHE_TTL = 5 * 60 * 1000; // 地区、期次、配置在实例内缓存 5 分钟

async function getAll(collection, where = {}) {
  const query = db.collection(collection).where(where);
  const { total } = await query.count();
  const pages = Math.ceil(total / MAX_LIMIT);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      query
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .get()
    )
  );
  return results.flatMap((r) => r.data);
}

const cache = new Map();
async function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.value;
  const value = await loader();
  cache.set(key, { value, time: Date.now() });
  return value;
}

function createSource(openid) {
  return {
    regions: () => cached("regions", () => getAll("regions")),
    periods: () => cached("periods", () => getAll("periods")),
    config: () =>
      cached("config", async () => {
        const { data } = await db.collection("app_config").where({ _id: "main" }).get();
        return data[0] ?? {};
      }),
    statsByPeriod: (level, year, period) => getAll("gdp_stats", { level, year, period }),
    statsByRegion: (code) => getAll("gdp_stats", { region_code: code }),
    async getUser() {
      const { data } = await db.collection("user_data").where({ _id: openid }).get();
      return data[0] ?? null;
    },
    async saveUser(doc) {
      const { _id, ...rest } = doc;
      await db
        .collection("user_data")
        .doc(openid)
        // wx-server-sdk 的 Document.set 参数必须包在 data 字段中。
        // 直接传文档内容会触发 `parameter.data should be object instead of undefined`。
        .set({ data: { ...rest, updated_at: db.serverDate() } });
    },
  };
}

exports.main = async (event) => {
  const { action, data } = event;
  const { OPENID } = cloud.getWXContext();
  try {
    const core = await import("./core.mjs");
    const result = await core.handle(createSource(OPENID), action, data);
    return { ok: true, data: result };
  } catch (err) {
    console.error(action, err);
    return { ok: false, message: err.message || "服务异常" };
  }
};
