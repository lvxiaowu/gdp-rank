// 把 output/ 下的四个集合写入微信云开发数据库（按 _id 覆盖写入，只上传有变化的文档）。
// 用法：
//   npm run upload                 上传全部有变化的文档
//   npm run upload -- --only=gdp_stats,periods
//   npm run upload -- --force      忽略缓存，全部重新写入
//   npm run upload:dry             只统计要写入的数量，不真正上传
// 需要在 data/.env 配置 TCB_ENV、TENCENTCLOUD_SECRETID、TENCENTCLOUD_SECRETKEY（见 README）。
import crypto from "node:crypto";
import fs from "node:fs";
import tcb from "@cloudbase/node-sdk";
import { p, readJson, writeJson } from "../lib/io.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const only = args
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
const COLLECTIONS = ["regions", "gdp_records", "gdp_stats", "periods"].filter(
  (c) => !only || only.includes(c)
);
const CONCURRENCY = 10;

if (fs.existsSync(p(".env"))) process.loadEnvFile(p(".env"));
const { TCB_ENV, TENCENTCLOUD_SECRETID, TENCENTCLOUD_SECRETKEY } = process.env;
if (!dryRun && (!TCB_ENV || !TENCENTCLOUD_SECRETID || !TENCENTCLOUD_SECRETKEY)) {
  console.error(
    "❌ 缺少 TCB_ENV / TENCENTCLOUD_SECRETID / TENCENTCLOUD_SECRETKEY，请在 data/.env 中配置"
  );
  process.exit(1);
}

const cachePath = p("output/.upload-cache.json");
const cache = force ? {} : readJson(cachePath, {});
const hash = (doc) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify({ ...doc, updated_at: undefined }))
    .digest("hex");

const db = dryRun
  ? null
  : tcb
      .init({
        env: TCB_ENV,
        secretId: TENCENTCLOUD_SECRETID,
        secretKey: TENCENTCLOUD_SECRETKEY,
      })
      .database();

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
    console.log(`  新建集合 ${name}`);
  } catch (err) {
    // 集合已存在时会报错，忽略
    if (!/exist/i.test(err.message ?? "")) throw err;
  }
}

async function runPool(items, worker) {
  let i = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await worker(item);
        done++;
        if (done % 200 === 0) process.stdout.write(`  ${done}/${items.length}\r`);
      }
    })
  );
}

for (const name of COLLECTIONS) {
  const docs = readJson(p(`output/${name}.json`));
  const changed = docs.filter((d) => cache[`${name}/${d._id}`] !== hash(d));
  console.log(`${name}：共 ${docs.length} 条，需写入 ${changed.length} 条`);
  if (dryRun || changed.length === 0) continue;

  await ensureCollection(name);
  const failed = [];
  await runPool(changed, async (doc) => {
    const { _id, ...data } = doc;
    try {
      await db.collection(name).doc(_id).set(data);
      cache[`${name}/${_id}`] = hash(doc);
    } catch (err) {
      failed.push(`${_id}: ${err.message}`);
    }
  });
  writeJson(cachePath, cache);
  if (failed.length) {
    console.error(
      `❌ ${name} 有 ${failed.length} 条写入失败（重新运行会只重试失败的）：\n  ` +
        failed.slice(0, 10).join("\n  ")
    );
    process.exitCode = 1;
  } else {
    console.log(`  ✅ ${name} 写入完成`);
  }
}
