<!-- P06 搜索：本地匹配地区字典，结果附最新一期总量和全国排名 -->
<template>
  <view class="wrap">
    <view class="bar">
      <view class="input-box">
        <text class="icon">⌕</text>
        <input
          v-model="keyword"
          class="input"
          placeholder="搜索省份、城市，支持拼音"
          focus
          confirm-type="search"
          @confirm="onConfirm"
        />
        <text v-if="keyword" class="clear" @tap="keyword = ''">✕</text>
      </view>
      <text class="cancel" @tap="back">取消</text>
    </view>

    <!-- 默认态 -->
    <view v-if="!keyword" class="page">
      <view v-if="userState.search_history.length" class="block">
        <view class="block-title">
          <text>搜索历史</text>
          <text class="trash" @tap="clearSearch">清空</text>
        </view>
        <view class="chips">
          <text v-for="k in userState.search_history" :key="k" class="chip" @tap="keyword = k">{{
            k
          }}</text>
        </view>
      </view>
      <view class="block">
        <view class="block-title"><text>热门搜索</text></view>
        <view class="chips">
          <text
            v-for="(k, i) in hotSearch"
            :key="k"
            class="chip"
            :class="{ hot: i < 3 }"
            @tap="keyword = k"
            >{{ k }}</text
          >
        </view>
      </view>
    </view>

    <!-- 结果态 -->
    <view v-else class="page">
      <view v-if="!hits.provinces.length && !hits.cities.length" class="none">
        <text class="none-title">没有找到“{{ keyword }}”</text>
        <text class="none-desc">目前收录全国省份和地级及以上城市</text>
      </view>
      <view v-for="group in groups" :key="group.title" class="card result">
        <view class="group-title">{{ group.title }}</view>
        <view v-for="h in group.hits" :key="h.region.code" class="row" @tap="open(h.region.code)">
          <view class="row-main">
            <text v-for="(p, i) in h.parts" :key="i" :class="{ hl: p.hit }">{{ p.text }}</text>
            <text v-if="h.region.level === 'city'" class="parent">{{
              parentName(h.region.parent_code)
            }}</text>
          </view>
          <view v-if="latest[h.region.code]" class="row-side">
            <text class="num">{{ fmtGdp(latest[h.region.code].gdp) }}</text>
            <text class="rank">全国第 {{ latest[h.region.code].rank_national }}</text>
          </view>
          <text v-else class="row-side muted">暂无数据</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api } from "@/api";
import { appState, boot, latestPeriodFor } from "@/store/app";
import { clearSearch, pushSearch, userState } from "@/store/user";
import { fmtGdp } from "@/utils/format";
import { goRegion, parentName } from "@/utils/misc";
import { searchRegions } from "@/utils/search";
import type { Stat } from "@/types";

const keyword = ref("");
const debounced = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
watch(keyword, (v) => {
  clearTimeout(timer);
  timer = setTimeout(() => (debounced.value = v.trim()), 200);
});

const hotSearch = computed(() => appState.config.hot_search ?? []);
const hits = computed(() => searchRegions(debounced.value));
const groups = computed(() =>
  [
    { title: "省份", hits: hits.value.provinces },
    { title: "城市", hits: hits.value.cities },
  ].filter((g) => g.hits.length)
);

// 各地区最新一期数据（省级最新期 + 城市最新期），用于结果右侧展示
const latest = ref<Record<string, Stat>>({});
onLoad(async () => {
  await boot();
  const tasks = (["province", "city"] as const).map(async (level) => {
    const p = latestPeriodFor(level);
    if (!p) return [];
    const res = await api.ranking({
      level,
      year: p.year,
      period: p.period,
      scope: "all",
      sort: "gdp",
      order: "desc",
    });
    return res.items;
  });
  const lists = await Promise.all(tasks).catch(() => [] as Stat[][]);
  latest.value = Object.fromEntries(lists.flat().map((s) => [s.code, s]));
});

function open(code: string) {
  pushSearch(keyword.value.trim());
  goRegion(code);
}
function onConfirm() {
  const first = hits.value.provinces[0] ?? hits.value.cities[0];
  if (first) open(first.region.code);
}
const back = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
.bar {
  display: flex;
  align-items: center;
  padding: 16rpx $page-gutter;
  background: #fff;
}
.input-box {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 36rpx;
  background: $color-bg;
  .icon {
    margin-right: 12rpx;
    color: $color-text-3;
    font-size: 32rpx;
  }
  .input {
    flex: 1;
    font-size: 28rpx;
  }
  .clear {
    padding-left: 16rpx;
    color: $color-text-3;
  }
}
.cancel {
  margin-left: 24rpx;
  font-size: 28rpx;
  color: $color-text-2;
}
.block {
  margin-bottom: 32rpx;
}
.block-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  .trash {
    font-weight: 400;
    font-size: 24rpx;
    color: $color-text-3;
  }
}
.chips {
  display: flex;
  flex-wrap: wrap;
}
.chip {
  margin: 0 16rpx 16rpx 0;
  padding: 12rpx 24rpx;
  border-radius: 28rpx;
  background: #fff;
  font-size: 26rpx;
  &.hot {
    color: $color-up;
  }
}
.result {
  padding-top: 16rpx;
  padding-bottom: 8rpx;
}
.group-title {
  font-size: 24rpx;
  color: $color-text-3;
  padding: 8rpx 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 96rpx;
  border-bottom: 1rpx solid $color-border;
}
.row-main {
  font-size: 30rpx;
  .hl {
    color: $color-primary;
  }
  .parent {
    margin-left: 12rpx;
    font-size: 24rpx;
    color: $color-text-3;
  }
}
.row-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 26rpx;
  .rank {
    font-size: 22rpx;
    color: $color-text-3;
  }
}
.none {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  .none-title {
    font-size: 30rpx;
  }
  .none-desc {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: $color-text-3;
  }
}
</style>
