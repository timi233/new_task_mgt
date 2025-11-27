<template>
  <div class="statistics-page">
    <van-nav-bar title="数据统计" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px" />

    <template v-else>
      <!-- 概览卡片 -->
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

      <!-- 工单状态分布 -->
      <div class="status-card card">
        <div class="card-title">工单状态分布</div>
        <div class="status-list">
          <div v-for="item in orderStatus" :key="item.status" class="status-item">
            <span class="status-label">{{ item.label }}</span>
            <span class="status-count">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- 技术人员工作量 -->
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

      <!-- 评价统计 -->
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { statisticsApi } from '@/utils/api';

const router = useRouter();

const loading = ref(true);
const overview = ref<any>({});
const orderStatus = ref<any[]>([]);
const technicianWorkload = ref<any[]>([]);
const evaluationStats = ref<any>({});

const fetchData = async () => {
  loading.value = true;
  try {
    const [overviewRes, statusRes, workloadRes, evaluationRes] = await Promise.all([
      statisticsApi.overview(),
      statisticsApi.orderStatus(),
      statisticsApi.technicianWorkload(),
      statisticsApi.evaluation(),
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

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.statistics-page {
  background: #f7f8fa;
  min-height: 100vh;
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
