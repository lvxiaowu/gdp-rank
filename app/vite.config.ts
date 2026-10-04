import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// 本地预览读取 ../data/output 和 ../cloudfunctions/api/core.mjs（见 src/api/mock.ts）。
// 配置了 CLOUD_ENV 后线上走云函数；未配置时微信包会带上这份本地数据。
export default defineConfig({
  plugins: [uni()],
  build: {
    rollupOptions: {
      output: {},
    },
  },
  resolve: {
    alias: {
      "@data": fileURLToPath(new URL("../data/output", import.meta.url)),
      "@core": fileURLToPath(new URL("../cloudfunctions/api/core.mjs", import.meta.url)),
    },
  },
  server: {
    fs: { allow: [".."] },
  },
});
