import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  // 忽略目录
  {
    ignores: [
      "**/node_modules",
      "**/dist",
      "**/unpackage",
      "data/output/**",
      "data/raw/**",
      "data/manual/**",
    ],
  },
  // 推荐规则
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Vue 3 推荐规则（须放在 TypeScript 之后）
  ...pluginVue.configs["flat/recommended"],

  // app：uni-app 小程序，TypeScript 已做 undefined 检查，关闭 no-undef
  {
    files: ["app/**/*.{js,ts,vue}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        uni: "readonly",
        wx: "readonly",
        getApp: "readonly",
        getCurrentPages: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
  // Vue 文件使用 TypeScript 解析
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
  },
  // data / cloudfunctions / app/tools：Node 脚本
  {
    files: ["data/**/*.{js,mjs}", "cloudfunctions/**/*.{js,mjs}", "app/tools/**/*.{js,mjs}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // 云函数入口按微信云开发惯例使用 CommonJS
  {
    files: ["cloudfunctions/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // 项目级规则
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/attributes-order": "warn",
      "vue/attribute-hyphenation": "warn",
      "vue/first-attribute-linebreak": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // 类型声明文件放宽规则
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  // 关闭与 Prettier 冲突的格式类规则（放最后）
  eslintConfigPrettier
);
