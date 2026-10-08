<!-- P03 省份详情 / P04 城市详情（同一个页面，按层级显示不同模块） -->
<template>
  <view class="page">
    <EmptyState
      v-if="error"
      type="error"
      title="加载失败"
      :desc="error"
      action-text="重新加载"
      @action="load()"
    />
    <view v-else-if="!data" class="card"><SkeletonList :rows="6" /></view>

    <template v-else>
      <!-- ① 头部 -->
      <view class="header">
        <view class="title-row">
          <text class="title">{{ data.region.name }}</text>
          <view class="star" :class="{ on: favorite }" @tap="toggleFavorite(code)">
            <text>{{ favorite ? "★" : "☆" }}</text>
            <text class="star-text">{{ favorite ? "已收藏" : "收藏" }}</text>
          </view>
        </view>
        <view class="tags">
          <text v-if="data.parent" class="tag primary" @tap="goRegion(data.parent.code)"
            >{{ data.parent.name }} ›</text
          >
          <text v-if="cur && isCity" class="tag">全国第 {{ cur.rank_national }}</text>
          <text v-if="cur && isCity && cur.rank_province" class="tag"
            >省内第 {{ cur.rank_province }}</text
          >
          <text v-for="t in typeTags" :key="t" class="tag">{{ t }}</text>
        </view>
      </view>

      <!-- ② 期次 -->
      <view v-if="data.year && data.period" class="period-row">
        <PeriodPicker
          :level="data.region.level"
          :year="data.year"
          :period="data.period"
          small
          @change="(v) => load(v.year, v.period)"
        />
        <text v-if="cur?.source === 'manual'" class="source-hint">地方统计部门数据</text>
        <text v-else-if="cur?.source === 'city-yearbook'" class="source-hint"
          >城市统计年鉴数据</text
        >
        <text v-else-if="cur?.source === 'city-ranking'" class="source-hint">各地公布数据汇总</text>
      </view>
      <view v-else class="period-row muted small">暂无已收录数据</view>

      <!-- ③ 核心数据 -->
      <view class="card core">
        <template v-if="cur">
          <text class="core-label">{{ periodLabel(cur.year, cur.period) }} GDP</text>
          <view class="core-big">
            <text class="big num">{{ fmtGdpDecimal(cur.gdp) }}</text>
            <text class="unit">亿元</text>
          </view>
          <view class="metrics">
            <view v-for="m in metrics" :key="m.label" class="metric" @tap="m.tip && showTip(m.tip)">
              <text class="m-label">{{ m.label }}</text>
              <text class="m-value num" :class="m.cls">{{ m.value }}</text>
            </view>
          </view>
        </template>
        <view v-else class="core-pending">
          <text class="pending-title">{{
            data.year && data.period
              ? `${periodLabel(data.year, data.period)}数据暂无收录`
              : "暂无已收录数据"
          }}</text>
          <view v-if="data.history.length" class="btn plain" @tap="load()">查看最近一期</view>
          <view v-if="showsPopulation" class="metrics population-only">
            <view class="metric" @tap="showTip(populationTip)">
              <text class="m-label">{{ isCity ? "常住人口" : "已收录市人口合计" }}</text>
              <text class="m-value num">{{
                data.population ? populationText(data.population.population) : "暂无数据"
              }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ④ 操作 -->
      <view class="actions">
        <view class="btn" :class="compared ? 'plain' : 'primary'" @tap="toggleCompare(code)">
          {{ compared ? "已加入对比" : "加入对比" }}
        </view>
        <button class="btn plain share-btn" open-type="share">分享</button>
      </view>

      <!-- ⑤ 趋势 -->
      <view class="card">
        <view class="card-title"><text>历史走势</text></view>
        <TrendChart :history="data.history" />
      </view>

      <!-- ⑥ 历史数据 -->
      <view class="card">
        <view class="card-title">
          <text>历史数据</text>
          <text class="more" @tap="copyHistory">复制</text>
        </view>
        <scroll-view scroll-x>
          <view class="h-table">
            <view class="h-row head">
              <text class="c period">期次</text>
              <text class="c">总量(亿)</text>
              <text class="c">增长量</text>
              <text class="c">名义</text>
              <text class="c">实际</text>
              <text class="c">全国</text>
              <text v-if="isCity" class="c">省内</text>
            </view>
            <view v-for="s in shownHistory" :key="`${s.year}${s.period}`" class="h-row">
              <text class="c period">{{ s.year }}{{ PERIOD_LABEL[s.period] }}</text>
              <text class="c num">{{ fmtInt(s.gdp) }}</text>
              <text class="c num" :class="trendClass(s.increment)">{{
                fmtIncrement(s.increment).replace(" 亿", "")
              }}</text>
              <text class="c num" :class="trendClass(s.nominal_growth)">{{
                fmtPct(s.nominal_growth)
              }}</text>
              <text class="c num" :class="trendClass(s.real_growth)">{{
                fmtPct(s.real_growth)
              }}</text>
              <text class="c num">{{ s.rank_national }}</text>
              <text v-if="isCity" class="c num">{{ s.rank_province ?? "—" }}</text>
            </view>
          </view>
        </scroll-view>
        <view
          v-if="data.history.length > annualHistory.length || annualHistory.length > 5"
          class="expand"
          @tap="historyExpanded = !historyExpanded"
        >
          {{ historyExpanded ? "仅看每年一条" : `查看全部期次（${data.history.length}）` }}
        </view>
      </view>

      <!-- ⑦ 省内城市 / 直辖市城市排名 / 排名附近的城市 -->
      <view
        v-if="data.municipalityCity"
        class="card link-card"
        @tap="goRegion(data.municipalityCity.code, data.year, data.period)"
      >
        <text>在城市榜中排名第 {{ data.municipalityCity.rank_national ?? "—" }}</text>
        <text class="more">查看 ›</text>
      </view>

      <view v-else-if="!isCity" class="card">
        <view class="card-title">
          <text>省内城市（{{ data.childrenTotal }}）</text>
          <Segmented
            v-if="data.children.length"
            v-model="childSort"
            :options="childSortOptions"
            size="small"
            class="child-seg"
          />
        </view>
        <view v-if="!data.children.length" class="muted small">暂无已收录的城市 GDP 数据</view>
        <view
          v-else-if="data.childrenYear !== data.year || data.childrenPeriod !== data.period"
          class="muted small pad"
        >
          当前期次暂无城市数据，以下为 {{ data.childrenYear }} 年全年数据（{{
            data.children.length
          }}
          / {{ data.childrenTotal }} 个城市）
        </view>
        <view
          v-if="data.children.length"
          class="child child-head province-city-head"
          aria-hidden="true"
        >
          <text class="c-rank">排名</text>
          <text class="province-city-name-head">城市 / 全国排名</text>
          <text class="province-city-values-head">总量 / 实际增速</text>
        </view>
        <view
          v-for="(s, i) in shownChildren"
          :key="s.code"
          class="child province-city-row"
          @tap="goRegion(s.code, data.childrenYear, data.childrenPeriod)"
        >
          <text class="c-rank num">{{ i + 1 }}</text>
          <view class="province-city-name">
            <text class="c-name">{{ s.short_name }}</text>
            <text class="province-city-meta">
              {{ periodLabel(data.childrenYear, data.childrenPeriod) }} · 全国第
              {{ s.rank_national ?? "—" }}
            </text>
          </view>
          <view class="province-city-values">
            <text class="province-city-gdp num">{{ fmtGdp(s.gdp) }}</text>
            <text class="province-city-growth num" :class="trendClass(s.real_growth)">
              实际 {{ fmtPct(s.real_growth) }}
            </text>
          </view>
        </view>
        <view
          v-if="
            data.children.length < data.childrenTotal &&
            data.children.length &&
            data.childrenYear === data.year &&
            data.childrenPeriod === data.period
          "
          class="muted small pad"
        >
          另有 {{ data.childrenTotal - data.children.length }} 个城市本期数据暂无收录
        </view>
        <view
          v-if="sortedChildren.length > 10"
          class="expand"
          @tap="childrenExpanded = !childrenExpanded"
        >
          {{ childrenExpanded ? "收起" : "展开全部" }}
        </view>
      </view>

      <view v-else-if="data.nearby.length" class="card">
        <view class="card-title"><text>排名附近的城市</text></view>
        <view
          v-for="s in data.nearby"
          :key="s.code"
          class="child"
          :class="{ self: s.code === code }"
        >
          <text class="c-rank num">{{ s.rank_national }}</text>
          <text class="c-name" @tap="s.code !== code && goRegion(s.code, data.year, data.period)">{{
            s.short_name
          }}</text>
          <text class="c-gdp num">{{ fmtGdp(s.gdp) }}</text>
          <text v-if="s.code === code" class="tag primary">当前</text>
          <text v-else class="vs" @tap="compareWith(s.code)">对比</text>
        </view>
      </view>

      <!-- ⑧ AD-03 / AD-04 -->
      <AdSlot :slot-id="isCity ? 'AD-04' : 'AD-03'" type="banner" />
      <!-- ⑨ 来源 -->
      <SourceFooter :text="sourceText" />
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onPullDownRefresh, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";
import AdSlot from "@/components/AdSlot.vue";
import EmptyState from "@/components/EmptyState.vue";
import PeriodPicker from "@/components/PeriodPicker.vue";
import Segmented from "@/components/Segmented.vue";
import SkeletonList from "@/components/SkeletonList.vue";
import SourceFooter from "@/components/SourceFooter.vue";
import TrendChart from "@/components/TrendChart.vue";
import { api } from "@/api";
import { boot } from "@/store/app";
import {
  inCompare,
  isFavorite,
  pushHistory,
  setCompare,
  toggleCompare as toggleCompareRaw,
  toggleFavorite as toggleFavoriteRaw,
} from "@/store/user";
import { unlockFeature } from "@/utils/ads";
import {
  fmtGdp,
  fmtGdpDecimal,
  fmtIncrement,
  fmtInt,
  fmtPct,
  PERIOD_LABEL,
  periodLabel,
  trendClass,
} from "@/utils/format";
import { copyTable, goRegion } from "@/utils/misc";
import { shareMessage } from "@/utils/share";
import type { PeriodKey, RegionResult } from "@/types";

const code = ref("");
const data = ref<RegionResult | null>(null);
const error = ref("");
const historyExpanded = ref(false);
const childrenExpanded = ref(false);
const childSort = ref("gdp");
const childSortOptions = [
  { label: "总量", value: "gdp" },
  { label: "实际增速", value: "growth" },
];

const cur = computed(() => data.value?.current ?? null);
const isCity = computed(() => data.value?.region.level === "city");
const showsPopulation = computed(
  () => data.value?.region.level === "city" || data.value?.region.level === "province"
);
const favorite = computed(() => isFavorite(code.value));
const compared = computed(() => inCompare(code.value));
const populationTip = computed(() =>
  data.value?.population
    ? `${data.value.population.year}年数据，已收录 ${data.value.population.covered}/${data.value.population.total} 市，来源：${data.value.population.source_name}`
    : "暂无已收录的常住人口数据"
);

const TAG_LABEL: Record<string, string> = {
  municipality: "直辖市",
  capital: "省会",
  sub_provincial: "副省级",
  separate_plan: "计划单列市",
};
const typeTags = computed(() =>
  (data.value?.region.tags ?? []).map((t) => TAG_LABEL[t]).filter(Boolean)
);

const metrics = computed(() => {
  const s = cur.value;
  if (!s) return [];
  const list: { label: string; value: string; cls?: string; tip?: string }[] = [
    { label: "增长量", value: fmtIncrement(s.increment), cls: trendClass(s.increment) },
    {
      label: "实际增速",
      value: fmtPct(s.real_growth),
      cls: trendClass(s.real_growth),
      tip: s.real_growth == null ? "该地区本期未公布实际增速" : "",
    },
  ];
  if (!isCity.value) {
    list.push({ label: "全国排名", value: `第 ${s.rank_national}` });
  }
  if (showsPopulation.value) {
    const population = data.value?.population;
    list.push({
      label: isCity.value ? "常住人口" : "已收录市人口合计",
      value: population ? populationText(population.population) : "暂无数据",
      tip: populationTip.value,
    });
  }
  return list;
});

function populationText(value: number) {
  const wan = (value / 10000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${wan} 万人`;
}

const shownHistory = computed(() => {
  if (historyExpanded.value) return data.value?.history ?? [];
  return annualHistory.value.slice(0, 5);
});
const annualHistory = computed(() => {
  const byYear = new Map<number, RegionResult["history"][number]>();
  for (const row of data.value?.history ?? []) {
    if (!byYear.has(row.year)) byYear.set(row.year, row);
  }
  return [...byYear.values()];
});
const sortedChildren = computed(() => {
  const list = [...(data.value?.children ?? [])];
  if (childSort.value === "growth")
    list.sort((a, b) => (b.real_growth ?? -999) - (a.real_growth ?? -999));
  return list;
});
const shownChildren = computed(() =>
  childrenExpanded.value ? sortedChildren.value : sortedChildren.value.slice(0, 10)
);

const sourceText = computed(() => {
  if (cur.value?.source === "manual") return "数据来源：地方统计部门公开数据";
  if (cur.value?.source === "city-yearbook") return "数据来源：中国城市统计年鉴";
  if (cur.value?.source === "city-ranking") return "数据来源：聚汇数据整理（各地统计局公开数据）";
  return "数据来源：国家统计局";
});

async function load(year?: number, period?: PeriodKey) {
  error.value = "";
  try {
    await boot();
    data.value = await api.region(code.value, year, period);
    uni.setNavigationBarTitle({ title: data.value.region.name });
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onLoad((query) => {
  code.value = query?.code ?? "";
  const year = query?.year ? Number(query.year) : undefined;
  load(year, query?.period as PeriodKey | undefined);
  pushHistory(code.value);
});
onPullDownRefresh(async () => {
  await load(data.value?.year, data.value?.period);
  uni.stopPullDownRefresh();
});

const showTip = (tip: string) => uni.showToast({ title: tip, icon: "none" });
const toggleFavorite = (c: string) => toggleFavoriteRaw(c).catch(() => undefined);
async function toggleCompare(c: string) {
  const added = await toggleCompareRaw(c).catch(() => false);
  if (added) uni.showToast({ title: "已加入对比，可在「对比」查看", icon: "none" });
}
async function compareWith(other: string) {
  await setCompare([code.value, other]).catch(() => undefined);
  uni.switchTab({ url: "/pages/compare/index" });
}

async function copyHistory() {
  if (!data.value) return;
  if (!(await unlockFeature("copy_history"))) return;
  copyTable([
    [`${data.value.region.name} GDP 历史数据`],
    ["期次", "总量(亿元)", "增长量(亿元)", "名义增速(%)", "实际增速(%)", "全国排名"],
    ...data.value.history.map((s) => [
      periodLabel(s.year, s.period),
      s.gdp,
      s.increment ?? "",
      s.nominal_growth ?? "",
      s.real_growth ?? "",
      s.rank_national,
    ]),
  ]);
}

const shareTitle = () => {
  const s = cur.value;
  if (!data.value || !s) return "城市发展指标";
  return `${data.value.region.short_name} ${periodLabel(s.year, s.period)} GDP ${fmtGdp(s.gdp)}，全国第 ${s.rank_national}`;
};
const sharePath = () =>
  `/pages/region/index?code=${code.value}${data.value ? `&year=${data.value.year}&period=${data.value.period}` : ""}`;
onShareAppMessage(() =>
  shareMessage(
    shareTitle(),
    sharePath(),
    cur.value && data.value
      ? {
          kind: "region",
          title: `${periodLabel(cur.value.year, cur.value.period)} GDP`,
          name: data.value.region.name,
          big: big.value.value,
          unit: big.value.unit,
          growth: cur.value.real_growth,
          rankText: `全国第 ${cur.value.rank_national}`,
        }
      : undefined
  )
);
onShareTimeline(() => ({
  title: shareTitle(),
  query: `code=${code.value}${data.value ? `&year=${data.value.year}&period=${data.value.period}` : ""}`,
}));
</script>

<style lang="scss" scoped>
.header {
  padding: 8rpx 0 24rpx;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  font-size: 48rpx;
  font-weight: 700;
}
.star {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 40rpx;
  color: $color-text-3;
  &.on {
    color: $color-gold;
  }
  .star-text {
    font-size: 20rpx;
  }
}
.tags {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  row-gap: 12rpx;
}
.period-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.source-hint {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: $color-text-3;
}
.core-label {
  font-size: 26rpx;
  color: $color-text-2;
}
.core-big {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
  .big {
    font-size: 80rpx;
    font-weight: 700;
    color: $color-primary;
  }
  .unit {
    margin-left: 8rpx;
    font-size: 30rpx;
    color: $color-primary;
  }
}
.metrics {
  display: flex;
  flex-wrap: wrap;
  margin: 24rpx 0 0;
  border-top: 1rpx solid $color-border;
}
.population-only {
  width: 100%;
  .metric {
    width: 100%;
    border-right: 0;
  }
}
.metric {
  width: 50%;
  padding: 16rpx 12rpx;
  display: flex;
  flex-direction: column;
  border-bottom: 1rpx solid $color-border;
  &:nth-child(odd) {
    border-right: 1rpx solid $color-border;
  }
}
.m-label {
  font-size: 22rpx;
  color: $color-text-3;
}
.m-value {
  margin-top: 6rpx;
  font-size: 32rpx;
  font-weight: 600;
}
.core-pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
  .pending-title {
    margin-bottom: 24rpx;
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
.h-table {
  display: inline-block;
  min-width: 100%;
}
.h-row {
  display: flex;
  height: 72rpx;
  align-items: center;
  border-bottom: 1rpx solid $color-border;
  &.head .c {
    color: $color-text-3;
  }
}
.c {
  width: 120rpx;
  flex-shrink: 0;
  text-align: right;
  font-size: 24rpx;
  &.period {
    width: 170rpx;
    text-align: left;
  }
}
.expand {
  padding-top: 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: $color-primary;
}
.link-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .more {
    color: $color-primary;
    font-size: 26rpx;
  }
}
.child-seg {
  width: 260rpx;
}
.child {
  display: flex;
  align-items: center;
  height: 88rpx;
  border-bottom: 1rpx solid $color-border;
  &.self {
    background: $color-primary-light;
    margin: 0 -16rpx;
    padding: 0 16rpx;
    border-radius: 12rpx;
  }
}
.child-head {
  height: 64rpx;
  color: $color-text-3;
  font-size: 22rpx;
  font-weight: 400;
  .c-rank,
  .c-name,
  .c-share {
    color: inherit;
    font-size: inherit;
    font-weight: inherit;
  }
}
.province-city-head {
  .c-rank {
    width: 56rpx;
  }
}
.province-city-name-head {
  flex: 1;
  min-width: 0;
  margin-left: 8rpx;
}
.province-city-values-head {
  width: 220rpx;
  flex-shrink: 0;
  text-align: right;
}
.province-city-row {
  min-height: 108rpx;
  height: auto;
  padding: 14rpx 0;
  .c-rank {
    width: 56rpx;
  }
  .c-name {
    flex: none;
    font-size: 28rpx;
    font-weight: 600;
  }
}
.province-city-name {
  flex: 1;
  min-width: 0;
  margin-left: 8rpx;
}
.province-city-meta {
  display: block;
  margin-top: 6rpx;
  color: $color-text-3;
  font-size: 20rpx;
  white-space: nowrap;
}
.province-city-values {
  width: 220rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.province-city-gdp {
  font-size: 28rpx;
  font-weight: 600;
  white-space: nowrap;
}
.province-city-growth {
  margin-top: 6rpx;
  font-size: 21rpx;
  white-space: nowrap;
}
.c-rank {
  width: 56rpx;
  color: $color-text-2;
  font-weight: 600;
}
.c-name {
  flex: 1;
  font-size: 28rpx;
}
.c-gdp {
  width: 200rpx;
  text-align: right;
}
.c-growth {
  width: 120rpx;
  text-align: right;
}
.c-share {
  width: 110rpx;
  text-align: right;
  color: $color-text-3;
  font-size: 24rpx;
}
.vs {
  margin-left: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  background: $color-primary-light;
  color: $color-primary;
  font-size: 24rpx;
}
.small {
  font-size: 24rpx;
}
.pad {
  padding-top: 16rpx;
}
</style>
