import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const p = (...parts) => path.join(ROOT, ...parts);

export function readJson(file, fallback) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`找不到 ${path.relative(ROOT, file)}，请先运行前置步骤`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

// 云开发控制台「导入」支持 JSON Lines
export function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

export function readCsv(file) {
  if (!fs.existsSync(file)) return [];
  // 去掉以 # 开头的说明行（注释里可能有逗号，不能交给 CSV 解析器）
  const text = fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: "greedy" });
  if (errors.length) throw new Error(`${path.relative(ROOT, file)} 解析失败：${errors[0].message}`);
  return data;
}

export const round = (n, d = 1) =>
  n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** d) / 10 ** d;
