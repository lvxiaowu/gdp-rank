<!-- 空状态 / 错误状态（原型 5.4）。插画先用几何占位，设计稿出来后替换 -->
<template>
  <view class="empty">
    <view class="art" :class="type">
      <view class="c1" />
      <view class="c2" />
    </view>
    <text class="title">{{ title }}</text>
    <text v-if="desc" class="desc">{{ desc }}</text>
    <view v-if="actionText" class="btn primary action" @tap="emit('action')">{{ actionText }}</view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    desc?: string;
    actionText?: string;
    type?: "empty" | "error" | "pending";
  }>(),
  { desc: "", actionText: "", type: "empty" }
);
const emit = defineEmits<{ (e: "action"): void }>();
</script>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 48rpx;
  text-align: center;
}
.art {
  position: relative;
  width: 200rpx;
  height: 160rpx;
  margin-bottom: 32rpx;
  .c1,
  .c2 {
    position: absolute;
    border-radius: 50%;
  }
  .c1 {
    width: 160rpx;
    height: 160rpx;
    left: 0;
    background: $color-primary-light;
  }
  .c2 {
    width: 96rpx;
    height: 96rpx;
    right: 0;
    bottom: 0;
    background: #c9d8ff;
  }
  &.error .c1 {
    background: #fdecec;
  }
  &.pending .c1 {
    background: $color-warning-bg;
  }
}
.title {
  font-size: 30rpx;
  font-weight: 600;
}
.desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $color-text-3;
  line-height: 1.5;
}
.action {
  margin-top: 40rpx;
  min-width: 240rpx;
}
</style>
