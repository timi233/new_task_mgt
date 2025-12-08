<template>
  <div v-if="isDesktop" class="desktop-page statistics-desktop">
    <el-tabs v-model="activeScope" class="statistics-scope-tabs" stretch>
      <el-tab-pane label="我的数据" name="my" />
      <el-tab-pane v-if="canSeeOverview" label="总览数据" name="overview" />
    </el-tabs>
    <el-skeleton v-if="loading" :loading="loading" animated style="margin-top: 16px" />
    <template v-else>
      <el-row :gutter="16" class="overview-row">
        <el-col :md="6" :sm="12" v-for="card in desktopOverview" :key="card.label">
          <el-card shadow="hover" class="overview-card" @click="handleOverviewClick(card)">
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__hint">{{ card.hint || '点击查看明细' }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="stats-row">
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>工单状态分布</template>
            <div class="chart-with-total">
              <v-chart class="chart" :option="orderStatusOption" autoresize />
              <div class="chart-total" v-if="orderStatusTotal">
                <div class="chart-total__label">总工单</div>
                <div class="chart-total__value">{{ orderStatusTotal }}</div>
              </div>
            </div>
            <el-table :data="orderStatus" size="small" stripe>
              <el-table-column prop="label" label="状态" />
              <el-table-column prop="count" label="数量" width="120" />
            </el-table>
          </el-card>
        </el-col>
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>技术人员工作量</template>
            <v-chart class="chart" :option="workloadChartOption" autoresize />
            <el-table :data="technicianWorkload" size="small" stripe>
              <el-table-column prop="name" label="工程师" />
              <el-table-column prop="orderCount" label="工单" width="120" />
              <el-table-column prop="totalHours" label="工时" width="120" />
            </el-table>
            <el-empty v-if="technicianWorkload.length === 0" description="暂无数据" />
          </el-card>
        </el-col>
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>服务评价</template>
            <div class="evaluation-grid">
              <div class="evaluation-item">
                <div class="stat-value">{{ evaluationStats.totalEvaluations }}</div>
                <div class="stat-label">总评价数</div>
              </div>
              <div class="evaluation-item">
                <div class="stat-value">{{ evaluationStats.avgQualityRating }}</div>
                <div class="stat-label">质量评分</div>
              </div>
              <div class="evaluation-item">
                <div class="stat-value">{{ evaluationStats.recommendRate }}%</div>
                <div class="stat-label">推荐率</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
  <div v-else class="statistics-page">
    <van-nav-bar title="数据统计" left-arrow @click-left="router.back()" />
    <van-tabs v-model="activeScope" class="statistics-mobile-tabs">
      <van-tab title="我的数据" name="my" />
      <van-tab v-if="canSeeOverview" title="总览数据" name="overview" />
    </van-tabs>

    <van-loading v-if="loading" style="text-align: center; padding: 40px" />

    <template v-else>
      <div class="overview-card card">
        <div class="card-title">数据概览</div>
        <van-grid :column-num="4" :border="false">
          <van-grid-item>
            <div class="stat-value">{{ overview.totalOrders }}</div>
            <div class="stat-label">总工单</div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-value">{{ overview.completedOrders }}</div>
            <div class="stat-label">已完成</div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-value">{{ overview.completionRate }}%</div>
            <div class="stat-label">完成率</div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-value">{{ overview.totalHours }}</div>
            <div class="stat-label">总工时</div>
          </van-grid-item>
        </van-grid>
      </div>

      <div class="status-card card">
        <div class="card-title">工单状态分布</div>
        <div class="status-list">
          <div v-for="item in orderStatus" :key="item.status" class="status-item">
            <span class="status-label">{{ item.label }}</span>
            <span class="status-count">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <div class="workload-card card">
        <div class="card-title">技术人员工作量</div>
        <div v-for="tech in technicianWorkload" :key="tech.id" class="workload-item">
          <div class="tech-name">{{ tech.name }}</div>
          <div class="tech-stats">
            <span>工单: {{ tech.orderCount }}</span>
            <span>工时: {{ tech.totalHours }}</span>
          </div>
        </div>
        <van-empty v-if="technicianWorkload.length === 0" description="暂无数据" />
      </div>

      <div class="evaluation-card card">
        <div class="card-title">服务评价</div>
        <van-grid :column-num="3" :border="false">
          <van-grid-item>
            <div class="stat-value">{{ evaluationStats.totalEvaluations }}</div>
            <div class="stat-label">总评价数</div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-value">{{ evaluationStats.avgQualityRating }}</div>
            <div class="stat-label">质量评分</div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-value">{{ evaluationStats.recommendRate }}%</div>
            <div class="stat-label">推荐率</div>
          </van-grid-item>
        </van-grid>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { statisticsApi } from '@/utils/api';
import { useUiStore } from '@/stores/ui';
import { useUserStore } from '@/stores/user';
import { isAdmin, isSales, isTechnician } from '@/types/enums';

type Scope = 'my' | 'overview';

const router = useRouter();
const uiStore = useUiStore();
const userStore = useUserStore();

const loading = ref(true);
const overview = ref<any>({});
const orderStatus = ref<any[]>([]);
const technicianWorkload = ref<any[]>([]);
const evaluationStats = ref<any>({});
const isDesktop = computed(() => uiStore.isDesktop);

