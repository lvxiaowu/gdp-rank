<!-- 对比页「添加地区」弹层（原型 P05-A）：搜索 + 省份 / 城市（按省分组、字母索引）/ 最近查看 -->
<template>
  <BottomSheet
    :show="show"
    title="添加地区"
    height="85vh"
    :scroll-into-view="anchor"
    @close="emit('close')"
  >
    <template #top>
      <view class="top">
        <input
          v-model="keyword"
          class="search"
          placeholder="搜索省份、城市"
          confirm-type="search"
        />
        <Segmented v-if="!keyword" v-model="tab" :options="tabOptions" />
      </view>
    </template>

    <view v-if="keyword" class="list">
      <view v-for="h in searchHits" :key="h.region.code" class="item" @tap="toggle(h.region.code)">
        <text class="name">{{ h.region.name }}</text>
        <text class="sub">{{
          h.region.level === "city" ? parentName(h.region.parent_code) : "省级"
        }}</text>
        <text v-if="inCompare(h.region.code)" class="check">✓</text>
      </view>
      <view v-if="!searchHits.length" class="none">没有找到“{{ keyword }}”</view>
    </view>

    <view v-else-if="tab === 'province'" class="list">
      <view v-for="r in provinces" :key="r.code" class="item" @tap="toggle(r.code)">
        <text class="name">{{ r.name }}</text>
        <text v-if="inCompare(r.code)" class="check">✓</text>
      </view>
    </view>

    <view v-else-if="tab === 'city'" class="list">
      <view v-for="g in cityGroups" :id="`g-${g.code}`" :key="g.code">
        <view class="group-title">{{ g.name }}</view>
        <view v-for="r in g.cities" :key="r.code" class="item" @tap="toggle(r.code)">
          <text class="name">{{ r.name }}</text>
          <text v-if="inCompare(r.code)" class="check">✓</text>
        </view>
      </view>
    </view>

    <view v-else class="list">
      <view v-for="r in recent" :key="r.code" class="item" @tap="toggle(r.code)">
        <text class="name">{{ r.name }}</text>
        <text class="sub">{{ r.level === "city" ? parentName(r.parent_code) : "省级" }}</text>
        <text v-if="inCompare(r.code)" class="check">✓</text>
      </view>
      <view v-if="!recent.length" class="none">还没有查看过地区</view>
    </view>

    <template #footer>
      <view v-if="tab === 'city' && !keyword" class="index">
        <text v-for="l in letters" :key="l.letter" class="letter" @tap="anchor = `g-${l.code}`">{{
          l.letter
        }}</text>
      </view>
      <view class="footer">
        <view class="btn primary" @tap="emit('close')"
          >完成（已选 {{ userState.compare.length }}/{{ MAX_COMPARE }}）</view
        >
      </view>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BottomSheet from "./BottomSheet.vue";
import Segmented from "./Segmented.vue";
import { appState, getRegion } from "@/store/app";
import { inCompare, MAX_COMPARE, toggleCompare, userState } from "@/store/user";
import { parentName } from "@/utils/misc";
import { searchRegions } from "@/utils/search";
import type { Region } from "@/types";

defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const keyword = ref("");
const tab = ref("province");
const tabOptions = [
  { label: "省份", value: "province" },
  { label: "城市", value: "city" },
  { label: "最近查看", value: "recent" },
];
const anchor = ref("");

const visibleRegion = (r: Region) => !r.tags.includes("hidden");
const provinces = computed(() => appState.regions.filter((r) => r.level === "province"));

// 城市按省份拼音排序分组，右侧字母索引跳到对应省份
const cityGroups = computed(() =>
  provinces.value
    .slice()
    .sort((a, b) => a.pinyin.localeCompare(b.pinyin))
    .map((p) => ({
      code: p.code,
      name: p.name,
      letter: p.pinyin[0].toUpperCase(),
      cities: appState.regions.filter(
        (r) => r.level === "city" && visibleRegion(r) && r.parent_code === p.code
      ),
    }))
    .filter((g) => g.cities.length)
);
const letters = computed(() => {
  const seen = new Set<string>();
  return cityGroups.value
    .filter((g) => !seen.has(g.letter) && seen.add(g.letter))
    .map((g) => ({ letter: g.letter, code: g.code }));
});

const recent = computed(() =>
  userState.history.map((c) => getRegion(c)).filter((r): r is Region => !!r)
);

const searchHits = computed(() => {
  const { provinces: p, cities: c } = searchRegions(keyword.value);
  return [...p, ...c];
});

const toggle = (code: string) => toggleCompare(code).catch(() => undefined);
</script>

<style lang="scss" scoped>
.top {
  padding: 0 32rpx 16rpx;
}
.search {
  height: 72rpx;
  padding: 0 24rpx;
  margin-bottom: 16rpx;
  border-radius: 36rpx;
  background: $color-bg;
  font-size: 28rpx;
}
.list {
  padding: 0 32rpx 24rpx;
}
.group-title {
  padding: 24rpx 0 8rpx;
  font-size: 24rpx;
  color: $color-text-3;
}
.item {
  display: flex;
  align-items: center;
  height: 96rpx;
  border-bottom: 1rpx solid $color-border;
}
.name {
  font-size: 30rpx;
}
.sub {
  margin-left: 16rpx;
  font-size: 24rpx;
  color: $color-text-3;
}
.check {
  margin-left: auto;
  color: $color-primary;
  font-size: 32rpx;
}
.none {
  padding: 64rpx 0;
  text-align: center;
  color: $color-text-3;
}
.index {
  position: absolute;
  right: 8rpx;
  top: 280rpx;
  display: flex;
  flex-direction: column;
  .letter {
    padding: 4rpx 12rpx;
    font-size: 22rpx;
    color: $color-primary;
  }
}
.footer {
  padding: 16rpx 32rpx 24rpx;
  border-top: 1rpx solid $color-border;
}
</style>
