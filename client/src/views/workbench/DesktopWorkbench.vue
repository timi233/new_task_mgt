<template>
  <div class="desktop-page desktop-workbench">
    <el-card class="user-card" shadow="never">
      <div class="user-card__content">
        <div class="user-meta">
          <el-avatar :size="64" :src="user?.avatar">{{ initials }}</el-avatar>
          <div class="user-detail">
            <div class="user-name">{{ user?.name || '用户' }}</div>
            <div class="user-role">{{ roleText }}</div>
          </div>
        </div>
        <div class="user-summary">
          <div class="summary-text">
            今日还有
            <strong>{{ summaryPending }}</strong>
            条待处理工单
          </div>
          <el-button type="primary" @click="router.push('/orders')">前往工单池</el-button>
        </div>
      </div>
      <div class="user-actions">
        <el-tag size="small" type="info">{{ roleText }}</el-tag>
        <div class="action-group">
          <el-button
            v-for="action in quickActions"
            :key="action.text"
            size="large"
            type="primary"
            plain
            @click="handleAction(action)"
          >
            {{ action.text }}
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="kpi-row">
      <el-card
        v-for="item in statsItems"
        :key="item.label"
        shadow="hover"
        class="kpi-card"
        @click="handleKpiClick(item)"
      >
        <div class="kpi-card__label">{{ item.label }}</div>
        <div class="kpi-card__value">
          {{ item.value }}
        </div>
        <div class="kpi-card__hint">{{ item.hint || '点击查看明细' }}</div>
      </el-card>
    </div>

    <el-row :gutter="16">
      <el-col :md="14" :sm="24">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <div>
                <span>待处理工单</span>
                <span class="panel-subtitle">按优先级排序</span>
              </div>
              <el-button text size="small" @click="router.push('/orders')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-table
            :data="pendingList"
            v-loading="loading"
            height="320px"
            stripe
            highlight-current-row
          >
            <el-table-column prop="orderNo" label="工单编号" min-width="160" />
            <el-table-column prop="customerName" label="客户" min-width="140" show-overflow-tooltip />
            <el-table-column prop="priority" label="优先级" width="120" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="priorityTag(row.priority)">
                  {{ priorityText(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" show-overflow-tooltip />
            <el-table-column width="120" label="操作" align="right">
              <template #default="{ row }">
                <el-button text size="small" @click="router.push(`/order/${row.id}`)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!loading && pendingList.length === 0"
            description="暂无待处理工单"
          >
            <el-button type="primary" size="small" @click="router.push('/order/create')">新建工单</el-button>
          </el-empty>
        </el-card>
      </el-col>
      <el-col :md="10" :sm="24">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span>工单状态分布</span>
              <el-button text size="small" @click="router.push('/statistics')">查看报表</el-button>
            </div>
          </template>
          <v-chart v-if="hasProcessingOrders" class="chart-panel" :option="statusChartOption" autoresize />
          <el-empty v-else description="暂无处理中数据" :image-size="160" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

interface QuickAction {
  text: string;
  route: string;
}

interface StatsCard {
  label: string;
  value: number | string;
  hint?: string;
  delta?: number;
  route?: string;
  query?: Record<string, any>;
}

const props = defineProps<{
  user: any;
  roleText: string;
  statsItems: StatsCard[];
  quickActions: QuickAction[];
  pendingList: any[];
  loading: boolean;
  statistics?: Record<string, number>;
}>();

const router = useRouter();

const initials = computed(() => (props.user?.name ? props.user.name.slice(0, 1) : 'U'));
const summaryPending = computed(() => props.statistics?.pendingOrders || props.statsItems?.[0]?.value || 0);

const hasProcessingOrders = computed(() => {
  const stats = props.statistics || {};
  return (stats.pendingOrders || 0) + (stats.acceptedOrders || 0) + (stats.inServiceOrders || 0) > 0;
});

const priorityText = (priority: string) => {
  const map: Record<string, string> = {
    URGENT: '紧急',
    VERY_URGENT: '非常紧急',
    NORMAL: '普通',
    HIGH: '高',
    LOW: '低',
  };
  return map[priority] || priority;
};

const priorityTag = (priority: string) => {
  switch (priority) {
    case 'VERY_URGENT':
      return 'danger';
    case 'URGENT':
    case 'HIGH':
      return 'warning';
    default:
      return 'success';
  }
};

const handleAction = (action: QuickAction) => {
  if (action.route) {
    router.push(action.route);
  }
};

const handleKpiClick = (card: StatsCard) => {
  if (!card.route && !card.query) return;
  router.push({
    path: card.route || '/orders',
    query: card.query,
  });
};

const statusChartOption = computed(() => {
  const stats = props.statistics || {};
  const data = [
    { value: stats.pendingOrders || 0, name: '待接单' },
    { value: stats.acceptedOrders || 0, name: '待服务' },
    { value: stats.inServiceOrders || 0, name: '服务中' },
  ].filter(item => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: 0,
      icon: 'circle',
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '70%'],
        data,
        label: {
          formatter: '{b}: {d}%',
        },
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '48%',
        style: {
          text: `总数\n${total}`,
          textAlign: 'center',
          fill: '#1f2937',
          fontSize: 16,
          fontWeight: 600,
        },
      },
    ],
  };
});
</script>

<style scoped>
.desktop-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card__content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-detail .user-name {
  font-size: 18px;
  font-weight: 600;
}

.user-detail .user-role {
  color: #909399;
  margin-top: 4px;
}

.user-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(37, 99, 235, 0.06);
  padding: 12px 20px;
  border-radius: 12px;
}

.summary-text {
  font-size: 14px;
  color: var(--text-color-2);
}

.summary-text strong {
  color: var(--primary-color);
  font-size: 22px;
  margin: 0 4px;
}

.user-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-group .el-button {
  min-width: 140px;
}

@media (max-width: 1024px) {
  .user-card__content {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-group {
    justify-content: flex-start;
  }
}

.kpi-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
}

.kpi-card {
  flex: 1;
  min-width: 180px;
  cursor: pointer;
  border: none;
}

@media (max-width: 1400px) {
  .kpi-card {
    flex: 1 1 calc(33.333% - 11px);
  }
}

@media (max-width: 992px) {
  .kpi-card {
    flex: 1 1 calc(50% - 8px);
  }
}

.kpi-card__label {
  font-size: 13px;
  color: var(--text-color-2);
  margin-bottom: 8px;
}

.kpi-card__value {
  font-size: 32px;
  font-weight: 600;
}

.kpi-card__hint {
  font-size: 12px;
  color: var(--text-color-2);
  margin-top: 8px;
}

.panel-card {
  min-height: 360px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-subtitle {
  font-size: 12px;
  color: var(--text-color-2);
  margin-left: 8px;
}

.chart-panel {
  width: 100%;
  height: 320px;
}
</style>
