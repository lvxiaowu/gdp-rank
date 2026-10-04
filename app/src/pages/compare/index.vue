<!-- P05 对比 -->
<template>
  <view class="page">
    <!-- 空状态 -->
    <template v-if="!codes.length">
      <EmptyState
        title="添加 2~4 个地区开始对比"
        desc="可以对比省份与省份、城市与城市"
        action-text="添加地区"
        @action="pickerShow = true"
      />
      <view class="card">
        <view class="card-title"><text>热门对比</text></view>
        <view class="hots">
          <view v-for="(pair, i) in hotCompare" :key="i" class="hot" @tap="useHot(pair)">{{
            hotLabel(pair)
          }}</view>
        </view>
      </view>
    </template>

    <template v-else>
      <!-- ① 对比篮 -->
      <view class="basket">
        <view v-for="(c, i) in codes" :key="c" class="chip">
          <view class="dot" :style="{ background: SERIES_COLORS[i] }" />
          <text @tap="goRegion(c)">{{ getRegion(c)?.short_name ?? c }}</text>
          <text class="x" @tap="remove(c)">×</text>
        </view>
        <view v-if="codes.length < MAX_COMPARE" class="chip add" @tap="pickerShow = true"
          >+ 添加</view
        >
      </view>

      <view v-if="codes.length === 1" class="card hint">再添加 1 个地区即可对比</view>

      <template v-else>
        <!-- ② 指标 ③ 周期 -->
        <scroll-view scroll-x class="metrics">
          <view
            v-for="(label, key) in SORT_LABEL"
            :key="key"
            class="metric"
            :class="{ active: metric === key }"
            @tap="metric = key"
          >
            {{ label }}
          </view>
        </scroll-view>
        <view class="period-row">
          <picker
            :range="periodOptions"
            range-key="label"
            :value="periodIndex"
            @change="onPeriodChange"
          >
            <view class="period-trigger">{{ periodOptions[periodIndex].label }} ▾</view>
          </picker>
          <text class="muted small">季度为累计值，按年对比同一期</text>
        </view>

        <view v-if="result?.mixedLevel" class="notice">省与城市层级不同，对比仅供参考</view>

        <EmptyState
          v-if="error"
          type="error"
          title="加载失败"
          :desc="error"
          action-text="重新加载"
          @action="load"
        />
        <view v-else-if="!result" class="card"><SkeletonList :rows="4" /></view>

        <template v-else>
          <!-- ④ 结论 -->
          <view v-if="result.conclusion" class="card conclusion">{{ result.conclusion }}</view>

          <!-- ⑤ 折线图 -->
          <view class="card">
            <CompareChart
              :years="result.years"
              :series="result.series"
              :values="values"
              :metric="metric"
            />
          </view>

          <!-- ⑥ 对比表 -->
          <view class="card">
            <view class="card-title">
              <text>{{ SORT_LABEL[metric] }}</text>
              <text class="more" @tap="copy">复制表格</text>
            </view>
            <scroll-view scroll-x>
              <view class="c-table">
                <view class="c-row head">
                  <text class="cell year">年份</text>
                  <text
                    v-for="(s, i) in result.series"
                    :key="s.code"
                    class="cell"
                    :style="{ color: SERIES_COLORS[i] }"
                    >{{ s.short_name }}</text
                  >
                  <template v-if="result.series.length === 2">
                    <text class="cell">差值</text>
                    <text class="cell">比值</text>
                  </template>
                </view>
                <view v-for="y in yearsDesc" :key="y" class="c-row">
                  <text class="cell year">{{ y }}</text>
                  <text v-for="(s, si) in result.series" :key="s.code" class="cell num">{{
                    fmtSortValue(metric, valueAt(si, y))
                  }}</text>
                  <template v-if="result.series.length === 2">
                    <text class="cell num">{{ diffText(y) }}</text>
                    <text class="cell num">{{ ratioText(y) }}</text>
                  </template>
                </view>
              </view>
            </scroll-view>
          </view>

          <!-- ⑦ 操作 -->
          <view class="actions">
            <button class="btn primary share-btn" open-type="share">分享对比</button>
            <view class="btn plain" @tap="copy">复制表格</view>
          </view>

          <!-- ⑧ AD-05 -->
          <AdSlot slot-id="AD-05" type="banner" />
          <SourceFooter />
        </template>
      </template>
    </template>

    <RegionPicker :show="pickerShow" @close="pickerShow = false" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import AdSlot from "@/components/AdSlot.vue";
