// 所有数据请求的唯一出口。
// 已配置 CLOUD_ENV：微信端调用云函数 api。
// 未配置：H5 / 微信开发者工具都读 ../data/output，跑同一份 core.mjs。
import type {
  BootResult,
  CompareResult,
  HomeResult,
  Level,
  PeriodKey,
  RankingResult,
  RegionResult,
  SortKey,
  Stat,
  UserDoc,
} from "@/types";
import { CLOUD_ENV } from "@/config";
import { mockCall } from "./mock";

let cloudInited = false;

async function call<T>(action: string, data?: object): Promise<T> {
  // H5 始终走本地数据；微信端未填云环境 ID 时同样走本地，方便开发者工具预览
  if (!CLOUD_ENV) return (await mockCall(action, data)) as T;
  // #ifdef MP-WEIXIN
  if (!cloudInited) {
    wx.cloud.init({ env: CLOUD_ENV, traceUser: false });
    cloudInited = true;
  }
  const res = await wx.cloud.callFunction({ name: "api", data: { action, data } });
  const result = res.result as { ok: boolean; data: T; message?: string };
  if (!result?.ok) throw new Error(result?.message || "服务异常，请稍后再试");
  return result.data;
  // #endif
  // #ifdef H5
  return (await mockCall(action, data)) as T;
  // #endif
  throw new Error("当前环境不支持该请求");
}

export const api = {
  boot: (regionsVersion?: string) => call<BootResult>("boot", { regionsVersion }),
  home: (favorites: string[]) => call<HomeResult>("home", { favorites }),
  /** 一组地区各自最新一期的数据 */
  latest: (codes: string[]) => call<Stat[]>("latest", { codes }),
  ranking: (q: {
    level: Level;
    year: number;
    period: PeriodKey;
    scope: string;
    sort: SortKey;
    order: "asc" | "desc";
  }) => call<RankingResult>("ranking", q),
  region: (code: string, year?: number, period?: PeriodKey) =>
    call<RegionResult>("region", { code, year, period }),
  compare: (codes: string[], period: PeriodKey) =>
    call<CompareResult>("compare", { codes, period }),
  user: (op: "get" | "toggle" | "push" | "set" | "clear", key?: keyof UserDoc, value?: unknown) =>
    call<UserDoc>("user", { op, key, value }),
};
