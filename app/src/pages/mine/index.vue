<!-- P07 我的：不做登录，没有头像昵称 -->
<template>
  <view class="page">
    <view v-if="nextRelease" class="card release">
      <text class="release-label">下一次数据发布</text>
      <text class="release-text">{{ nextRelease }}</text>
    </view>

    <view class="card list">
      <view class="item" @tap="go('/pages/mine/favorites')">
        <text>我的收藏</text>
        <text class="extra">{{ userState.favorites.length || "" }} ›</text>
      </view>
      <view class="item" @tap="historyShow = !historyShow">
        <text>最近查看</text>
        <text class="extra">{{ historyShow ? "收起" : "›" }}</text>
      </view>
      <view v-if="historyShow" class="history">
        <text v-for="r in history" :key="r.code" class="chip" @tap="goRegion(r.code)">{{
          r.short_name
        }}</text>
        <text v-if="!history.length" class="muted small">还没有查看过地区</text>
      </view>
    </view>

    <view class="card list">
      <view class="item" @tap="go('/pages/mine/data-notes')">
        <text>数据说明</text>
        <text class="extra">›</text>
      </view>
      <button class="item reset" open-type="feedback">
        <text>意见反馈</text>
        <text class="extra">›</text>
      </button>
      <button class="item reset" open-type="contact">
        <text>联系我们</text>
        <text class="extra">›</text>
      </button>
      <button class="item reset" open-type="share">
        <text>分享给朋友</text>
        <text class="extra">›</text>
      </button>
    </view>

    <view class="about">
      <text>{{ APP_NAME }} v{{ version }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShareAppMessage, onShow } from "@dcloudio/uni-app";
import { APP_NAME } from "@/config";
import { appState, boot, getRegion } from "@/store/app";
import { loadUser, syncCompareBadge, userState } from "@/store/user";
import { goRegion } from "@/utils/misc";
import type { Region } from "@/types";

const version = "1.0.0";
const historyShow = ref(false);
const nextRelease = computed(() => appState.config.next_release_text ?? "");
const history = computed(() =>
  userState.history.map((c) => getRegion(c)).filter((r): r is Region => !!r)
);

onShow(() => {
  syncCompareBadge();
  boot().catch(() => undefined);
  loadUser();
});

const go = (url: string) => uni.navigateTo({ url });
onShareAppMessage(() => ({
  title: "全国各省、各城市 GDP 排名，一查就有",
  path: "/pages/home/index",
}));
</script>

<style lang="scss" scoped>
.release {
  display: flex;
  flex-direction: column;
  background: $color-primary-light;
}
.release-label {
  font-size: 24rpx;
  color: $color-primary;
}
.release-text {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.list {
  padding-top: 0;
  padding-bottom: 0;
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 104rpx;
  font-size: 30rpx;
  border-bottom: 1rpx solid $color-border;
  &:last-child {
    border-bottom: none;
  }
  .extra {
    color: $color-text-3;
    font-size: 26rpx;
  }
}
button.item {
  width: 100%;
}
.history {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 0 4rpx;
}
.chip {
  margin: 0 16rpx 16rpx 0;
  padding: 10rpx 22rpx;
  border-radius: 24rpx;
  background: $color-bg;
  font-size: 24rpx;
}
.small {
  font-size: 24rpx;
}
.about {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 48rpx;
  font-size: 22rpx;
  line-height: 1.8;
  color: $color-text-3;
}
</style>
