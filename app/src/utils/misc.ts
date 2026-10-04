import { getRegion } from "@/store/app";

export function goRegion(code: string, year?: number, period?: string) {
  const q = year && period ? `&year=${year}&period=${period}` : "";
  uni.navigateTo({ url: `/pages/region/index?code=${code}${q}` });
}

/** 复制表格文本（制表符分隔，可直接粘贴进 Excel） */
export function copyTable(rows: (string | number)[][], tip = "已复制，可粘贴到表格") {
  const data = rows.map((r) => r.join("\t")).join("\n");
  uni.setClipboardData({
    data,
    showToast: false,
    success: () => uni.showToast({ title: tip, icon: "none" }),
  });
}

/** 城市显示所属省简称，省份显示空 */
export const parentName = (parentCode: string | null | undefined) =>
  getRegion(parentCode)?.short_name ?? "";

export function toastError(err: unknown) {
  uni.showToast({ title: (err as Error)?.message || "加载失败", icon: "none" });
}
