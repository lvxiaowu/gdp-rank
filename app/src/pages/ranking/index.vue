<!-- P02 榜单 -->
<template>
  <view class="wrap">
    <!-- 吸顶筛选区 -->
    <view class="filters">
      <view class="metric-tabs">
        <view
          class="metric-indicator"
          :class="{ 'is-population': state.metric === 'population' }"
        />
        <view
          class="metric-tab"
          :class="{ active: state.metric === 'gdp' }"
          @tap="changeMetric('gdp')"
        >
          <text class="metric-name">GDP</text>
          <text class="metric-caption">地区生产总值</text>
        </view>
        <view
          class="metric-tab"
          :class="{ active: state.metric === 'population' }"
          @tap="changeMetric('population')"
        >
          <text class="metric-name">常住人口</text>
          <text class="metric-caption">各市最新统计</text>
        </view>
      </view>
      <view v-if="state.metric === 'gdp'" class="level-switch">
        <view
          v-for="option in levelOptions"
          :key="option.value"
          class="level-option"
          :class="{ active: state.level === option.value }"
          @tap="changeLevel(option.value)"
        >
          {{ option.label }}
        </view>
      </view>
      <view class="pickers">
        <PeriodPicker
          v-if="state.metric === 'gdp' && state.year"
          :level="state.level"
          :year="state.year"
          :period="state.period"
          @change="changePeriod"
        />
        <ScopePicker
          v-if="state.level === 'city'"
          :scope="state.scope"
          class="scope"
          @change="changeScope"
        />
      </view>
      <scroll-view scroll-x class="sorts">
        <template v-if="state.metric === 'gdp'">
          <view
            v-for="(label, key) in SORT_LABEL"
            :key="key"
            class="sort"
            :class="{ active: state.sort === key }"
            @tap="changeSort(key)"
          >
            {{ label
            }}<text v-if="state.sort === key" class="dir">{{
              state.order === "desc" ? "↓" : "↑"
            }}</text>
          </view>
        </template>
      </scroll-view>
      <view class="overview">
        <text>{{ state.metric === "population" ? populationOverview : overview }}</text>
        <view class="tools">
          <text v-if="state.metric === 'gdp'" class="tool" @tap="toggleView">{{
            state.view === "card" ? "表格" : "卡片"
          }}</text>
          <text class="tool" @tap="copy">复制</text>
        </view>
      </view>
    </view>

    <view class="content">
      <EmptyState
        v-if="error"
        type="error"
        title="加载失败"
        :desc="error || '请检查网络后重试'"
        action-text="重新加载"
        @action="retryLoad"
      />
      <view v-else-if="state.metric === 'population' && loading && !populationResult" class="card">
        <SkeletonList :rows="10" />
      </view>
      <EmptyState
        v-else-if="state.metric === 'population' && populationResult && !populationResult.total"
        type="pending"
        title="人口榜数据尚未导入"
        desc="将核验后的全市常住人口数据导入 city_population 集合后即可显示。"
      />
      <view
        v-else-if="state.metric === 'population' && populationResult?.items.length"
        class="card list"
      >
        <template v-for="s in populationResult.items" :key="s.code">
          <RankRow
            :rank="s.rank"
            :rank-change="null"
            :name="s.short_name"
            :sub="parentName(s.parent_code)"
            :main="populationText(s.population)"
            :minor="`${s.year}年${(s.approximate ?? s.source_name.includes('取整')) ? '约' : ''}统计${s.year < populationResult.year ? ' · 待更新' : ''}`"
            :minor-class="s.year < populationResult.year ? 'muted' : undefined"
            :compared="userState.compare.includes(s.code)"
            @open="open(s.code)"
            @compare="toggleCompare(s.code)"
          />
        </template>
      </view>
      <view v-else-if="state.metric === 'gdp' && loading && !result" class="card">
        <SkeletonList :rows="10" />
      </view>
      <EmptyState
        v-else-if="
          state.metric === 'gdp' && result && !result.items.length && !result.pending.length
        "
        type="pending"
        :title="`${periodLabel(state.year, state.period)}数据尚未发布`"
        desc="各地统计部门发布后会陆续更新"
        action-text="查看最新一期"
        @action="goLatest"
      />

      <!-- 卡片视图 -->
      <view
        v-else-if="state.metric === 'gdp' && result && result.items.length && state.view === 'card'"
        class="card list"
      >
        <template v-for="(s, i) in result.items" :key="s.code">
          <RankRow
            :rank="s.rank"
            :rank-change="s.rank_change"
            :name="s.short_name"
            :sub="subText(s)"
            :main="mainText(s)"
            :minor="minorText(s)"
            :main-class="state.sort === 'gdp' ? '' : trendClass(s[state.sort])"
            :minor-class="state.sort === 'gdp' ? trendClass(s.real_growth) : 'muted'"
            :compared="userState.compare.includes(s.code)"
            @open="open(s.code)"
            @compare="toggleCompare(s.code)"
          />
          <!-- AD-02：第 10 行后一条，之后每 15 行一条 -->
          <AdSlot v-if="showAdAfter(i)" slot-id="AD-02" class="list-ad" />
        </template>
      </view>

      <!-- 表格视图：首列冻结，其余横向滚动 -->
      <view v-else-if="state.metric === 'gdp' && result && result.items.length" class="card table">
        <view class="t-fixed">
          <view class="t-head">名次 地区</view>
          <view v-for="s in result.items" :key="s.code" class="t-cell fixed" @tap="open(s.code)">
            <text class="t-rank num">{{ s.rank ?? "—" }}</text>
            <text class="t-name">{{ s.short_name }}</text>
          </view>
        </view>
        <scroll-view scroll-x class="t-scroll">
          <view class="t-cols">
            <view v-for="c in tableCols" :key="c.key" class="t-col" :style="{ width: c.width }">
              <view
                class="t-head"
                :class="{ active: state.sort === c.key }"
                @tap="c.sortable && changeSort(c.key)"
              >
                {{ c.label
                }}<text v-if="state.sort === c.key">{{ state.order === "desc" ? "↓" : "↑" }}</text>
              </view>
              <view
                v-for="s in result.items"
                :key="s.code"
                class="t-cell num"
                :class="c.cls ? c.cls(s) : ''"
                >{{ c.fmt(s) }}</view
              >
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-if="pendingItems.length" class="card pending-card">
        <view class="pending">
          <view class="pending-title">
            {{ state.metric === "population" ? "暂无人口数据" : "本期暂无数据" }}
            （{{ pendingTotal }}）
          </view>
          <view
            v-for="p in pendingItems"
            :key="p.code"
            class="pending-row"
            @tap="state.metric === 'gdp' && open(p.code)"
          >
            <text>{{ p.short_name }}</text>
            <text class="pending-sub">{{ parentName(p.parent_code) }}</text>
            <text class="tag">{{ state.metric === "population" ? "待更新" : "暂无数据" }}</text>
          </view>
        </view>
      </view>

      <view v-if="state.level === 'city' && (canLoadMore || page > 1)" class="load-more">
        {{ loading ? "正在加载…" : canLoadMore ? "上拉加载更多" : "没有更多了" }}
      </view>

      <view v-if="state.metric === 'population' && populationResult" class="population-source">
        数据口径：全市常住人口；当前最新年份为 {{ populationResult.year }} 年，已更新
        {{ populationResult.current_year_published ?? "待云函数刷新" }}/{{
          populationResult.total
        }}
        市，其他 {{ populationResult.needs_update ?? "待云函数刷新" }} 市待更新。
        旧年份数据仍参与排名并标明年份；无可用数据的城市列在待更新区。已收录年份
        {{ populationYearsText }}。来源：{{ populationSource }}。
      </view>
      <SourceFooter v-if="state.metric === 'gdp' && result" />
    </view>

    <view
      v-if="showBackToTop"
      class="back-to-top"
      role="button"
      aria-label="返回顶部"
      @tap="backToTop"
    >
      <text class="back-to-top-arrow">↑</text>
      <text class="back-to-top-label">顶部</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  onPageScroll,
  onPullDownRefresh,
  onReachBottom,
  onShareAppMessage,
  onShareTimeline,
  onShow,
} from "@dcloudio/uni-app";
import AdSlot from "@/components/AdSlot.vue";
import EmptyState from "@/components/EmptyState.vue";
import PeriodPicker from "@/components/PeriodPicker.vue";
import RankRow from "@/components/RankRow.vue";
import ScopePicker from "@/components/ScopePicker.vue";
import SkeletonList from "@/components/SkeletonList.vue";
import SourceFooter from "@/components/SourceFooter.vue";
import { api } from "@/api";
import { boot, findPeriod, latestPeriodFor } from "@/store/app";
import { rankingState as state } from "@/store/ranking";
import { syncCompareBadge, toggleCompare as toggleCompareRaw, userState } from "@/store/user";
import { maybeShowInterstitial } from "@/utils/ads";
import {
  fmtGdp,
  fmtIncrement,
  fmtPct,
  fmtRankChange,
  fmtShare,
  fmtSortValue,
  periodLabel,
  SORT_LABEL,
  trendClass,
} from "@/utils/format";
import { copyTable, goRegion, parentName } from "@/utils/misc";
import { scopeLabel } from "@/utils/scope";
import { shareMessage } from "@/utils/share";
import type {
  Level,
  PendingRegion,
  PeriodKey,
  PopulationRankingResult,
  RankingResult,
  SortKey,
  Stat,
} from "@/types";

