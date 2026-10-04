// 城市榜范围：全国 / 某省 / 分组
import { getRegion } from "@/store/app";

export const GROUPS = [
  { tag: "municipality", label: "直辖市" },
  { tag: "capital", label: "省会城市" },
  { tag: "sub_provincial", label: "副省级城市" },
  { tag: "separate_plan", label: "计划单列市" },
  { tag: "yrd", label: "长三角" },
  { tag: "prd", label: "珠三角" },
  { tag: "jjj", label: "京津冀" },
  { tag: "chengyu", label: "成渝" },
];

export function scopeLabel(scope: string): string {
  if (!scope || scope === "all") return "全国";
  const [type, value] = scope.split(":");
  if (type === "province") return getRegion(value)?.short_name ?? "全国";
  return GROUPS.find((g) => g.tag === value)?.label ?? "全国";
}
