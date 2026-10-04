// 所有数据请求的唯一出口。
// 小程序：调用云函数 api；H5（本地预览）：直接用 ../data/output 的数据跑同一份 core.mjs 逻辑。
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
// #ifdef H5
import { mockCall } from "./mock";
// #endif

let cloudInited = false;

async function call<T>(action: string, data?: object): Promise<T> {
  // #ifdef H5
  return (await mockCall(action, data)) as T;
  // #endif
  // #ifdef MP-WEIXIN
  if (!CLOUD_ENV) throw new Error("未配置云开发环境 ID，请修改 src/config.ts");
  if (!cloudInited) {
    wx.cloud.init({ env: CLOUD_ENV, traceUser: false });
    cloudInited = true;
  }
  const res = await wx.cloud.callFunction({ name: "api", data: { action, data } });
  const result = res.result as { ok: boolean; data: T; message?: string };
  if (!result?.ok) throw new Error(result?.message || "服务异常，请稍后再试");
  return result.data;
  // #endif
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