const levelOptions = [
  { label: "省级", value: "province" },
  { label: "城市", value: "city" },
];
const result = ref<RankingResult | null>(null);
const populationResult = ref<PopulationRankingResult | null>(null);
const page = ref(1);
const canLoadMore = computed(() => {
  if (state.level !== "city") return false;
  const pages =
    state.metric === "population"
      ? (populationResult.value?.pages ?? 1)
      : (result.value?.pages ?? 1);
  return page.value < pages;
});
const pendingItems = computed<PendingRegion[]>(() =>
  state.metric === "population"
    ? (populationResult.value?.pending ?? [])
    : (result.value?.pending ?? [])
);
const pendingTotal = computed(() =>
  state.metric === "population"
    ? (populationResult.value?.pending_total ?? populationResult.value?.pending.length ?? 0)
    : (result.value?.pending_total ?? result.value?.pending.length ?? 0)
);
const loading = ref(false);
const showBackToTop = ref(false);
const error = ref("");
let loadedVersion = -1;
let leftForDetail = false;

/**
 * 当前期次该层级没数据时，切到该层级最新一期。
 * 切换层级时（strict）还要求数据量够：城市季度数据常常只有直辖市几条，不适合作为默认期次。
 */
function ensurePeriod(strict = false) {
  const doc = state.year ? findPeriod(state.year, state.period) : null;
  const count = doc ? (state.level === "province" ? doc.province_count : doc.city_count) : 0;
  const latest = latestPeriodFor(state.level);
  const enough = !strict || state.level === "province" || count >= (latest?.city_count ?? 0) * 0.5;
  if (!count || !enough) {
    if (latest) {
      state.year = latest.year;
      state.period = latest.period;
    }
  }
}

