<!-- P01 首页 -->
<template>
  <view class="page">
    <!-- ① 搜索框 -->
    <view class="search" @tap="goSearch">
      <text class="icon">⌕</text>
      <text>搜索省份、城市</text>
    </view>

    <EmptyState
      v-if="error && !data"
      type="error"
      title="网络不太好"
      :desc="error || '请检查网络后重试'"
      action-text="重新加载"
      @action="load"
    />

    <template v-else>
      <!-- ② 最新发布 -->
      <view class="card latest">
        <view class="latest-head">
          <text class="latest-title">{{ latest ? `${latest.label} GDP` : "加载中…" }}</text>
          <text class="tag red">最新</text>
        </view>
        <text v-if="latest" class="latest-sub">
          省级已公布 {{ latest.province_count }}/{{ latest.province_total }} · 城市已公布
          {{ latest.city_count }}/{{ latest.city_total }}
        </text>
        <view class="latest-btns">
          <view class="btn primary" @tap="openProvince">省级榜 ›</view>
          <view class="btn" @tap="openCity">城市榜 ›</view>
        </view>
      </view>

      <!-- ③ 全国速览 -->
      <view class="card">
        <view class="card-title">
          <text>全国速览</text>
          <Segmented v-model="topMode" :options="topOptions" size="small" class="top-seg" />
        </view>
        <SkeletonList v-if="!data" :rows="5" />
        <view
          v-for="(s, i) in topList"
          :key="s.code"
          class="top-row"
          @tap="goRegion(s.code, s.year, s.period)"
        >
          <view v-if="i < 3" class="medal" :class="`m${i + 1}`">{{ i + 1 }}</view>
          <text v-else class="rank num">{{ i + 1 }}</text>
          <text class="name">{{ s.short_name }}</text>
          <text class="gdp num">{{ fmtGdp(s.gdp) }}</text>
          <text class="growth num" :class="trendClass(s.real_growth)">{{
            fmtPct(s.real_growth)
          }}</text>
        </view>
        <view class="more-link" @tap="openProvince">查看全部 31 省 ›</view>
      </view>

      <!-- ④ 快捷分组 -->
      <view class="card">
        <view class="card-title"><text>城市分组</text></view>
        <view class="groups">
          <view v-for="g in GROUPS" :key="g.tag" class="group" @tap="openGroup(g.tag)">{{
            g.label
          }}</view>
        </view>
      </view>

      <!-- ⑤ 我的关注 -->
      <view class="card">
        <view class="card-title">
          <text>我的关注</text>
          <text v-if="favorites.length" class="more" @tap="goFavorites">全部 ›</text>
        </view>
        <scroll-view v-if="favorites.length" scroll-x class="favs">
          <view v-for="s in favorites" :key="s.code" class="fav" @tap="goRegion(s.code)">
            <text class="fav-name">{{ s.short_name }}</text>
            <text class="fav-gdp num">{{ fmtGdp(s.gdp) }}</text>
            <text class="fav-meta num">
              <text :class="trendClass(s.real_growth)">{{ fmtPct(s.real_growth) }}</text>
              · 全国第 {{ s.rank_national }}
            </text>
            <text class="fav-period">{{ periodLabel(s.year, s.period) }}</text>
          </view>
        </scroll-view>
        <text v-else class="fav-empty">收藏关注的地区，新数据一发布就能在这里看到</text>
      </view>

      <!-- ⑥ AD-01 -->
      <AdSlot slot-id="AD-01" />
      <!-- ⑦ 数据来源 -->
      <SourceFooter />
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  onLoad,
  onPullDownRefresh,
  onShareAppMessage,
  onShareTimeline,
  onShow,
} from "@dcloudio/uni-app";
import AdSlot from "@/components/AdSlot.vue";
import EmptyState from "@/components/EmptyState.vue";
import Segmented from "@/components/Segmented.vue";
import SkeletonList from "@/components/SkeletonList.vue";
import SourceFooter from "@/components/SourceFooter.vue";
import { api } from "@/api";
import { boot } from "@/store/app";
import { openRanking } from "@/store/ranking";
import { loadUser, syncCompareBadge, userState } from "@/store/user";
import { fmtGdp, fmtPct, periodLabel, trendClass } from "@/utils/format";
import { goRegion } from "@/utils/misc";
import { GROUPS } from "@/utils/scope";
import { shareMessage } from "@/utils/share";
import type { HomeResult } from "@/types";

