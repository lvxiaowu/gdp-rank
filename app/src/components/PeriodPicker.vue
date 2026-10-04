<!-- 期次选择器（原型 P02-A）：触发按钮 + 底部弹层，年度 / 季度两种模式 -->
<template>
  <view class="picker">
    <view class="trigger" :class="{ small }" @tap="open">
      <text>{{ year }}年 {{ PERIOD_LABEL[period] }}</text>
      <text class="arrow">▾</text>
    </view>

    <BottomSheet :show="visible" title="选择期次" @close="visible = false">
      <template #top>
        <view class="mode">
          <Segmented v-model="mode" :options="modeOptions" />
        </view>
      </template>

      <view v-if="mode === 'year'" class="grid">
        <view
          v-for="y in years"
          :key="y"
          class="cell"
          :class="cellClass(y, 'FY')"
          @tap="pick(y, 'FY')"
        >
          <text>{{ y }}</text>
          <text v-if="statusText(y, 'FY')" class="badge">{{ statusText(y, "FY") }}</text>
        </view>
      </view>

      <view v-else class="quarter">
        <scroll-view scroll-y class="years">
          <view
            v-for="y in years"
            :key="y"
            class="year"
            :class="{ active: y === draftYear }"
            @tap="draftYear = y"
          >
            {{ y }}
          </view>
        </scroll-view>
        <view class="periods">
          <view
            v-for="p in PERIOD_KEYS"
            :key="p"
            class="period"
            :class="cellClass(draftYear, p)"
            @tap="pick(draftYear, p)"
          >
            <text>{{ PERIOD_LABEL[p] }}</text>
            <text v-if="statusText(draftYear, p)" class="badge">{{
              statusText(draftYear, p)
            }}</text>
            <text v-if="draftYear === year && p === period" class="check">✓</text>
          </view>
          <view class="hint">季度数据均为累计值，如「上半年」为 1~6 月合计</view>
        </view>
      </view>
      <view class="foot-hint">{{
        level === "province" ? "省级数据从 2015 年开始" : "城市数据从 2018 年开始"
      }}</view>
    </BottomSheet>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BottomSheet from "./BottomSheet.vue";
import Segmented from "./Segmented.vue";
import { appState, findPeriod } from "@/store/app";
import { PERIOD_KEYS, PERIOD_LABEL } from "@/utils/format";
import type { Level, PeriodKey } from "@/types";

const props = withDefaults(
  defineProps<{ level: Level; year: number; period: PeriodKey; small?: boolean }>(),
  { small: false }
);
const emit = defineEmits<{ (e: "change", v: { year: number; period: PeriodKey }): void }>();

const visible = ref(false);
const mode = ref<"year" | "quarter">("year");
const modeOptions = [
  { label: "年度", value: "year" },
  { label: "季度", value: "quarter" },
];
const draftYear = ref(props.year);

const startYear = computed(() => (props.level === "province" ? 2015 : 2018));
const years = computed(() => {
  const max = Math.max(new Date().getFullYear(), ...appState.periods.map((p) => p.year));
  const list: number[] = [];
  for (let y = max; y >= startYear.value; y--) list.push(y);
  return list;
});

function countOf(year: number, period: PeriodKey) {
  const doc = findPeriod(year, period);
  if (!doc) return { count: 0, total: 0 };
  return props.level === "province"
    ? { count: doc.province_count, total: doc.province_total }
    : { count: doc.city_count, total: doc.city_total };
}
const available = (y: number, p: PeriodKey) => countOf(y, p).count > 0;

function statusText(y: number, p: PeriodKey) {
  const { count, total } = countOf(y, p);
  if (!count) return "未发布";
  // 城市数据普遍不全，只对省级标「部分」
  if (props.level === "province" && count < total) return "部分";
  return "";
}

function cellClass(y: number, p: PeriodKey) {
  return { active: y === props.year && p === props.period, disabled: !available(y, p) };
}

function open() {
  mode.value = props.period === "FY" ? "year" : "quarter";
  draftYear.value = props.year;
  visible.value = true;
}

function pick(year: number, period: PeriodKey) {
  if (!available(year, period)) return;
  visible.value = false;
  if (year !== props.year || period !== props.period) emit("change", { year, period });
}
</script>

<style lang="scss" scoped>
.picker {
  display: inline-block;
}
.trigger {
  display: inline-flex;
  align-items: center;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: #fff;
  border: 1rpx solid $color-border;
  font-size: 26rpx;
  font-weight: 500;
  &.small {
    height: 52rpx;
    font-size: 24rpx;
  }
  .arrow {
    margin-left: 8rpx;
    color: $color-text-3;
  }
}
.mode {
  padding: 0 32rpx 24rpx;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 24rpx;
}
.cell {
  position: relative;
  width: calc(25% - 16rpx);
  margin: 8rpx;
  height: 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: $color-bg;
  font-size: 28rpx;
}
.quarter {
  display: flex;
  height: 520rpx;
}
.years {
  width: 200rpx;
  height: 100%;
  background: $color-bg;
}
.year {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  color: $color-text-2;
  &.active {
    background: #fff;
    color: $color-primary;
    font-weight: 600;
  }
}
.periods {
  flex: 1;
  padding: 0 32rpx;
}
.period {
  display: flex;
  align-items: center;
  height: 96rpx;
  border-bottom: 1rpx solid $color-border;
  font-size: 30rpx;
  .check {
    margin-left: auto;
    color: $color-primary;
  }
}
.cell,
.period {
  &.active {
    color: $color-primary;
    font-weight: 600;
  }
  &.disabled {
    color: $color-text-3;
  }
}
.cell.active {
  background: $color-primary-light;
}
.badge {
  margin-left: 12rpx;
  font-size: 20rpx;
  color: $color-text-3;
  font-weight: 400;
}
.cell .badge {
  margin-left: 0;
}
.hint,
.foot-hint {
  font-size: 22rpx;
  color: $color-text-3;
}
.hint {
  margin-top: 24rpx;
}
.foot-hint {
  padding: 24rpx 32rpx 32rpx;
}
</style>