let seq = 0;
async function load(append = false) {
  if (!append) page.value = 1;
  const requestedPage = append ? page.value + 1 : 1;
  const previous = result.value;
  const my = ++seq;
  loading.value = true;
  if (!append) error.value = "";
  try {
    await boot();
    ensurePeriod();
    const res = await api.ranking({
      level: state.level,
      year: state.year,
      period: state.period,
      scope: state.level === "city" ? state.scope : "all",
      sort: state.sort,
      order: state.order,
      page: state.level === "city" ? requestedPage : 1,
      page_size: state.level === "city" ? 30 : 500,
    });
    if (my === seq) {
      result.value =
        append && previous
          ? {
              ...res,
              items: [...previous.items, ...res.items],
              pending: [...previous.pending, ...res.pending],
            }
          : res;
      page.value = requestedPage;
    }
  } catch (err) {
    if (my === seq) {
      if (append) uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
      else error.value = (err as Error).message;
    }
  } finally {
    if (my === seq) loading.value = false;
  }
}

async function loadPopulation(append = false) {
  if (!append) page.value = 1;
  const requestedPage = append ? page.value + 1 : 1;
  const previous = populationResult.value;
  const my = ++seq;
  loading.value = true;
  if (!append) error.value = "";
  try {
    const request = async () => {
      await boot();
      return api.populationRanking({ scope: state.scope, page: requestedPage, page_size: 30 });
    };
    let res: PopulationRankingResult;
    try {
      res = await request();
    } catch (firstError) {
      if (my !== seq) return;
      // 小程序云函数首次唤醒偶尔会失败，稍候重试一次，避免用户手动重载。
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (my !== seq) return;
      res = await request();
    }
    if (my === seq) {
      populationResult.value =
        append && previous
          ? {
              ...res,
              items: [...previous.items, ...res.items],
              pending: [...previous.pending, ...res.pending],
            }
          : res;
      page.value = requestedPage;
    }
  } catch (err) {
    if (my === seq) {
      if (append) uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
      else error.value = (err as Error).message;
    }
  } finally {
    if (my === seq) loading.value = false;
  }
}

