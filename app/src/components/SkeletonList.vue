<!-- 加载骨架屏 -->
<template>
  <view class="sk">
    <view v-for="i in rows" :key="i" class="row">
      <view class="b r" />
      <view class="mid">
        <view class="b l1" />
        <view class="b l2" />
      </view>
      <view class="b v" />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 6 });
</script>

<style lang="scss" scoped>
.row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
}
.b {
  background: #eceef1;
  border-radius: 8rpx;
  animation: pulse 1.2s ease-in-out infinite;
}
.r {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  margin: 0 14rpx;
}
.mid {
  flex: 1;
  margin-left: 16rpx;
}
.l1 {
  width: 160rpx;
  height: 30rpx;
}
.l2 {
  width: 100rpx;
  height: 22rpx;
  margin-top: 12rpx;
}
.v {
  width: 180rpx;
  height: 32rpx;
}
@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
</style>
