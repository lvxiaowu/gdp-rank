<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { boot } from "@/store/app";
import { loadUser } from "@/store/user";
import { markFirstOpen } from "@/utils/ads";

onLaunch(() => {
  markFirstOpen();
  // 启动即拉取配置、期次、地区字典和用户数据；各页面自己 await boot()，失败时在页面上重试
  boot().catch(() => undefined);
  loadUser();
});
</script>

<style lang="scss">
@import "@/styles/common.scss";
</style>
