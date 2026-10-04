// 广告位（原型文档第七章）。所有广告受云端 app_config 控制：ad_enabled 总开关 + ad_slots 单个广告位。
// 流量主开通前保持关闭，页面不会留出任何空白。
import { appState } from "@/store/app";

const today = () => new Date().toISOString().slice(0, 10);

/** 广告位对应的 unit-id；关闭或未配置时返回空字符串 */
export function adUnit(slot: string): string {
  const { ad_enabled, ad_slots } = appState.config;
  if (!ad_enabled) return "";
  const s = ad_slots?.[slot];
  return s && s.enabled !== false ? s.unit_id : "";
}

const launchAt = Date.now();
let interstitialShown = false;

/** 记录首次打开日期，新用户首日不出插屏 */
export function markFirstOpen() {
  if (!uni.getStorageSync("first_open_date")) uni.setStorageSync("first_open_date", today());
}

/** AD-06 插屏：从详情页返回榜单时调用。每次打开最多 1 次，启动 60 秒内不出，新用户首日不出 */
export function maybeShowInterstitial() {
  // #ifdef MP-WEIXIN
  const unit = adUnit("AD-06");
  if (!unit || interstitialShown) return;
  if (Date.now() - launchAt < 60_000) return;
  if (uni.getStorageSync("first_open_date") === today()) return;
  interstitialShown = true;
  const ad = wx.createInterstitialAd({ adUnitId: unit });
  ad.show().catch(() => undefined);
  // #endif
}

/**
 * AD-07 激励视频：解锁某个功能（复制完整历史数据、生成海报）。
 * 每天第一次免费；广告未开启或加载失败时直接放行，不卡用户。
 * @returns 是否允许继续
 */
export function unlockFeature(feature: string): Promise<boolean> {
  const key = `free_${feature}`;
  if (uni.getStorageSync(key) !== today()) {
    uni.setStorageSync(key, today());
    return Promise.resolve(true);
  }
  const unit = adUnit("AD-07");
  if (!unit) return Promise.resolve(true);
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    const ad = wx.createRewardedVideoAd({ adUnitId: unit });
    const onClose = (res?: { isEnded?: boolean }) => {
      ad.offClose(onClose);
      if (!res?.isEnded) uni.showToast({ title: "完整观看后即可使用", icon: "none" });
      resolve(!!res?.isEnded);
    };
    ad.onClose(onClose);
    ad.show().catch(() =>
      ad
        .load()
        .then(() => ad.show())
        .catch(() => {
          ad.offClose(onClose);
          resolve(true);
        })
    );
  });
  // #endif
  return Promise.resolve(true);
}
