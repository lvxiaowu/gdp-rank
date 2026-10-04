<!-- 广告位：云端开关关闭或加载失败时整块不渲染，不留空白 -->
<template>
  <!-- #ifdef MP-WEIXIN -->
  <view v-if="unit && !failed" class="ad">
    <ad-custom v-if="type === 'custom'" :unit-id="unit" @error="failed = true" />
    <ad v-else :unit-id="unit" @error="failed = true" />
  </view>
  <!-- #endif -->
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { adUnit } from "@/utils/ads";

const props = withDefaults(defineProps<{ slotId: string; type?: "custom" | "banner" }>(), {
  type: "custom",
});
const failed = ref(false);
const unit = computed(() => adUnit(props.slotId));
</script>

<style lang="scss" scoped>
.ad {
  margin-bottom: 24rpx;
  border-radius: $radius-card;
  overflow: hidden;
}
</style>
