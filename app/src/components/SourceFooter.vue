<!-- 页面底部数据来源（原型 5.5） -->
<template>
  <view class="footer" @tap="goNotes">
    <text>{{ text || DATA_SOURCE_TEXT }}</text>
    <text class="link"> · 数据说明 ›</text>
  </view>
</template>

<script setup lang="ts">
import { DATA_SOURCE_TEXT } from "@/config";

defineProps<{ text?: string }>();
const goNotes = () => uni.navigateTo({ url: "/pages/mine/data-notes" });
</script>

<style lang="scss" scoped>
.footer {
  padding: 24rpx 16rpx 8rpx;
  text-align: center;
  font-size: 22rpx;
  line-height: 1.6;
  color: $color-text-3;
}
.link {
  color: $color-primary;
}
</style>
