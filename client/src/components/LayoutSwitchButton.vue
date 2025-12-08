<template>
  <div class="layout-switch" v-if="showButton">
    <el-button size="small" type="primary" plain @click="handleToggle">
      {{ toggleText }}
    </el-button>
    <el-button
      v-if="uiStore.manualOverride"
      size="small"
      text
      @click="handleFollowDevice"
    >
      跟随设备
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';

const uiStore = useUiStore();

const toggleText = computed(() =>
  uiStore.isDesktop ? '切换到移动端' : '切换到桌面端',
);

const showButton = computed(() => true);

const handleToggle = () => {
  uiStore.toggleMode();
};

const handleFollowDevice = () => {
  uiStore.enableAutoMode();
};
</script>

<style scoped>
.layout-switch {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
  z-index: 2000;
}

@media (max-width: 768px) {
  .layout-switch {
    right: 12px;
    bottom: 12px;
    flex-direction: column;
    align-items: flex-end;
  }
}
</style>