import CompareChart from "@/components/CompareChart.vue";
import EmptyState from "@/components/EmptyState.vue";
import RegionPicker from "@/components/RegionPicker.vue";
import SkeletonList from "@/components/SkeletonList.vue";
import SourceFooter from "@/components/SourceFooter.vue";
import { api } from "@/api";
import { appState, boot, getRegion } from "@/store/app";
import {
  loadUser,
  MAX_COMPARE,
  setCompare,
  syncCompareBadge,
  toggleCompare,
  userState,
} from "@/store/user";
import { SERIES_COLORS } from "@/utils/chart";
import { fmtInt, fmtSortValue, PERIOD_LABEL, SORT_LABEL } from "@/utils/format";
import { copyTable, goRegion } from "@/utils/misc";
import { shareMessage } from "@/utils/share";
import type { CompareResult, PeriodKey, SortKey } from "@/types";

const pickerShow = ref(false);
const metric = ref<SortKey>("gdp");
const period = ref<PeriodKey>("FY");
const periodOptions = (["FY", "Q1", "H1", "Q3"] as PeriodKey[]).map((p) => ({
  value: p,
  label: p === "FY" ? "年度" : PERIOD_LABEL[p],
}));
const periodIndex = computed(() => periodOptions.findIndex((o) => o.value === period.value));
const result = ref<CompareResult | null>(null);
const error = ref("");

const codes = computed(() => userState.compare);
const hotCompare = computed(() => appState.config.hot_compare ?? []);
const hotLabel = (pair: string[]) => pair.map((c) => getRegion(c)?.short_name ?? c).join(" vs ");

let seq = 0;
async function load() {
  if (codes.value.length < 2) {
    result.value = null;
    return;
  }
  const my = ++seq;
  error.value = "";
  try {
    await boot();
    const res = await api.compare([...codes.value], period.value);
    if (my === seq) result.value = res;
  } catch (err) {
    if (my === seq) error.value = (err as Error).message;
  }
}

onShow(async () => {
  syncCompareBadge();
  await boot().catch(() => undefined);
  await loadUser();
});
watch([() => codes.value.join(), period], load, { immediate: true });

const onPeriodChange = (e: { detail: { value: number } }) =>
  (period.value = periodOptions[e.detail.value].value);
const remove = (code: string) => toggleCompare(code).catch(() => undefined);
const useHot = (pair: string[]) => setCompare(pair).catch(() => undefined);

const values = computed(() => {
  const r = result.value;
  if (!r) return [];
  return r.series.map((s) =>
    r.years.map(
      (y) => (s.points.find((p) => p.year === y)?.[metric.value] as number | null) ?? null
    )
  );
});
const yearsDesc = computed(() => [...(result.value?.years ?? [])].reverse());
function valueAt(si: number, year: number) {
  const r = result.value!;
  return values.value[si][r.years.indexOf(year)] ?? null;
}
function diffText(year: number) {
  const a = valueAt(0, year);
  const b = valueAt(1, year);
  if (a == null || b == null) return "—";
  const d = a - b;
  if (metric.value === "gdp" || metric.value === "increment")
    return `${d > 0 ? "+" : ""}${fmtInt(d)}`;
  return `${d > 0 ? "+" : ""}${d.toFixed(1)}pt`;
}
function ratioText(year: number) {
  const a = valueAt(0, year);
  const b = valueAt(1, year);
  if (a == null || !b || metric.value !== "gdp") return "—";
  return `${((a / b) * 100).toFixed(1)}%`;
}

