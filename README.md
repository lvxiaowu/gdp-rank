·

·

# 省市GDP排行 · 微信小程序

查全国各省、各城市 GDP 排名和增速的微信小程序。产品原型见飞书文档《省市GDP排行 · 微信小程序产品原型文档》。

```
gdp-rank/
├── app/                 小程序前端（uni-app + Vue 3 + TypeScript）
├── cloudfunctions/
│   ├── api/             唯一的云函数，所有数据请求都走它
│   │   ├── index.js     入口：连云数据库
│   │   └── core.mjs     业务逻辑（前端 H5 预览也用这一份）
│   └── app_config.example.json   运营配置示例
├── data/                数据抓取、计算、上传脚本（见 data/README.md）
└── project.config.json  微信开发者工具的项目配置
```

数据流：`data` 脚本把统计局数据和人工录入数据算好后写进云数据库 → 小程序调用云函数 `api` 读取。**更新数据不需要发布小程序。**

## 本地预览（不需要微信环境）

H5 模式直接读取 `data/output/` 的数据，跑的是和云函数同一份 `core.mjs`，适合调页面。

```bash
cd data && npm install && npm run all     # 先生成数据（只需一次）
cd ../app && pnpm install
npm run dev:h5                            # 浏览器打开终端里的地址，用手机尺寸查看
```

## 首次上线

1. **注册小程序**：个人主体即可，服务类目选「工具 > 信息查询」。记下 AppID。
2. **开通云开发**：微信开发者工具 → 云开发 → 开通，记下环境 ID。
3. **填配置**：

   - `app/src/config.ts` 的 `CLOUD_ENV` 填环境 ID。
   - `app/src/manifest.json` 的 `mp-weixin.appid` 和根目录 `project.config.json` 的 `appid` 填 AppID。
4. **编译小程序**：

   ```bash
   cd app && npm run build:mp-weixin    # 开发时用 npm run dev:mp-weixin 实时编译
   ```
5. **用微信开发者工具导入 `gdp-rank` 根目录**（不是 `app/dist`），这样云函数目录才能被识别。
6. **部署云函数**：在开发者工具里右键 `cloudfunctions/api` →「上传并部署：云端安装依赖」。
7. **建数据库集合**：云开发控制台 → 数据库，新建以下集合，权限都设为「仅管理端可读写」（小程序只通过云函数访问）：

   | 集合                | 说明                                | 需要建的索引                                                   |
   | ------------------- | ----------------------------------- | -------------------------------------------------------------- |
   | `regions`         | 地区字典                            | —                                                             |
   | `periods`         | 期次发布状态                        | —                                                             |
   | `gdp_records`     | 原始数据                            | —                                                             |
   | `gdp_stats`       | 计算后的数据                        | `level + year + period` 组合索引；`region_code` 单字段索引 |
   | `city_population` | 七普全市常住人口（与 GDP 数据分开） | `year` 单字段索引                                            |
   | `user_data`       | 用户收藏、对比篮等                  | —                                                             |
   | `app_config`      | 运营配置                            | —                                                             |
8. **导入运营配置**：在 `app_config` 集合里新增一条文档，内容参考 `cloudfunctions/app_config.example.json`（`_id` 必须是 `main`）。
9. **上传数据**：按 `data/README.md` 配置密钥后执行 `npm run upload`，或在控制台手动导入 `data/output/jsonl/` 下的文件。人口榜按 2020 年七普口径整理至 `data/manual/city_population_2020.csv`，再运行 `npm run build:population`；当前为第三方汇编数据，页面会展示来源和未收录城市。
10. **隐私保护指引**：在公众平台「设置 → 服务内容声明 → 用户隐私保护指引」中声明：剪贴板（复制数据）、相册（保存海报，V1.1）。
11. 开发者工具里预览、真机调试没问题后，上传代码提交审核。

## 日常运营

