<!-- 城市榜范围选择（原型 P02-B）：全国 / 按省份 / 按分组 -->
<template>
  <view class="picker">
    <view class="trigger" @tap="open">
      <text>{{ scopeLabel(scope) }}</text>
      <text class="arrow">▾</text>
    </view>

    <BottomSheet :show="visible" title="选择范围" @close="visible = false">
      <template #top>
        <view class="tabs">
          <Segmented v-model="tab" :options="tabOptions" />
        </view>
      </template>

      <view v-if="tab === 'all'" class="grid">
        <view class="cell wide" :class="{ active: scope === 'all' }" @tap="pick('all')"
          >全国所有城市</view
        >
      </view>

      <view v-else-if="tab === 'province'" class="grid">
        <view
          v-for="p in provinces"
          :key="p.code"
          class="cell"
          :class="{ active: scope === `province:${p.code}` }"
          @tap="pick(`province:${p.code}`)"
        >
          {{ p.short_name }}
        </view>
        <view class="hint">直辖市请在「按分组 › 直辖市」查看</view>
      </view>

      <view v-else class="grid">
        <view
          v-for="g in groups"
          :key="g.tag"
          class="cell group"
          :class="{ active: scope === `tag:${g.tag}` }"
          @tap="pick(`tag:${g.tag}`)"
        >
          <text>{{ g.label }}</text>
          <text class="count">{{ g.count }}城</text>
        </view>
      </view>
    </BottomSheet>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BottomSheet from "./BottomSheet.vue";
import Segmented from "./Segmented.vue";
import { appState } from "@/store/app";
import { GROUPS, scopeLabel } from "@/utils/scope";

const props = defineProps<{ scope: string }>();
const emit = defineEmits<{ (e: "change", v: string): void }>();

const visible = ref(false);
const tab = ref("all");
const tabOptions = [
  { label: "全国", value: "all" },
  { label: "按省份", value: "province" },
  { label: "按分组", value: "group" },
];

const provinces = computed(() =>
  appState.regions.filter((r) => r.level === "province" && !r.tags.includes("municipality"))
);
const groups = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    count: appState.regions.filter((r) => r.level === "city" && r.tags.includes(g.tag)).length,
  }))
);

function open() {
  tab.value = props.scope.startsWith("province")
    ? "province"
    : props.scope.startsWith("tag")
      ? "group"
      : "all";
  visible.value = true;
}
function pick(scope: string) {
  visible.value = false;
  if (scope !== props.scope) emit("change", scope);
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
  .arrow {
    margin-left: 8rpx;
    color: $color-text-3;
  }
}
.tabs {
  padding: 0 32rpx 24rpx;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 24rpx 32rpx;
}
.cell {
  width: calc(25% - 16rpx);
  margin: 8rpx;
  height: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: $color-bg;
  font-size: 28rpx;
  &.wide {
    width: 100%;
  }
  &.group {
    height: 104rpx;
  }
  &.active {
    background: $color-primary-light;
    color: $color-primary;
    font-weight: 600;
  }
}
.count {
  font-size: 22rpx;
  color: $color-text-3;
  font-weight: 400;
}
.hint {
  width: 100%;
  padding: 16rpx 8rpx 0;
  font-size: 22rpx;
  color: $color-text-3;
}
</style>