function copy() {
  const r = result.value;
  if (!r) return;
  copyTable([
    [
      `${r.series.map((s) => s.short_name).join(" vs ")} ${SORT_LABEL[metric.value]}（${periodOptions[periodIndex.value].label}）`,
    ],
    ["年份", ...r.series.map((s) => s.short_name)],
    ...yearsDesc.value.map((y) => [y, ...r.series.map((_, si) => valueAt(si, y) ?? "")]),
  ]);
}

const shareTitle = () => {
  const names = (result.value?.series ?? []).map((s) => s.short_name);
  return names.length >= 2 ? `${names.join(" vs ")}，谁的 GDP 更高？` : "地区 GDP 对比";
};
onShareAppMessage(() => {
  const r = result.value;
  const path = `/pages/compare/index`;
  if (!r) return shareMessage(shareTitle(), path);
  const latestYear = r.years[r.years.length - 1];
  return shareMessage(shareTitle(), path, {
    kind: "compare",
    title: `${latestYear}年${period.value === "FY" ? "" : PERIOD_LABEL[period.value]} GDP 对比`,
    bars: r.series.map((s) => ({
      name: s.short_name,
      gdp: s.points.find((p) => p.year === latestYear)?.gdp ?? 0,
    })),
    conclusion: r.conclusion,
  });
});
onShareTimeline(() => ({ title: shareTitle() }));
</script>

<style lang="scss" scoped>
.hots {
  display: flex;
  flex-wrap: wrap;
  margin: -8rpx;
}
.hot {
  margin: 8rpx;
  padding: 16rpx 24rpx;
  border-radius: 32rpx;
  background: $color-bg;
  font-size: 26rpx;
}
.basket {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}
.chip {
  display: flex;
  align-items: center;
  height: 64rpx;
  padding: 0 20rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 32rpx;
  background: #fff;
  font-size: 28rpx;
  .dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 10rpx;
  }
  .x {
    margin-left: 12rpx;
    color: $color-text-3;
    font-size: 32rpx;
  }
  &.add {
    color: $color-primary;
    border: 1rpx dashed $color-primary;
    background: transparent;
  }
}
.hint {
  text-align: center;
  color: $color-text-2;
}
.metrics {
  white-space: nowrap;
  margin-bottom: 16rpx;
}
.metric {
  display: inline-block;
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 24rpx;
  margin-right: 12rpx;
  border-radius: 28rpx;
  background: #fff;
  font-size: 26rpx;
  color: $color-text-2;
  &.active {
    background: $color-primary;
    color: #fff;
  }
}
.period-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.period-trigger {
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 24rpx;
  margin-right: 16rpx;
  border-radius: 28rpx;
  background: #fff;
  border: 1rpx solid $color-border;
  font-size: 26rpx;
}
.small {
  font-size: 22rpx;
}
.conclusion {
  background: $color-primary-light;
  color: $color-text;
  font-size: 28rpx;
  line-height: 1.6;
}
.c-table {
  display: inline-block;
  min-width: 100%;
}
.c-row {
  display: flex;
  align-items: center;
  height: 72rpx;
  border-bottom: 1rpx solid $color-border;
  &.head .cell {
    font-weight: 600;
  }
}
.cell {
  width: 170rpx;
  flex-shrink: 0;
  text-align: right;
  font-size: 24rpx;
  &.year {
    width: 100rpx;
    text-align: left;
    color: $color-text-2;
  }
}
.actions {
  display: flex;
  margin-bottom: 24rpx;
  .btn {
    flex: 1;
  }
  .btn + .btn {
    margin-left: 20rpx;
  }
}
.share-btn {
  margin: 0;
  font-size: 28rpx;
  line-height: 80rpx;
}
</style>