const data = ref<HomeResult | null>(null);
const error = ref("");
const topMode = ref("gdp");
const topOptions = [
  { label: "总量 Top5", value: "gdp" },
  { label: "增速 Top5", value: "growth" },
];

const latest = computed(() => data.value?.latest ?? null);
const topList = computed(
  () => (topMode.value === "gdp" ? data.value?.provinceTop : data.value?.growthTop) ?? []
);
const favorites = computed(() => data.value?.favorites ?? []);

async function load() {
  error.value = "";
  try {
    await boot();
    await loadUser();
    data.value = await api.home(userState.favorites);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onLoad(load);
onShow(syncCompareBadge);
onPullDownRefresh(async () => {
  await boot(true).catch(() => undefined);
  await load();
  uni.stopPullDownRefresh();
});
// 收藏变化后刷新「我的关注」
watch(
  () => userState.favorites.join(),
  (v, old) => {
    if (old !== undefined && data.value) load();
  }
);

const goSearch = () => uni.navigateTo({ url: "/pages/search/index" });
const goFavorites = () => uni.navigateTo({ url: "/pages/mine/favorites" });
const openProvince = () =>
  openRanking({ level: "province", year: latest.value?.year, period: latest.value?.period });
const openCity = () => openRanking({ level: "city" });
const openGroup = (tag: string) => openRanking({ level: "city", scope: `tag:${tag}` });

function shareSpec() {
  if (!latest.value || !data.value) return undefined;
  return {
    kind: "rank" as const,
    title: `${latest.value.label} 各省GDP排名`,
    rows: data.value.provinceTop.map((s, i) => ({
      rank: i + 1,
      name: s.short_name,
      gdp: s.gdp,
      growth: s.real_growth,
    })),
  };
}
const shareTitle = () =>
  latest.value ? `${latest.value.label}各省GDP排名出炉，看看你家排第几` : "省市GDP排行";
onShareAppMessage(() => shareMessage(shareTitle(), "/pages/home/index", shareSpec()));
onShareTimeline(() => ({ title: shareTitle() }));
</script>

<style lang="scss" scoped>
.search {
  display: flex;
  align-items: center;
  height: 80rpx;
  padding: 0 28rpx;
  margin-bottom: 24rpx;
  border-radius: 40rpx;
  background: #fff;
  color: $color-text-3;
  font-size: 28rpx;
  .icon {
    margin-right: 12rpx;
    font-size: 34rpx;
  }
}
.latest {
  background: linear-gradient(135deg, #3370ff, #5b8cff);
  color: #fff;
}
.latest-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.latest-title {
  font-size: 36rpx;
  font-weight: 700;
}
.latest-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  opacity: 0.85;
}
.latest-btns {
  display: flex;
  margin-top: 32rpx;
  .btn {
    flex: 1;
    &:first-child {
      margin-right: 20rpx;
      background: #fff;
      color: $color-primary;
    }
    &:last-child {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }
  }
}
.top-seg {
  width: 320rpx;
}
.top-row {
  display: flex;
  align-items: center;
  height: 88rpx;
  border-bottom: 1rpx solid $color-border;
  .rank {
    width: 44rpx;
    text-align: center;
    color: $color-text-2;
    font-weight: 600;
  }
  .name {
    flex: 1;
    margin-left: 20rpx;
    font-size: 30rpx;
  }
  .gdp {
    width: 220rpx;
    text-align: right;
  }
  .growth {
    width: 130rpx;
    text-align: right;
  }
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
.more-link {
  padding-top: 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: $color-primary;
}
.groups {
  display: flex;
  flex-wrap: wrap;
  margin: -8rpx;
}
.group {
  width: calc(25% - 16rpx);
  margin: 8rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 12rpx;
  background: $color-bg;
  font-size: 26rpx;
}
.favs {
  white-space: nowrap;
}
.fav {
  display: inline-flex;
  flex-direction: column;
  width: 240rpx;
  padding: 20rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
  background: $color-bg;
  white-space: normal;
}
.fav-name {
  font-size: 28rpx;
  font-weight: 600;
}
.fav-gdp {
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.fav-meta,
.fav-period {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $color-text-3;
}
.fav-empty {
  font-size: 26rpx;
  color: $color-text-3;
}
</style>
