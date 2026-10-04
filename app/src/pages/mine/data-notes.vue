<!-- P08 数据说明 -->
<template>
  <view class="page">
    <view class="card">
      <view class="card-title"><text>指标口径</text></view>
      <view v-for="item in metrics" :key="item.name" class="def">
        <text class="def-name">{{ item.name }}</text>
        <text class="def-text">{{ item.text }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title"><text>季度数据</text></view>
      <text class="p"
        >本小程序的季度数据均为累计值：「一季度」为 1~3 月，「上半年」为 1~6 月，「前三季度」为 1~9
        月，「全年」为 1~12 月合计。增速与上年同期累计值比较。</text
      >
    </view>

    <view class="card">
      <view class="card-title"><text>数据修订</text></view>
      <text class="p"
        >统计部门会在次年对上年数据进行修订。计算增长量和名义增速时，上年同期使用修订后的数值，因此可能与当时公布的增速略有不同。</text
      >
    </view>

    <view class="card">
      <view class="card-title"><text>发布时间</text></view>
      <view v-for="r in releases" :key="r.period" class="release">
        <text class="r-period">{{ r.period }}</text>
        <text class="r-time">{{ r.time }}</text>
      </view>
      <text class="p muted">各省、各市发布时间不同，数据会在发布后陆续更新。</text>
    </view>

    <view class="card">
      <view class="card-title"><text>数据来源与声明</text></view>
      <text class="p"
        >数据整理自国家统计局及各省、市统计部门公开发布的资料。如有出入，以统计部门正式发布为准。发现数据错误，欢迎通过「我的
        › 意见反馈」告诉我们。</text
      >
    </view>
  </view>
</template>

<script setup lang="ts">
const metrics = [
  { name: "GDP 总量", text: "地区生产总值，按当年价格计算，单位亿元。" },
  { name: "增长量", text: "本期总量减去上年同期总量。" },
  { name: "名义增速", text: "增长量 ÷ 上年同期总量，包含价格变动因素。" },
  { name: "实际增速", text: "统计部门公布的、扣除价格因素后的增速。未公布时显示「—」，不做推算。" },
  { name: "排名", text: "同期、同层级按总量从高到低排序，总量相同名次并列。" },
  { name: "名次变化", text: "与上年同期名次相比，↑ 表示上升。" },
  { name: "占比", text: "省份占全国、城市占所在省份 GDP 的比重。" },
];
const releases = [
  { period: "一季度", time: "4 月中旬 ~ 5 月" },
  { period: "上半年", time: "7 月中旬 ~ 8 月" },
  { period: "前三季度", time: "10 月中旬 ~ 11 月" },
  { period: "全年", time: "次年 1 月中旬 ~ 2 月" },
];
</script>

<style lang="scss" scoped>
.def {
  display: flex;
  padding: 12rpx 0;
  font-size: 26rpx;
  line-height: 1.6;
}
.def-name {
  width: 150rpx;
  flex-shrink: 0;
  font-weight: 600;
}
.def-text {
  flex: 1;
  color: $color-text-2;
}
.p {
  display: block;
  font-size: 26rpx;
  line-height: 1.7;
  color: $color-text-2;
}
.release {
  display: flex;
  justify-content: space-between;
  height: 72rpx;
  align-items: center;
  border-bottom: 1rpx solid $color-border;
  font-size: 26rpx;
}
.r-time {
  color: $color-text-2;
}
.muted {
  margin-top: 16rpx;
  color: $color-text-3;
}
</style>
