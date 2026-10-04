<template>
  <view class="seg" :class="size">
    <view
      v-for="opt in options"
      :key="opt.value"
      class="item"
      :class="{ active: opt.value === modelValue }"
      @tap="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  options: { label: string; value: string }[];
  size?: "small" | "normal";
}>();
const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();
</script>

<style lang="scss" scoped>
.seg {
  display: flex;
  padding: 6rpx;
  border-radius: 16rpx;
  background: $color-bg;
}
.item {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $color-text-2;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
  &:active {
    transform: scale(0.98);
  }
  &.active {
    background: #fff;
    color: $color-primary;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }
}
@media (prefers-reduced-motion: reduce) {
  .item {
    transition: none;
    transform: none;
  }
}
.small .item {
  height: 52rpx;
  line-height: 52rpx;
  font-size: 24rpx;
}
</style>
