<!-- 榜单卡片行：名次、名次变化、地区、数值、加入对比 -->
<template>
  <view class="row" @tap="emit('open')">
    <view class="rank">
      <view v-if="rank && rank <= 3" class="medal" :class="`m${rank}`">{{ rank }}</view>
      <text v-else class="rank-num num">{{ rank ?? "—" }}</text>
      <text v-if="rankChange != null" class="change num" :class="trendClass(rankChange)">
        {{ fmtRankChange(rankChange) }}
      </text>
    </view>
    <view class="info">
      <text class="name">{{ name }}</text>
      <text class="sub">{{ sub }}</text>
    </view>
    <view class="value">
      <text class="main num" :class="mainClass">{{ main }}</text>
      <text class="minor num" :class="minorClass">{{ minor }}</text>
    </view>
    <view class="cmp" :class="{ added: compared }" @tap.stop="emit('compare')">
      {{ compared ? "✓" : "+" }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { fmtRankChange, trendClass } from "@/utils/format";

defineProps<{
  rank: number | null | undefined;
  rankChange?: number | null;
  name: string;
  sub: string;
  main: string;
  minor: string;
  mainClass?: string;
  minorClass?: string;
  compared: boolean;
}>();
const emit = defineEmits<{ (e: "open"): void; (e: "compare"): void }>();
</script>

<style lang="scss" scoped>
.row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid $color-border;
}
.rank {
  width: 72rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.medal {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  border-radius: 50%;
  text-align: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  &.m1 {
    background: $color-gold;
  }
  &.m2 {
    background: $color-silver;
  }
  &.m3 {
    background: $color-bronze;
  }
}
.rank-num {
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text-2;
}
.change {
  margin-top: 4rpx;
  font-size: 20rpx;
}
.info {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.name {
  font-size: 30rpx;
  font-weight: 600;
}
.sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $color-text-3;
}
.value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 20rpx;
}
.main {
  font-size: 30rpx;
  font-weight: 600;
}
.minor {
  margin-top: 6rpx;
  font-size: 22rpx;
}
.cmp {
  width: 56rpx;
  height: 56rpx;
  line-height: 54rpx;
  text-align: center;
  border-radius: 12rpx;
  background: $color-primary-light;
  color: $color-primary;
  font-size: 32rpx;
  flex-shrink: 0;
  &.added {
    background: $color-primary;
    color: #fff;
    font-size: 26rpx;
  }
}
</style>
