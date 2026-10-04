// 用户数据：收藏、最近查看、对比篮、搜索历史。存在云数据库 user_data（按 openid），不需要登录授权。
// 本地先改再同步，失败时回滚并提示。
import { reactive } from "vue";
import { api } from "@/api";
import type { UserDoc } from "@/types";

export const MAX_COMPARE = 4;

export const userState = reactive<UserDoc & { loaded: boolean }>({
  loaded: false,
  favorites: [],
  history: [],
  compare: [],
  search_history: [],
});

function apply(doc: UserDoc) {
  userState.favorites = doc.favorites ?? [];
  userState.history = doc.history ?? [];
  userState.compare = doc.compare ?? [];
  userState.search_history = doc.search_history ?? [];
  syncCompareBadge();
}

let loadPromise: Promise<void> | null = null;
export function loadUser() {
  loadPromise ??= api
    .user("get")
    .then((doc) => {
      apply(doc);
      userState.loaded = true;
    })
    .catch(() => {
      loadPromise = null;
    });
  return loadPromise;
}

async function mutate(
  op: "toggle" | "push" | "set" | "clear",
  key: keyof UserDoc,
  value: unknown,
  local: () => void
) {
  const backup = JSON.parse(JSON.stringify({ ...userState })) as UserDoc;
  local();
  syncCompareBadge();
  try {
    apply(await api.user(op, key, value));
  } catch (err) {
    apply(backup);
    uni.showToast({ title: (err as Error).message || "操作失败", icon: "none" });
    throw err;
  }
}

export const isFavorite = (code: string) => userState.favorites.includes(code);
export const inCompare = (code: string) => userState.compare.includes(code);

export async function toggleFavorite(code: string) {
  const has = isFavorite(code);
  await mutate("toggle", "favorites", code, () => {
    userState.favorites = has
      ? userState.favorites.filter((c) => c !== code)
      : [code, ...userState.favorites];
  });
  uni.showToast({ title: has ? "已取消收藏" : "已收藏", icon: "none" });
}

/** 加入 / 移出对比篮，返回操作后是否在篮中 */
export async function toggleCompare(code: string): Promise<boolean> {
  const has = inCompare(code);
  if (!has && userState.compare.length >= MAX_COMPARE) {
    uni.showToast({ title: `最多对比 ${MAX_COMPARE} 个地区`, icon: "none" });
    return false;
  }
  await mutate("toggle", "compare", code, () => {
    userState.compare = has
      ? userState.compare.filter((c) => c !== code)
      : [...userState.compare, code];
  });
  return !has;
}

export function setCompare(codes: string[]) {
  const list = codes.slice(0, MAX_COMPARE);
  return mutate("set", "compare", list, () => {
    userState.compare = list;
  });
}

export function pushHistory(code: string) {
  return mutate("push", "history", code, () => {
    userState.history = [code, ...userState.history.filter((c) => c !== code)].slice(0, 20);
  }).catch(() => undefined);
}

export function pushSearch(keyword: string) {
  return mutate("push", "search_history", keyword, () => {
    userState.search_history = [
      keyword,
      ...userState.search_history.filter((k) => k !== keyword),
    ].slice(0, 10);
  }).catch(() => undefined);
}

export function clearSearch() {
  return mutate("clear", "search_history", null, () => {
    userState.search_history = [];
  });
}

/** 对比 Tab 角标显示对比篮数量 */
export function syncCompareBadge() {
  const n = userState.compare.length;
  const noop = () => undefined;
  if (n > 0) uni.setTabBarBadge({ index: 2, text: String(n), fail: noop });
  else uni.removeTabBarBadge({ index: 2, fail: noop });
}
