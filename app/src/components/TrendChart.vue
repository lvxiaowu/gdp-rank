<!-- 详情页趋势图：柱 = GDP 总量，线 = 实际增速；年度 / 季度切换；点击某一期显示数值 -->
<template>
  <view class="chart">
    <view class="top">
      <Segmented v-model="mode" :options="modeOptions" size="small" class="seg" />
      <view class="legend">
        <view class="lg bar" /><text>总量</text> <view class="lg line" /><text>实际增速</text>
      </view>
    </view>

    <view v-if="points.length" class="canvas">
      <image class="img" :src="chart.src" />
      <view class="hit">
        <view v-for="(p, i) in points" :key="i" class="col" @tap="active = i" />
      </view>
      <view v-if="current" class="tip" :style="tipStyle">
        <text class="tip-title">{{ periodLabel(current.year, current.period) }}</text>
        <text class="num">{{ fmtGdp(current.gdp) }}</text>
        <text class="num" :class="trendClass(current.real_growth)"
          >实际 {{ fmtPct(current.real_growth) }}</text
        >
      </view>
    </view>
    <view v-else class="empty">暂无数据</view>

    <view class="axis">
      <text v-for="(p, i) in points" :key="i" class="tick" :class="{ on: i === active }">
        {{ periodShort(p.year, p.period, mode === "quarter") }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Segmented from "./Segmented.vue";
import { barLineChart } from "@/utils/chart";
import { fmtGdp, fmtPct, periodLabel, periodShort, trendClass } from "@/utils/format";
import type { Stat } from "@/types";

const props = defineProps<{ history: Stat[] }>();
const MAX_POINTS = 8;
const ORDER = { Q1: 1, H1: 2, Q3: 3, FY: 4 };

const mode = ref("year");
const modeOptions = [
  { label: "年度", value: "year" },
  { label: "季度", value: "quarter" },
];

const points = computed(() => {
  const list = props.history
    .filter((s) => (mode.value === "year" ? s.period === "FY" : true))
    .sort((a, b) => a.year - b.year || ORDER[a.period] - ORDER[b.period]);
  return list.slice(-MAX_POINTS);
});
const active = ref(-1);
watch(points, (v) => (active.value = v.length - 1), { immediate: true });

const chart = computed(() =>
  barLineChart(
    points.value.map((p) => p.gdp),
    points.value.map((p) => p.real_growth),
    active.value
  )
);
const current = computed(() => points.value[active.value]);
// 浮层跟随选中的柱子，靠右时向左展开
const tipStyle = computed(() => {
  const n = points.value.length || 1;
  const center = ((active.value + 0.5) / n) * 100;
  return center > 60 ? { right: `${100 - center + 4}%` } : { left: `${center + 4}%` };
});
</script>

<style lang="scss" scoped>
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.seg {
  width: 240rpx;
}
.legend {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: $color-text-2;
  .lg {
    margin: 0 8rpx 0 20rpx;
  }
  .bar {
    width: 18rpx;
    height: 18rpx;
    border-radius: 4rpx;
    background: $color-primary;
  }
  .line {
    width: 24rpx;
    height: 4rpx;
    background: #ff8800;
  }
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
.tip {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(31, 35, 41, 0.88);
  color: #fff;
  font-size: 22rpx;
  pointer-events: none;
  .tip-title {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 4rpx;
  }
  .up {
    color: #ff8a85;
  }
  .down {
    color: #5ee08a;
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
.empty {
  height: 200rpx;
  line-height: 200rpx;
  text-align: center;
  color: $color-text-3;
}
</style>
