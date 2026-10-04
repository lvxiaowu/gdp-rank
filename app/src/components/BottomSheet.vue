<template>
  <view v-if="mounted" class="sheet">
    <view class="mask" :class="{ show: entered }" @tap="close" @touchmove.stop.prevent />
    <view class="panel" :class="{ show: entered }" :style="{ height }">
      <view class="head">
        <text class="title">{{ title }}</text>
        <view class="close" @tap="close">✕</view>
      </view>
      <slot name="top" />
      <scroll-view scroll-y class="body" :scroll-into-view="scrollIntoView">
        <slot />
      </scroll-view>
      <slot name="footer" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{ show: boolean; title?: string; height?: string; scrollIntoView?: string }>(),
  { title: "", height: "auto", scrollIntoView: "" }
);
const emit = defineEmits<{ (e: "close"): void }>();

// 先挂载再加动画类，关闭时等动画结束再卸载
const mounted = ref(false);
const entered = ref(false);
watch(
  () => props.show,
  (v) => {
    if (v) {
      mounted.value = true;
      setTimeout(() => (entered.value = true), 20);
    } else {
      entered.value = false;
      setTimeout(() => (mounted.value = false), 220);
    }
  },
  { immediate: true }
);

const close = () => emit("close");
</script>

<style lang="scss" scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 100;
}
.mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s;
  &.show {
    opacity: 1;
  }
}
.panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateY(100%);
  transition: transform 0.22s ease-out;
  &.show {
    transform: translateY(0);
  }
}
.head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 104rpx;
  flex-shrink: 0;
}
.title {
  font-size: 32rpx;
  font-weight: 600;
}
.close {
  position: absolute;
  right: 16rpx;
  top: 16rpx;
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  color: $color-text-3;
  font-size: 32rpx;
}
.body {
  flex: 1;
  min-height: 0;
}
</style>
