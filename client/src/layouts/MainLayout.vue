<template>
  <div class="main-layout">
    <router-view />
    <van-tabbar v-model="active" route>
      <van-tabbar-item to="/workbench" icon="home-o">工作台</van-tabbar-item>
      <van-tabbar-item to="/orders" icon="orders-o">工单</van-tabbar-item>
      <van-tabbar-item to="/customers" icon="friends-o">客户</van-tabbar-item>
      <van-tabbar-item to="/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const active = ref(0);
</script>

<style lang="scss" scoped>
.main-layout {
  min-height: 100vh;
  padding-bottom: calc(50px + constant(safe-area-inset-bottom));
  padding-bottom: calc(50px + env(safe-area-inset-bottom));
}
</style>
