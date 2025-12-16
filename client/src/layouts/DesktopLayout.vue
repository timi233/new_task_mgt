<template>
  <div class="desktop-layout" :class="{ 'desktop-layout--collapsed': isCollapsed }">
    <aside class="desktop-sidebar">
      <div class="desktop-sidebar__brand" @click="goHome">
        <span class="desktop-sidebar__logo">IT</span>
        <div class="desktop-sidebar__info">
          <div class="title">IT服务派工</div>
          <div class="subtitle">Desktop Console</div>
        </div>
      </div>
      <el-menu
        class="desktop-menu"
        :default-active="activeMenu"
        :collapse="isCollapsed"
        router
        background-color="transparent"
      >
        <el-menu-item
          v-for="item in visibleMenus"
          :key="item.path"
          :index="item.path"
          @click="handleNavigate(item.path)"
        >
          <el-icon v-if="item.icon">
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
      <div class="desktop-sidebar__collapse" @click="isCollapsed = !isCollapsed">
        <el-icon>
          <component :is="isCollapsed ? Expand : Fold" />
        </el-icon>
      </div>
    </aside>

    <section class="desktop-main">
      <header class="desktop-header">
        <div class="desktop-header__left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              <router-link v-if="item.path" :to="item.path">{{ item.title }}</router-link>
              <span v-else>{{ item.title }}</span>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="desktop-header__right">
          <el-dropdown>
            <span class="user-entry">
              <el-tag size="small" type="info">
                {{ userStore.user?.name || '未登录' }}
              </el-tag>
              <el-icon>
                <ArrowDown />
              </el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goHome">返回工作台</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="desktop-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  House,
  List,
  User,
  Collection,
  DataAnalysis,
  Tickets,
  Fold,
  Expand,
  Setting,
  Calendar,
  ArrowDown,
  Share,
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { isAdmin, isSystemAdmin, isSales, isTechnician } from '@/types/enums';

interface MenuItem {
  path: string;
  label: string;
  icon?: any;
  requiresAdmin?: boolean;
  requiresSystemAdmin?: boolean;
}

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const isCollapsed = ref(false);

const menus: MenuItem[] = [
  { path: '/workbench', label: '工作台', icon: House },
  { path: '/orders', label: '工单管理', icon: Tickets },
  { path: '/manufacturer-orders', label: '厂家派工', icon: List },
  { path: '/customers', label: '客户管理', icon: User },
  { path: '/channels', label: '渠道管理', icon: Share },
  { path: '/users', label: '人员管理', icon: Setting, requiresSystemAdmin: true },
  { path: '/schedule', label: '派工总览', icon: Calendar, requiresAdmin: true },
  { path: '/statistics', label: '统计报表', icon: DataAnalysis },
  { path: '/knowledge', label: '知识库', icon: Collection },
];

const visibleMenus = computed(() => {
  return menus.filter(item => {
    if (item.path === '/statistics') {
      return (
        isAdmin(userStore.user) ||
        isTechnician(userStore.user) ||
        isSales(userStore.user)
      );
    }
    if (item.requiresSystemAdmin) {
      return isSystemAdmin(userStore.user);
    }
    if (item.requiresAdmin) {
      return isAdmin(userStore.user) || isSystemAdmin(userStore.user);
    }
    return true;
  });
});

const activeMenu = computed(() => {
  const matched = visibleMenus.value.find(item => route.path.startsWith(item.path));
  return matched?.path || route.path;
});

const breadcrumbs = computed(() => {
  const items = route.matched
    .filter(record => record.meta?.title && record.path !== '/')
    .map(record => ({
      title: record.meta?.title as string,
      path: record.path.startsWith('/') ? record.path : `/${record.path}`,
    }));

  return items;
});

const handleNavigate = (path: string) => {
  if (route.path === path) return;
  router.push(path);
};

const goHome = () => {
  router.push('/workbench');
};

const handleLogout = async () => {
  await userStore.logout();
  router.replace('/login');
};
</script>

<style scoped>
.desktop-layout {
  display: flex;
  min-height: 100vh;
  background: var(--desktop-page-bg);
  color: #303133;
}

.desktop-sidebar {
  width: var(--desktop-sidebar-width);
  background: #1f2430;
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
}

.desktop-layout--collapsed .desktop-sidebar {
  width: var(--desktop-sidebar-collapsed-width);
}

.desktop-sidebar__brand {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
}

.desktop-sidebar__logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
}

.desktop-sidebar__info .title {
  font-size: 16px;
  font-weight: 600;
}

.desktop-sidebar__info .subtitle {
  font-size: 12px;
  opacity: 0.7;
}

.desktop-menu {
  flex: 1;
  border-right: none;
  background: transparent;
}

.desktop-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  margin: 4px 12px;
}

.desktop-menu :deep(.el-menu-item:hover) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.desktop-menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.desktop-menu :deep(.el-menu-item .el-icon) {
  color: inherit;
}

.desktop-sidebar__collapse {
  padding: 12px 0;
  text-align: center;
  cursor: pointer;
  color: #cfd3dc;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.desktop-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--desktop-page-bg);
  min-width: 0;
  overflow-x: hidden;
}

.desktop-header {
  height: var(--desktop-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #fff;
  box-shadow: var(--desktop-shadow);
  position: sticky;
  top: 0;
  z-index: 10;
}

.desktop-content {
  padding: 24px;
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
}

.desktop-content > :deep(*) {
  background: transparent;
}

.desktop-header__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #606266;
}
</style>
