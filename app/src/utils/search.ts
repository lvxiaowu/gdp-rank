// 本地搜索地区：中文、全拼、首字母都能匹配（原型 P06）。地区字典在启动时已缓存到本地。
import { appState } from "@/store/app";
import type { Region } from "@/types";

export interface SearchHit {
  region: Region;
  /** 名称拆成高亮片段 */
  parts: { text: string; hit: boolean }[];
  score: number;
}

function highlight(name: string, keyword: string, initialsLen: number) {
  const idx = name.indexOf(keyword);
  if (idx >= 0) {
    return [
      { text: name.slice(0, idx), hit: false },
      { text: keyword, hit: true },
      { text: name.slice(idx + keyword.length), hit: false },
    ].filter((p) => p.text);
  }
  // 拼音首字母匹配时，高亮对应个数的汉字
  if (initialsLen > 0) {
    return [
      { text: name.slice(0, initialsLen), hit: true },
      { text: name.slice(initialsLen), hit: false },
    ].filter((p) => p.text);
  }
  return [{ text: name, hit: false }];
}

export function searchRegions(input: string): { provinces: SearchHit[]; cities: SearchHit[] } {
  const kw = input.trim();
  if (!kw) return { provinces: [], cities: [] };
  const lower = kw.toLowerCase();
  const isLatin = /^[a-z]+$/.test(lower);
  const hits: SearchHit[] = [];
  for (const r of appState.regions) {
    if (r.tags.includes("hidden")) continue;
    // 直辖市在城市维度和省级重复，只保留省级结果
    if (r.level === "city" && r.tags.includes("municipality")) continue;
    let score = 0;
    let initialsLen = 0;
    if (r.short_name === kw || r.name === kw) score = 100;
    else if (r.short_name.startsWith(kw)) score = 80;
    else if (r.name.includes(kw)) score = 60;
    else if (isLatin && r.initials.startsWith(lower)) {
      score = 50;
      initialsLen = lower.length;
    } else if (isLatin && r.pinyin.startsWith(lower)) score = 40;
    if (!score) continue;
    hits.push({
      region: r,
      parts: highlight(r.name, kw, initialsLen),
      score: score + (r.level === "province" ? 5 : 0),
    });
  }
  hits.sort((a, b) => b.score - a.score);
  return {
    provinces: hits.filter((h) => h.region.level === "province").slice(0, 10),
    cities: hits.filter((h) => h.region.level === "city").slice(0, 30),
  };
}
