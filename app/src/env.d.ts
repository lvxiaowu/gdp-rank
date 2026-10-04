/// <reference types="vite/client" />

declare module "*.vue" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "@core" {
  export function handle(src: unknown, action: string, data?: unknown): Promise<unknown>;
}

// 微信小程序全局对象（云开发、广告、离屏 canvas 等 uni 未封装的能力）

declare const wx: any;