const canSeeOverview = computed(() => isAdmin(userStore.user));
const isTechnicianRole = computed(() => isTechnician(userStore.user));
const isSalesRole = computed(() => isSales(userStore.user));

const defaultScope = computed<Scope>(() => {
  if (isTechnicianRole.value || isSalesRole.value) {
    return 'my';
  }
  if (canSeeOverview.value) {
    return 'overview';
  }
  return 'my';
});

const activeScope = ref<Scope>(defaultScope.value);
watch(defaultScope, newScope => {
  if (activeScope.value !== newScope) {
    activeScope.value = newScope;
  }
});

const fetchData = async () => {
  loading.value = true;
  try {
    const params = { scope: activeScope.value };
    const [overviewRes, statusRes, workloadRes, evaluationRes] = await Promise.all([
      statisticsApi.overview(params),
      statisticsApi.orderStatus(params),
      statisticsApi.technicianWorkload(params),
      statisticsApi.evaluation(params),
    ]);

    overview.value = overviewRes.data.data;
    orderStatus.value = statusRes.data.data;
    technicianWorkload.value = workloadRes.data.data;
    evaluationStats.value = evaluationRes.data.data;
  } catch (error) {
    console.error('获取统计数据失败', error);
  } finally {
    loading.value = false;
  }
};

watch(
  activeScope,
  () => {
    fetchData();
  },
  { immediate: true },
);

const desktopOverview = computed(() => [
  {
    label: '总工单',
    value: overview.value.totalOrders || 0,
    hint: '全部工单',
    route: '/orders',
  },
  {
    label: '已完成',
    value: overview.value.completedOrders || 0,
    hint: '累计结单',
    route: '/orders',
    query: { status: 'DONE' },
  },
  {
    label: '完成率',
    value: `${overview.value.completionRate || 0}%`,
    hint: '完成/总工单',
    route: '/orders',
    query: { status: 'DONE' },
  },
  {
    label: '总工时',
    value: overview.value.totalHours || 0,
    hint: '累计工时',
    route: '/statistics',
  },
]);

const orderStatusTotal = computed(() =>
  (orderStatus.value || []).reduce((sum: number, item: any) => sum + (item.count || 0), 0),
);

const orderStatusOption = computed(() => {
  const data = (orderStatus.value || []).map((item: any) => ({
    value: item.count,
    name: item.label,
  }));

  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle' },
    series: [
      {
        type: 'pie',
        radius: ['50%', '70%'],
        data,
        label: { formatter: '{b}: {d}%' },
      },
    ],
  };
});

const workloadChartOption = computed(() => {
  const names = (technicianWorkload.value || []).map((item: any) => item.name);
  const orders = (technicianWorkload.value || []).map((item: any) => item.orderCount);
  const hours = (technicianWorkload.value || []).map((item: any) => item.totalHours);

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['工单数', '工时'], bottom: 0 },
    grid: { left: 60, right: 40, top: 30, bottom: 80 },
    xAxis: { type: 'category', data: names },
    yAxis: [
      { type: 'value', name: '工单数', min: 0 },
      { type: 'value', name: '工时', min: 0 },
    ],
    series: [
      { name: '工单数', type: 'bar', data: orders, barWidth: 24, itemStyle: { borderRadius: 6 } },
      { name: '工时', type: 'line', data: hours, smooth: true, yAxisIndex: 1 },
    ],
  };
});

const handleOverviewClick = (card: any) => {
  if (!card?.route) return;
  router.push({
    path: card.route,
    query: card.query,
  });
};
</script>

<style lang="scss" scoped>
.statistics-desktop {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.statistics-scope-tabs {
  margin-bottom: 8px;
}

.overview-row {
  margin-top: 16px;
}

.overview-card {
  cursor: pointer;
  border: none;
  transition: transform 0.2s;
}

.overview-card:hover {
  transform: translateY(-2px);
}

.overview-card__label {
  font-size: 13px;
  color: var(--text-color-2);
  margin-bottom: 6px;
}

.overview-card__value {
  font-size: 28px;
  font-weight: 600;
}

.overview-card__hint {
  font-size: 12px;
  color: var(--text-color-3);
  margin-top: 4px;
}

.stats-row {
  margin-top: 16px;
}

.evaluation-grid {
  display: flex;
  justify-content: space-around;
  text-align: center;
  gap: 16px;

  .evaluation-item {
    flex: 1;
  }
}

.chart {
  width: 100%;
  height: 320px;
}

.chart-with-total {
  position: relative;
}

.chart-total {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.chart-total__label {
  font-size: 12px;
  color: var(--text-color-2, #909399);
}

.chart-total__value {
  font-size: 24px;
  font-weight: 600;
  color: #1f2329;
}

.statistics-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.statistics-mobile-tabs {
  background: #fff;
  margin: 12px;
  border-radius: 8px;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 12px;

  .card-title {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 12px;
  }
}

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

.status-list {
  .status-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);

    &:last-child {
      border-bottom: none;
    }
  }

  .status-label {
    color: var(--text-color);
  }

  .status-count {
    color: var(--text-color-2);
  }
}

.workload-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }

  .tech-name {
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .tech-stats {
    font-size: 13px;
    color: var(--text-color-2);

    span {
      margin-right: 16px;
    }
  }
}
</style>