function retryLoad() {
  if (state.metric === "population") loadPopulation();
  else load();
}

onShow(() => {
  syncCompareBadge();
  if (loadedVersion !== state.version || !result.value) {
    loadedVersion = state.version;
    page.value = 1;
    result.value = null;
    // 从外部带层级进来但没指定期次时，按切换层级的规则选期次
    if (!state.year) ensurePeriod(true);
    if (state.metric === "population") loadPopulation();
    else load();
  }
  if (leftForDetail) {
    leftForDetail = false;
    maybeShowInterstitial();
  }
});
onPullDownRefresh(async () => {
  page.value = 1;
  if (state.metric === "population") await loadPopulation();
  else await load();
  uni.stopPullDownRefresh();
});
onReachBottom(() => {
  if (loading.value || !canLoadMore.value) return;
  if (state.metric === "population") loadPopulation(true);
  else load(true);
});
onPageScroll(({ scrollTop }) => {
  showBackToTop.value = scrollTop > 700;
});

function backToTop() {
  uni.pageScrollTo({ scrollTop: 0, duration: 300 });
}

function changeLevel(level: string) {
  page.value = 1;
  state.metric = "gdp";
  state.level = level as Level;
  state.sort = "gdp";
  state.order = "desc";
  result.value = null;
  ensurePeriod(true);
  load();
}
function changeMetric(metric: string) {
  page.value = 1;
  state.metric = metric as "gdp" | "population";
  if (state.metric === "population") {
    state.level = "city";
    populationResult.value = null;
    loadPopulation();
  } else {
    result.value = null;
    state.year = 0;
    ensurePeriod(true);
    load();
  }
}
function changePeriod(v: { year: number; period: PeriodKey }) {
  page.value = 1;
  state.year = v.year;
  state.period = v.period;
  load();
}
function changeScope(scope: string) {
  page.value = 1;
  state.scope = scope;
  if (state.metric === "population") loadPopulation();
  else load();
}
function changeSort(key: string) {
  page.value = 1;
  if (state.sort === key) state.order = state.order === "desc" ? "asc" : "desc";
  else {
    state.sort = key as SortKey;
    state.order = "desc";
  }
  load();
}
const toggleView = () => (state.view = state.view === "card" ? "table" : "card");
const toggleCompare = (code: string) => toggleCompareRaw(code).catch(() => undefined);

function open(code: string) {
  leftForDetail = true;
  goRegion(code, state.year, state.period);
}
function goLatest() {
  state.year = 0;
  load();
}

const overview = computed(() => {
  if (!result.value) return "";
  const unit = state.level === "province" ? "省" : "城";
  const scope =
    state.level === "city" && state.scope !== "all" ? `${scopeLabel(state.scope)} · ` : "";
  return `${scope}共 ${result.value.total} ${unit} · 已收录 ${result.value.published}`;
});
const populationOverview = computed(() =>
  populationResult.value
    ? populationResult.value.current_year_published == null
      ? `各市最新常住人口 · 已收录 ${populationResult.value.published}/${populationResult.value.total} 市`
      : `${populationResult.value.year}年人口已更新 ${populationResult.value.current_year_published}/${populationResult.value.total} 市 · ${populationResult.value.needs_update} 市待更新`
    : "全市常住人口"
);
const populationSource = computed(() => {
  return populationResult.value?.sources?.join("、") || "待补充";
});
const populationYearsText = computed(() => {
  const years =
    populationResult.value?.years ??
    (populationResult.value?.year ? [populationResult.value.year] : []);
  if (!years.length) return "暂无";
  return `${years.join("、")}年`;
});

