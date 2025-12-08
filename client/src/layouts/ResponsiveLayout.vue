<template>
  <component :is="activeLayout" class="responsive-layout" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import MobileLayout from './MainLayout.vue';
import DesktopLayout from './DesktopLayout.vue';

const uiStore = useUiStore();

const activeLayout = computed(() =>
  uiStore.isDesktop ? DesktopLayout : MobileLayout,
);
</script>

<style scoped>
.responsive-layout {
  min-height: 100vh;
}
</style>
