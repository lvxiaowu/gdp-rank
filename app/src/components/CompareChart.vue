<!-- 对比页多折线图：每个地区一条线，点击某年显示各地数值 -->
<template>
  <view class="chart">
    <view class="legend">
      <view v-for="(s, i) in series" :key="s.code" class="lg">
        <view class="dot" :style="{ background: SERIES_COLORS[i] }" />
        <text>{{ s.short_name }}</text>
      </view>
    </view>
    <view class="canvas">
      <image class="img" :src="chart.src" />
      <view class="hit">
        <view v-for="(y, i) in years" :key="y" class="col" @tap="active = i" />
      </view>
    </view>
    <view class="axis">
      <text v-for="(y, i) in years" :key="y" class="tick" :class="{ on: i === active }">{{
        y
      }}</text>
    </view>
    <view v-if="active >= 0" class="tip">
      <text class="tip-title">{{ years[active] }}</text>
      <view v-for="(s, i) in series" :key="s.code" class="tip-row">
        <view class="dot" :style="{ background: SERIES_COLORS[i] }" />
        <text class="tip-name">{{ s.short_name }}</text>
        <text class="num">{{ fmtSortValue(metric, values[i][active]) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { multiLineChart, SERIES_COLORS } from "@/utils/chart";
import { fmtSortValue } from "@/utils/format";
import type { SortKey } from "@/types";

const props = defineProps<{
  years: number[];
  series: { code: string; short_name: string }[];
  values: (number | null)[][];
  /** 小程序不支持函数类型的 props，传指标名在组件内格式化 */
  metric: SortKey;
}>();

const active = ref(-1);
watch(
  () => props.years,
  (v) => (active.value = v.length - 1),
  { immediate: true }
);
const chart = computed(() => multiLineChart(props.values, active.value));
</script>

<style lang="scss" scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: $color-text-2;
}
.lg {
  display: flex;
  align-items: center;
  margin-right: 28rpx;
}
.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}
.canvas {
  position: relative;
  width: 100%;
  height: 311rpx;
}
.img {
  width: 100%;
  height: 100%;
}
.hit {
  position: absolute;
  inset: 0;
  display: flex;
  .col {
    flex: 1;
  }
}
.axis {
  display: flex;
  margin-top: 8rpx;
}
.tick {
  flex: 1;
  text-align: center;
  font-size: 20rpx;
  color: $color-text-3;
  &.on {
    color: $color-text;
    font-weight: 600;
  }
}
.tip {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: $color-bg;
  font-size: 24rpx;
}
.tip-title {
  display: block;
  color: $color-text-3;
  margin-bottom: 8rpx;
}
.tip-row {
  display: flex;
  align-items: center;
  height: 44rpx;
}
.tip-name {
  flex: 1;
}
</style>