function populationText(n: number) {
  const value = (n / 10000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${value}万人`;
}

function subText(s: Stat) {
  if (s.level === "province") return s.share != null ? `占全国 ${fmtShare(s.share)}` : "";
  if (s.tags.includes("municipality")) return "直辖市";
  if (state.scope.startsWith("province") && s.share != null) return `占全省 ${fmtShare(s.share)}`;
  return parentName(s.parent_code);
}
const mainText = (s: Stat) => fmtSortValue(state.sort, s[state.sort]);
const minorText = (s: Stat) =>
  state.sort === "gdp" ? `实际 ${fmtPct(s.real_growth)}` : fmtGdp(s.gdp);
const showAdAfter = (i: number) => i === 9 || (i > 9 && (i - 9) % 15 === 0);

const tableCols = computed(() => [
  {
    key: "gdp",
    label: "总量(亿)",
    width: "180rpx",
    sortable: true,
    fmt: (s: Stat) => fmtGdp(s.gdp).replace(" 亿", ""),
  },
  {
    key: "increment",
    label: "增长量",
    width: "170rpx",
    sortable: true,
    fmt: (s: Stat) => fmtIncrement(s.increment).replace(" 亿", ""),
    cls: (s: Stat) => trendClass(s.increment),
  },
  {
    key: "nominal_growth",
    label: "名义增速",
    width: "150rpx",
    sortable: true,
    fmt: (s: Stat) => fmtPct(s.nominal_growth),
    cls: (s: Stat) => trendClass(s.nominal_growth),
  },
  {
    key: "real_growth",
    label: "实际增速",
    width: "150rpx",
    sortable: true,
    fmt: (s: Stat) => fmtPct(s.real_growth),
    cls: (s: Stat) => trendClass(s.real_growth),
  },
  {
    key: "share",
    label: state.level === "province" ? "占全国" : "占全省",
    width: "130rpx",
    sortable: false,
    fmt: (s: Stat) => fmtShare(s.share),
  },
  {
    key: "rank_change",
    label: "名次变化",
    width: "130rpx",
    sortable: false,
    fmt: (s: Stat) => fmtRankChange(s.rank_change),
    cls: (s: Stat) => trendClass(s.rank_change),
  },
]);

function copy() {
  if (state.metric === "population") {
    if (!populationResult.value) return;
    copyTable([
      [`${populationResult.value.year}年全市常住人口排名`],
      ["名次", "城市", "全市常住人口（人）"],
      ...populationResult.value.items.map((s) => [s.rank ?? "", s.short_name, s.population]),
    ]);
    return;
  }
  if (!result.value) return;
  const title = `${periodLabel(state.year, state.period)} ${state.level === "province" ? "省级" : scopeLabel(state.scope) + "城市"} GDP 排名`;
  copyTable([
    [title],
    ["名次", "地区", "总量(亿元)", "增长量(亿元)", "名义增速(%)", "实际增速(%)"],
    ...result.value.items.map((s) => [
      s.rank ?? "",
      s.short_name,
      s.gdp,
      s.increment ?? "",
      s.nominal_growth ?? "",
      s.real_growth ?? "",
    ]),
  ]);
}

const shareTitle = () => {
  if (state.metric === "population") return "各城市最新全市常住人口排名";
  const p = periodLabel(state.year, state.period);
  return state.level === "province"
    ? `${p}各省GDP排名出炉，看看你家排第几`
    : `${p}${scopeLabel(state.scope)}城市GDP排行榜`;
};
onShareAppMessage(() =>
  shareMessage(
    shareTitle(),
    "/pages/ranking/index",
    state.metric === "population"
      ? undefined
      : result.value
        ? {
            kind: "rank",
            title: `${periodLabel(state.year, state.period)} ${state.level === "province" ? "各省" : "城市"}GDP排名`,
            rows: result.value.items.slice(0, 5).map((s) => ({
              rank: s.rank ?? null,
              name: s.short_name,
              gdp: s.gdp,
              growth: s.real_growth,
            })),
          }
        : undefined
  )
);
onShareTimeline(() => ({ title: shareTitle() }));
</script>

<style lang="scss" scoped>
.filters {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 20rpx $page-gutter 0;
  background: $color-bg;
}
.metric-tabs {
  position: relative;
  display: flex;
  padding: 8rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(23, 37, 61, 0.04);
}
.metric-indicator {
  position: absolute;
  top: 8rpx;
  bottom: 8rpx;
  left: 8rpx;
  width: calc((100% - 16rpx) / 2);
  border-radius: 15rpx;
  background: rgba($color-primary, 0.08);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  &.is-population {
    transform: translateX(100%);
  }
}
.metric-tab {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-width: 0;
  height: 88rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 15rpx;
  color: $color-text-2;
  transition:
    background-color 0.22s ease,
    color 0.22s ease,
    transform 0.18s ease;
  &.active {
    color: $color-primary;
  }
  &:active {
    transform: scale(0.98);
  }
}
.metric-name {
  font-size: 29rpx;
  font-weight: 600;
  line-height: 1.2;
  transition: transform 0.22s ease;
  .active & {
    transform: translateY(-1rpx);
  }
}
.metric-caption {
  margin-top: 5rpx;
  color: $color-text-3;
  font-size: 21rpx;
  line-height: 1.2;
  .active & {
    color: $color-primary;
    opacity: 0.78;
  }
}
.level-switch {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 18rpx;
}
.level-option {
  min-width: 112rpx;
  height: 54rpx;
  padding: 0 22rpx;
  border: 1rpx solid $color-border;
  border-radius: 28rpx;
  background: #fff;
  color: $color-text-2;
  font-size: 24rpx;
  line-height: 52rpx;
  text-align: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.15s ease;
  &:active {
    transform: scale(0.96);
  }
  &.active {
    border-color: $color-primary;
    background: $color-primary;
    color: #fff;
    font-weight: 600;
  }
}
.pickers {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  .scope {
    margin-left: 16rpx;
  }
}
.sorts {
  margin-top: 20rpx;
  white-space: nowrap;
}
.sort {
  display: inline-block;
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 24rpx;
  margin-right: 12rpx;
  border-radius: 28rpx;
  background: #fff;
  font-size: 26rpx;
  color: $color-text-2;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.15s ease;
  &:active {
    transform: scale(0.96);
  }
  &.active {
    background: $color-primary;
    color: #fff;
  }
  .dir {
    margin-left: 4rpx;
  }
}
.overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72rpx;
  font-size: 24rpx;
  color: $color-text-3;
}
.population-source {
  padding: 24rpx 8rpx 0;
  color: $color-text-3;
  font-size: 22rpx;
  line-height: 1.6;
}
.load-more {
  padding: 28rpx 0;
  color: $color-text-3;
  font-size: 24rpx;
  text-align: center;
}
.pending-card {
  margin-top: 20rpx;
}
.tools .tool {
  margin-left: 28rpx;
  color: $color-primary;
  transition: opacity 0.15s ease;
  &:active {
    opacity: 0.58;
  }
}
.content {
  padding: 0 $page-gutter 48rpx;
}
.back-to-top {
  position: fixed;
  z-index: 20;
  right: 28rpx;
  bottom: calc(150rpx + env(safe-area-inset-bottom));
  display: flex;
  width: 88rpx;
  height: 88rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 6rpx 24rpx rgba(31, 45, 61, 0.18);
  color: $color-primary;
}
.back-to-top-arrow {
  height: 38rpx;
  font-size: 38rpx;
  font-weight: 600;
  line-height: 38rpx;
}
.back-to-top-label {
  margin-top: 2rpx;
  font-size: 19rpx;
  line-height: 24rpx;
}
.list {
  padding-top: 0;
  padding-bottom: 8rpx;
}
.list-ad {
  display: block;
  margin-top: 16rpx;
}
.pending-title {
  padding: 28rpx 0 8rpx;
  font-size: 24rpx;
  color: $color-text-3;
}
.pending-row {
  display: flex;
  align-items: center;
  height: 88rpx;
  border-bottom: 1rpx solid $color-border;
  color: $color-text-3;
  font-size: 28rpx;
  padding-left: 88rpx;
}
.pending-sub {
  flex: 1;
  margin-left: 16rpx;
  font-size: 22rpx;
}
.table {
  display: flex;
  padding: 0;
  overflow: hidden;
}
.t-fixed {
  width: 200rpx;
  flex-shrink: 0;
  border-right: 1rpx solid $color-border;
}
.t-scroll {
  flex: 1;
  min-width: 0;
}
.t-cols {
  display: inline-flex;
}
.t-col {
  flex-shrink: 0;
}
.t-head,
.t-cell {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 16rpx;
  border-bottom: 1rpx solid $color-border;
  font-size: 24rpx;
  white-space: nowrap;
  text-align: right;
}
.t-head {
  color: $color-text-3;
  background: #fafbfc;
  &.active {
    color: $color-primary;
  }
}
.t-fixed .t-head,
.t-cell.fixed {
  text-align: left;
}
.t-rank {
  display: inline-block;
  width: 48rpx;
  color: $color-text-2;
}
.t-name {
  font-weight: 600;
}
@media (prefers-reduced-motion: reduce) {
  .metric-indicator,
  .metric-tab,
  .metric-name,
  .level-option,
  .sort,
  .tools .tool {
    transition: none;
    transform: none;
  }
}
</style>
