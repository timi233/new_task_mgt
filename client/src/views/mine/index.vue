<template>
  <div class="mine-page">
    <van-nav-bar title="我的" />

    <!-- 用户信息 -->
    <div class="user-card">
      <van-image
        round
        width="60"
        height="60"
        :src="userStore.user?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
      />
      <div class="user-info">
        <div class="user-name">{{ userStore.user?.name || '用户' }}</div>
        <div class="user-role">{{ roleText }}</div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <van-cell-group>
      <van-cell title="知识库" icon="search" is-link to="/knowledge" />
      <van-cell
        v-if="isAdmin"
        title="数据统计"
        icon="chart-trending-o"
        is-link
        to="/statistics"
      />
      <van-cell
        v-if="isSystemAdmin"
        title="人员管理"
        icon="friends-o"
        is-link
        to="/users"
      />
      <van-cell
        v-if="canViewManufacturer"
        title="厂家派单"
        icon="shop-o"
        is-link
        to="/manufacturer-orders"
      />
    </van-cell-group>

    <van-cell-group style="margin-top: 12px">
      <van-cell title="个人信息" icon="user-o" is-link @click="showProfile = true" />
      <van-cell title="关于系统" icon="info-o" is-link @click="showAbout = true" />
    </van-cell-group>

    <div style="margin: 24px 16px">
      <van-button type="default" block @click="handleLogout">退出登录</van-button>
    </div>

    <!-- 个人信息弹窗 -->
    <van-popup v-model:show="showProfile" position="bottom" round style="height: 60%">
      <div class="profile-popup">
        <div class="popup-title">个人信息</div>
        <van-cell-group>
          <van-cell title="姓名" :value="userStore.user?.name" />
          <van-cell
            title="功能权限"
            :value="userStore.user?.functionalRole ? FunctionalRoleLabel[userStore.user.functionalRole] : '无'"
          />
          <van-cell
            title="职责权限"
            :value="userStore.user?.responsibilityRole ? ResponsibilityRoleLabel[userStore.user.responsibilityRole] : '无'"
          />
          <van-cell title="手机" :value="userStore.user?.phone || '-'" />
          <van-cell title="邮箱" :value="userStore.user?.email || '-'" />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 关于系统弹窗 -->
    <van-popup v-model:show="showAbout" position="bottom" round style="height: 40%">
      <div class="about-popup">
        <div class="popup-title">关于系统</div>
        <div class="about-content">
          <p class="app-name">IT服务派工系统</p>
          <p class="app-version">版本 1.0.0</p>
          <p class="app-desc">高效、便捷的工单管理平台，助力IT服务团队提升工作效率。</p>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import { useUserStore } from '@/stores/user';
import {
  FunctionalRole,
  ResponsibilityRole,
  FunctionalRoleLabel,
  ResponsibilityRoleLabel,
  isSystemAdmin as checkSystemAdmin,
  isAdmin as checkAdmin,
} from '@/types/enums';

const router = useRouter();
const userStore = useUserStore();

const showProfile = ref(false);
const showAbout = ref(false);

const roleText = computed(() => {
  if (!userStore.user) return '未登录';

  const parts: string[] = [];
  if (userStore.user.functionalRole) {
    parts.push(FunctionalRoleLabel[userStore.user.functionalRole] || userStore.user.functionalRole);
  }
  if (userStore.user.responsibilityRole) {
    parts.push(ResponsibilityRoleLabel[userStore.user.responsibilityRole] || userStore.user.responsibilityRole);
  }
  return parts.length > 0 ? parts.join(' + ') : '无权限';
});

const isSystemAdmin = computed(() => {
  return checkSystemAdmin(userStore.user);
});

const isAdmin = computed(() => {
  return checkAdmin(userStore.user);
});

// 可查看厂家派单的角色（包括审计）
const canViewManufacturer = computed(() => {
  if (!userStore.user) return false;

  if (isAdmin.value || userStore.user.responsibilityRole === ResponsibilityRole.AUDITOR) {
    return true;
  }

  return (
    userStore.user.functionalRole === FunctionalRole.TECHNICIAN ||
    userStore.user.functionalRole === FunctionalRole.SALES
  );
});

const handleLogout = async () => {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定要退出登录吗？',
    });
    userStore.logout();
    router.replace('/login');
  } catch {
    // 取消
  }
};
</script>

<style lang="scss" scoped>
.mine-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;

  .user-info {
    margin-left: 16px;
  }

  .user-name {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .user-role {
    font-size: 14px;
    opacity: 0.8;
  }
}

.profile-popup,
.about-popup {
  padding: 16px;

  .popup-title {
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 16px;
  }
}

.about-content {
  text-align: center;
  padding: 24px 16px;

  .app-name {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .app-version {
    font-size: 14px;
    color: var(--text-color-2);
    margin-bottom: 16px;
  }

  .app-desc {
    font-size: 14px;
    color: var(--text-color-2);
    line-height: 1.6;
  }
}
</style>
