<!-- P07-A 收藏列表：左滑取消收藏 -->
<template>
  <view class="page">
    <EmptyState
      v-if="loaded && !list.length"
      title="还没有收藏"
      desc="在地区详情页点「收藏」，新数据一发布就能在首页看到"
      action-text="去榜单看看"
      @action="goRanking"
    />
    <view v-else-if="!loaded" class="card"><SkeletonList :rows="4" /></view>

    <view v-else class="card list">
      <view
        v-for="s in list"
        :key="s.code"
        class="swipe"
        @touchstart="onStart($event, s.code)"
        @touchmove="onMove"
        @touchend="onEnd"
      >
        <view
          class="row"
          :style="{ transform: `translateX(${offsetOf(s.code)}rpx)` }"
          @tap="openRow(s.code)"
        >
          <view class="info">
            <text class="name">{{ s.short_name }}</text>
            <text class="sub"
              >{{ s.level === "city" ? parentName(s.parent_code) : "省级" }} ·
              {{ periodLabel(s.year, s.period) }}</text
            >
          </view>
          <view class="value">
            <text class="num gdp">{{ fmtGdp(s.gdp) }}</text>
            <text class="num minor">
              <text :class="trendClass(s.real_growth)">{{ fmtPct(s.real_growth) }}</text> · 全国第
              {{ s.rank_national }}
            </text>
          </view>
        </view>
        <view class="del" @tap="remove(s.code)">取消收藏</view>
      </view>
      <view class="tip">左滑可取消收藏</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import EmptyState from "@/components/EmptyState.vue";
import SkeletonList from "@/components/SkeletonList.vue";
import { api } from "@/api";
import { boot } from "@/store/app";
import { openRanking } from "@/store/ranking";
import { loadUser, toggleFavorite, userState } from "@/store/user";
import { fmtGdp, fmtPct, periodLabel, trendClass } from "@/utils/format";
import { goRegion, parentName } from "@/utils/misc";
import type { Stat } from "@/types";

const stats = ref<Stat[]>([]);
const loaded = ref(false);
// 只显示仍在收藏中的地区（取消后立即消失）
const list = computed(() => stats.value.filter((s) => userState.favorites.includes(s.code)));

onShow(async () => {
  await boot().catch(() => undefined);
  await loadUser();
  stats.value = await api.latest(userState.favorites).catch(() => []);
  loaded.value = true;
});

// ---- 左滑 ----
const DELETE_WIDTH = 160;
const opened = ref("");
const dragging = ref<{ code: string; x: number; dx: number } | null>(null);
function offsetOf(code: string) {
  if (dragging.value?.code === code) {
    const base = opened.value === code ? -DELETE_WIDTH : 0;
    return Math.max(-DELETE_WIDTH, Math.min(0, base + dragging.value.dx * 2));
  }
  return opened.value === code ? -DELETE_WIDTH : 0;
}
type TouchEvt = { touches: ArrayLike<{ clientX: number }> };
function onStart(e: TouchEvt, code: string) {
  dragging.value = { code, x: e.touches[0].clientX, dx: 0 };
}
function onMove(e: TouchEvt) {
  if (dragging.value) dragging.value.dx = e.touches[0].clientX - dragging.value.x;
}
function onEnd() {
  const d = dragging.value;
  if (!d) return;
  const final = offsetOf(d.code);
  opened.value = final < -DELETE_WIDTH / 2 ? d.code : "";
  dragging.value = null;
}

function openRow(code: string) {
  if (opened.value) {
    opened.value = "";
    return;
  }
  goRegion(code);
}
async function remove(code: string) {
  opened.value = "";
  await toggleFavorite(code).catch(() => undefined);
}
const goRanking = () => openRanking({ level: "province" });
</script>

<style lang="scss" scoped>
.list {
  padding: 0 32rpx;
  overflow: hidden;
}
.swipe {
  position: relative;
  border-bottom: 1rpx solid $color-border;
}
.row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 128rpx;
  background: #fff;
  transition: transform 0.15s;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.name {
  font-size: 30rpx;
  font-weight: 600;
}
.sub,
.minor {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $color-text-3;
}
.value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.gdp {
  font-size: 30rpx;
  font-weight: 600;
}
.del {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-up;
  color: #fff;
  font-size: 26rpx;
}
.tip {
  padding: 24rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: $color-text-3;
}
</style>
