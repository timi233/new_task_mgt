<template>
  <div class="workbench-page">
    <van-nav-bar title="工作台" />

    <!-- 用户信息 -->
    <div class="user-card card">
      <div class="user-info">
        <van-image
          round
          width="48"
          height="48"
          :src="userStore.user?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
        />
        <div class="user-detail">
          <div class="user-name">{{ userStore.user?.name || '用户' }}</div>
          <div class="user-role">{{ roleText }}</div>
        </div>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="stats-card card">
      <van-grid :column-num="4" :border="false">
        <van-grid-item v-for="item in statsItems" :key="item.label">
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </van-grid-item>
      </van-grid>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions card">
      <div class="card-title">快捷操作</div>
      <van-grid :column-num="4" :border="false">
        <van-grid-item
          v-for="action in quickActions"
          :key="action.text"
          :icon="action.icon"
          :text="action.text"
          @click="handleAction(action)"
        />
      </van-grid>
    </div>

    <!-- 待处理工单 -->
    <div class="pending-orders card">
      <div class="card-title flex flex-between">
        <span>待处理工单</span>
        <span class="view-more" @click="router.push('/orders')">查看全部</span>
      </div>

      <van-loading v-if="loading" style="text-align: center; padding: 20px" />

      <template v-else-if="pendingList.length > 0">
        <div
          v-for="order in pendingList"
          :key="order.id"
          class="order-item"
          @click="router.push(`/order/${order.id}`)"
        >
          <div class="order-header">
            <span class="order-no">{{ order.orderNo }}</span>
            <span :class="['priority-tag', `priority-tag--${order.priority?.toLowerCase()}`]">
              {{ priorityText(order.priority) }}
            </span>
          </div>
          <div class="order-title">{{ order.description }}</div>
          <div class="order-customer">客户：{{ order.customerName }}</div>
        </div>
      </template>

      <van-empty v-else description="暂无待处理工单" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { workbenchApi } from '@/utils/api';
import {
  FunctionalRole,
  ResponsibilityRole,
  FunctionalRoleLabel,
  ResponsibilityRoleLabel,
  isAdmin,
  isTechnician,
  isSales,
} from '@/types/enums';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const workbenchData = ref<any>({});
const pendingList = ref<any[]>([]);

const roleText = computed(() => {
  if (!userStore.user) return '用户';

  const parts: string[] = [];
  if (userStore.user.functionalRole) {
    parts.push(FunctionalRoleLabel[userStore.user.functionalRole] || userStore.user.functionalRole);
  }
  if (userStore.user.responsibilityRole) {
    parts.push(ResponsibilityRoleLabel[userStore.user.responsibilityRole] || userStore.user.responsibilityRole);
  }
  return parts.length > 0 ? parts.join(' + ') : '用户';
});

const statsItems = computed(() => {
  const stats = workbenchData.value.statistics || {};
  const user = userStore.user;

  if (isTechnician(user)) {
    return [
      { label: '待接单', value: stats.pendingOrders || 0 },
      { label: '服务中', value: stats.inServiceOrders || 0 },
      { label: '今日完成', value: stats.todayCompleted || 0 },
      { label: '本月完成', value: stats.monthCompleted || 0 },
    ];
  } else if (isSales(user)) {
    return [
      { label: '我的工单', value: stats.myOrders || 0 },
      { label: '待评价', value: stats.pendingEvaluation || 0 },
      { label: '今日创建', value: stats.todayCreated || 0 },
      { label: '本月创建', value: stats.monthCreated || 0 },
    ];
  } else {
    // 管理员、审计等其他角色
    return [
      { label: '总工单', value: stats.totalOrders || 0 },
      { label: '待处理', value: stats.pendingOrders || 0 },
      { label: '服务中', value: stats.inServiceOrders || 0 },
      { label: '已完成', value: stats.completedOrders || 0 },
    ];
  }
});

const quickActions = computed(() => {
  const user = userStore.user;
  const actions = [];

  // 技术员和销售可以创建工单和客户
  if (isTechnician(user) || isSales(user)) {
    actions.push({ icon: 'plus', text: '创建工单', route: '/order/create' });
    actions.push({ icon: 'friends-o', text: '新建客户', route: '/customer/create' });
  }

  // 技术员、销售、管理员、审计可以查看工单列表
  if (
    isTechnician(user) ||
    isSales(user) ||
    isAdmin(user) ||
    user?.responsibilityRole === ResponsibilityRole.AUDITOR
  ) {
    actions.push({ icon: 'orders-o', text: '工单列表', route: '/orders' });
  }

  actions.push({ icon: 'search', text: '知识库', route: '/knowledge' });

  // 管理员和审计可以查看数据统计
  if (
    isAdmin(user) ||
    user?.responsibilityRole === ResponsibilityRole.AUDITOR
  ) {
    actions.push({ icon: 'chart-trending-o', text: '数据统计', route: '/statistics' });
  }

  return actions.slice(0, 4);
});

const priorityText = (priority: string) => {
  const map: Record<string, string> = {
    URGENT: '紧急',
    HIGH: '高',
    NORMAL: '普通',
    LOW: '低',
  };
  return map[priority] || priority;
};

const handleAction = (action: any) => {
  if (action.route) {
    router.push(action.route);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await workbenchApi.data();
    workbenchData.value = res.data.data;
    pendingList.value = res.data.data.pendingList || res.data.data.pendingEvaluationList || [];
  } catch (error) {
    console.error('获取工作台数据失败', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.workbench-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.user-card {
  margin-top: 0;
  border-radius: 0 0 16px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;

  .user-info {
    display: flex;
    align-items: center;
    padding: 8px 0;
  }

  .user-detail {
    margin-left: 12px;
  }

  .user-name {
    font-size: 18px;
    font-weight: 500;
  }

  .user-role {
    font-size: 12px;
    opacity: 0.8;
    margin-top: 4px;
  }
}

.stats-card {
  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: var(--primary-color);
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-color-2);
    margin-top: 4px;
  }
}

.quick-actions {
  :deep(.van-grid-item__content) {
    padding: 12px 8px;
  }

  :deep(.van-grid-item__icon) {
    font-size: 24px;
    color: var(--primary-color);
  }

  :deep(.van-grid-item__text) {
    font-size: 12px;
    margin-top: 8px;
  }
}

.pending-orders {
  .view-more {
    font-size: 12px;
    color: var(--primary-color);
  }

  .order-item {
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);

    &:last-child {
      border-bottom: none;
    }
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .order-no {
    font-size: 12px;
    color: var(--text-color-2);
  }

  .order-title {
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .order-customer {
    font-size: 13px;
    color: var(--text-color-2);
  }
}
</style>
