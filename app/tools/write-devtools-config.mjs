import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(appRoot, "dist/mp-weixin");
const config = {
  description: "导入本目录运行小程序；云函数位于 GDP-RANK 仓库根目录。",
  miniprogramRoot: "./",
  cloudfunctionRoot: "../../../cloudfunctions/",
  compileType: "miniprogram",
  appid: "wx34e0a8df30de80a4",
  projectname: "gdp-rank",
  setting: {
    urlCheck: false,
    es6: true,
    minified: true,
    minifyWXSS: true,
    minifyWXML: true,
  },
  packOptions: { ignore: [], include: [] },
};

fs.writeFileSync(
  path.join(outputRoot, "project.config.json"),
  `${JSON.stringify(config, null, 2)}\n`
);
console.log("✅ 已为编译目录写入微信开发者工具配置");