| 要做的事                           | 怎么做                                                             | 需要发版吗 |
| ---------------------------------- | ------------------------------------------------------------------ | ---------- |
| 更新 GDP 数据                      | `data` 目录下 fetch → 录入 → build → validate → upload       | 不需要     |
| 开关广告、填广告位 ID              | 改`app_config` 的 `ad_enabled`、`ad_slots`                   | 不需要     |
| 改热门搜索、热门对比、下次发布时间 | 改`app_config`                                                   | 不需要     |
| 行政区划调整                       | 改`data` 后重新生成 regions 并上传，小程序启动时自动更新本地缓存 | 不需要     |
| 改页面、改功能                     | 改`app` 代码，编译后上传审核                                     | 需要       |

### 后续 GDP 数据怎么更新

新一期 GDP 发布后，按“采集/补录 → 构建校验 → 上传数据库”的顺序更新。数据写入云数据库后，小程序下次打开或刷新即可读取，**不需要重新编译或发布小程序**。

#### 一次性准备

需要 Node.js 22 或以上版本。首次使用时：

```bash
cd data
pnpm install
cp .env.example .env
```

编辑 `data/.env`，填写微信云开发环境 ID 和腾讯云 API 密钥：

```dotenv
TCB_ENV=你的云开发环境ID
TENCENTCLOUD_SECRETID=你的SecretId
TENCENTCLOUD_SECRETKEY=你的SecretKey
```

密钥只保存在本地 `data/.env`，不要贴到聊天、提交到 Git 或放进小程序代码。环境 ID 必须与小程序 `app/src/config.ts` 中的 `CLOUD_ENV`、以及 `api` 云函数所在环境一致。

#### 每次有新数据时

```bash
cd data
# 1. 把官方发布但自动接口没有采到的数据补进 manual/gdp_manual.csv
# 2. 重新抓取、构建并校验
npm run all
# 3. 查看各期城市数据覆盖情况，重点检查本次更新期次
npm run audit
# 4. 先预览预计写入量，再正式增量上传
npm run upload:dry
npm run upload
```

`npm run all` 会依次更新地区字典、抓取统计局数据、合并数据并运行校验；它**不会上传数据库**，上传需要单独执行 `npm run upload`。人工数据文件是 `data/manual/gdp_manual.csv`，请在现有 CSV 末尾追加记录并保留原表头；城市季度、城市年度数据以及接口缺失或需要修正的数据通常在这里维护。每条人工记录要带可靠的官方来源链接。

季度期次使用累计口径：`Q1` 一季度、`H1` 上半年、`Q3` 前三季度、`FY` 全年。总量（亿元）和官方公布的实际增速按来源录入；增长量和名义增速由构建脚本根据上年同期数据计算，实际增速不要自行推算。新发布一期时追加新期次记录；官方修订旧数据时再更新对应旧记录。这样可以逐步补齐并维护历年数据，而不只更新最新一期。

上传后可在云开发控制台检查 `gdp_stats` 和 `periods` 集合，再在小程序中刷新验证。上传脚本按文档 ID 增量写入，失败后重跑 `npm run upload` 会继续尝试未成功的记录；换环境或确实要全量重写时才使用 `npm run upload -- --force`。城市来源、CSV 字段、校验规则和覆盖审计说明见 [`data/README.md`](data/README.md)。

## 前端说明

- 页面在 `app/src/pages/`，与原型编号对应：`home` P01、`ranking` P02、`region` P03/P04、`compare` P05、`search` P06、`mine` P07/P08。
- 设计变量集中在 `app/src/uni.scss`，设计稿定稿后改这里即可统一换肤。TabBar 图标是脚本生成的占位图（`app/tools/gen-tabbar-icons.mjs`），拿到设计切图后直接替换 `app/src/static/tabbar/`。
- 图表用 SVG 生成图片（`app/src/utils/chart.ts`），不依赖图表库，主包很小。
- 广告组件 `AdSlot` 只有在 `app_config` 打开且填了广告位 ID 时才渲染，加载失败自动隐藏。插屏、激励视频的规则在 `app/src/utils/ads.ts`。
- 分享卡片用离屏 canvas 动态生成（`app/src/utils/share.ts`），生成失败时微信会用页面截图兜底。
