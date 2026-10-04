import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// H5 本地预览时直接读取 ../data/output 和 ../cloudfunctions/api/core.mjs（见 src/api/mock.ts）。
// 小程序构建通过条件编译剔除这些引用，不会打进包里。
export default defineConfig({
  plugins: [uni()],
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
