<template>
  <router-view />
  <LayoutSwitchButton />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watchEffect } from 'vue';
import { useUiStore } from '@/stores/ui';
import LayoutSwitchButton from '@/components/LayoutSwitchButton.vue';

const uiStore = useUiStore();

const handleResize = () => {
  uiStore.syncWithEnvironment();
};

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

watchEffect(() => {
  document.body.classList.toggle('desktop-mode', uiStore.isDesktop);
});
</script>
