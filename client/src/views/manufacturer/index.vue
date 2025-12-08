<template>
  <div v-if="isDesktop" class="desktop-page manufacturer-desktop">
    <div class="desktop-header">
      <el-tabs v-model="activeTab" @tab-change="onTabChange" class="desktop-tabs">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane label="厂家外勤" name="MF" />
      <el-tab-pane label="厂家内勤" name="MO" />
    </el-tabs>
      <el-button
        type="primary"
        plain
        @click="exportManufacturer"
        :disabled="exportLoading || !orders.length"
        :loading="exportLoading"
      >
        导出 CSV
      </el-button>
    </div>
    <el-card shadow="never">
      <el-table :data="orders" v-loading="loading" @row-click="showDetail">
        <el-table-column prop="orderNo" label="派工编号" width="180" />
        <el-table-column prop="orderType" label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ orderTypeText(row.orderType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="manufacturerContact" label="厂家对接人" width="160" />
        <el-table-column prop="customerName" label="客户" />
        <el-table-column label="工程师" width="200">
          <template #default="{ row }">
            {{ getTechnicianNames(row) }}
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <el-button @click="loadMore" :loading="loading" :disabled="finished">
          {{ finished ? '没有更多了' : '加载更多' }}
        </el-button>
      </div>
      <el-empty v-if="!loading && orders.length === 0" description="暂无厂家派工" />
    </el-card>

    <el-drawer v-model="showPopup" title="派工详情" size="40%" :with-header="true">
      <div v-if="currentOrder" class="drawer-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="派工编号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="派工类型">{{ orderTypeText(currentOrder.orderType) }}</el-descriptions-item>
          <el-descriptions-item label="厂家对接人">{{ currentOrder.manufacturerContact || '-' }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customerName }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentOrder.customerContact || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentOrder.customerPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="工程师">{{ getTechnicianNames(currentOrder) }}</el-descriptions-item>
          <el-descriptions-item label="工单描述">{{ currentOrder.description }}</el-descriptions-item>
          <el-descriptions-item v-if="currentOrder.serviceSummary" label="服务小结">
            {{ currentOrder.serviceSummary }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(currentOrder.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentOrder.completedAt" label="完成时间">
            {{ formatDate(currentOrder.completedAt) }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="drawer-footer">
          <el-button type="primary" @click="viewDetail">查看完整详情</el-button>
        </div>
      </div>
    </el-drawer>
  </div>

  <div v-else class="manufacturer-page">
    <!-- 类型筛选 -->
    <van-tabs v-model:active="activeTab" @change="onTabChange" sticky>
      <van-tab title="全部" name="" />
      <van-tab title="厂家外勤" name="MF" />
      <van-tab title="厂家内勤" name="MO" />
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <div
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="showDetail(order)"
        >
          <div class="order-header">
            <span class="order-no">{{ order.orderNo }}</span>
            <span :class="['status-tag', `status-tag--${order.status.toLowerCase()}`]">
              {{ statusText(order.status) }}
            </span>
          </div>

          <div class="order-type-tag">
            {{ orderTypeText(order.orderType) }}
          </div>

          <div class="order-info">
            <div class="info-row">
              <span class="label">厂家对接人：</span>
              <span>{{ order.manufacturerContact || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">客户：</span>
              <span>{{ order.customerName }}</span>
            </div>
            <div class="info-row">
              <span class="label">技术人员：</span>
              <span>{{ getTechnicianNames(order) }}</span>
            </div>
            <div class="info-row">
              <span class="label">提交时间：</span>
              <span>{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>
        </div>

        <van-empty v-if="!loading && orders.length === 0" description="暂无厂家派单" />
      </van-list>
    </van-pull-refresh>

    <!-- 详情弹窗 -->
    <van-popup v-model:show="showPopup" position="bottom" round style="max-height: 80%">
      <div class="detail-popup" v-if="currentOrder">
        <div class="popup-title">派单详情</div>
        <van-cell-group>
          <van-cell title="派单编号" :value="currentOrder.orderNo" />
          <van-cell title="派单类型" :value="orderTypeText(currentOrder.orderType)" />
          <van-cell title="厂家对接人" :value="currentOrder.manufacturerContact || '-'" />
          <van-cell title="客户" :value="currentOrder.customerName" />
          <van-cell title="联系人" :value="currentOrder.customerContact || '-'" />
          <van-cell title="联系电话" :value="currentOrder.customerPhone || '-'" />
          <van-cell title="技术人员" :value="getTechnicianNames(currentOrder)" />
          <van-cell title="工单描述" :label="currentOrder.description" />
          <van-cell v-if="currentOrder.serviceSummary" title="服务小结" :label="currentOrder.serviceSummary" />
          <van-cell title="提交时间" :value="formatDate(currentOrder.createdAt)" />
          <van-cell v-if="currentOrder.completedAt" title="完成时间" :value="formatDate(currentOrder.completedAt)" />
        </van-cell-group>

        <div style="padding: 16px">
          <van-button type="primary" block @click="viewDetail">查看完整详情</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { workOrderApi } from '@/utils/api';
import { OrderStatus, OrderType } from '@/types/enums';
import dayjs from 'dayjs';
import { useUiStore } from '@/stores/ui';
import { exportToCsv } from '@/utils/export';

const router = useRouter();
const uiStore = useUiStore();
const orders = ref<any[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = 20;
const activeTab = ref('');
const exportLoading = ref(false);

const showPopup = ref(false);
const currentOrder = ref<any>(null);
const isDesktop = computed(() => uiStore.isDesktop);

const statusMap: Record<string, string> = {
  [OrderStatus.PENDING]: '待接单',
  [OrderStatus.ACCEPTED]: '已接单',
  [OrderStatus.IN_SERVICE]: '服务中',
  [OrderStatus.DONE]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
  [OrderStatus.REJECTED]: '已拒绝',
};

const statusText = (status: string) => statusMap[status] || status;

const statusTag = (status: string) => {
  switch (status) {
    case OrderStatus.DONE:
      return 'success';
    case OrderStatus.IN_SERVICE:
      return 'warning';
    case OrderStatus.PENDING:
      return 'info';
    case OrderStatus.CANCELLED:
    case OrderStatus.REJECTED:
      return 'danger';
    default:
      return '';
  }
};

const orderTypeText = (type: string) => {
  const map: Record<string, string> = {
    [OrderType.MF]: '厂家外勤',
    [OrderType.MO]: '厂家内勤',
  };
  return map[type] || type;
};

const getTechnicianNames = (order: any) => {
  if (order.technicianList && order.technicianList.length > 0) {
    return order.technicianList.map((t: any) => t.name).join('、');
  }
  return '-';
};

const formatDate = (date: string | null) => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const fetchOrders = async (isRefresh = false) => {
  if (isRefresh) {
    page.value = 1;
    finished.value = false;
  }

  loading.value = true;
  try {
    const params: any = {
      page: page.value,
      pageSize,
    };

    // 筛选厂家类型工单 (MF 或 MO)
    if (activeTab.value) {
      params.orderType = activeTab.value;
    }

    const res = await workOrderApi.list(params);
    const { list, pagination } = res.data.data;

    // 如果是"全部"标签，过滤出 MF 和 MO 类型
    let filteredList = list;
    if (!activeTab.value) {
      filteredList = list.filter((order: any) =>
        order.orderType === OrderType.MF || order.orderType === OrderType.MO
      );
    }

    if (isRefresh) {
      orders.value = filteredList;
    } else {
      orders.value = [...orders.value, ...filteredList];
    }

    // 判断是否还有更多数据
    if (activeTab.value) {
      // 有类型筛选时，使用后端分页信息
      if (orders.value.length >= pagination.total) {
        finished.value = true;
      }
    } else {
      // "全部"标签时，需要考虑过滤后的数据量
      if (filteredList.length < pageSize) {
        finished.value = true;
      }
    }
  } catch (error) {
    console.error('获取厂家派单失败', error);
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

const loadMore = () => {
  page.value++;
  fetchOrders();
};

const onRefresh = () => {
  fetchOrders(true);
};

const onTabChange = () => {
  orders.value = [];
  fetchOrders(true);
};

const showDetail = (order: any) => {
  currentOrder.value = order;
  showPopup.value = true;
};

const viewDetail = () => {
  if (currentOrder.value) {
    router.push(`/order/${currentOrder.value.id}`);
  }
};

const exportManufacturer = async () => {
  if (exportLoading.value) return;
  exportLoading.value = true;
  const columns = [
    { label: '派工编号', value: (row: any) => row.orderNo },
    { label: '类型', value: (row: any) => orderTypeText(row.orderType) },
    { label: '厂家对接人', value: (row: any) => row.manufacturerContact || '' },
    { label: '客户', value: (row: any) => row.customerName },
    {
      label: '工程师',
      value: (row: any) => (row.technicianList || []).map((t: any) => t.name).join('、'),
    },
    { label: '工单状态', value: (row: any) => statusText(row.status) },
    { label: '提交时间', value: (row: any) => formatDate(row.createdAt) },
    { label: '完成时间', value: (row: any) => formatDate(row.completedAt) },
    { label: '描述', value: (row: any) => row.description || '' },
  ];
  try {
    const allOrders: any[] = [];
    const exportSize = 200;
    const targetTypes = activeTab.value ? [activeTab.value] : [OrderType.MF, OrderType.MO];
    for (const type of targetTypes) {
      let currentPage = 1;
      let fetched = 0;
      let totalForType: number | null = null;
      while (true) {
        const res = await workOrderApi.list({
          page: currentPage,
          pageSize: exportSize,
          orderType: type,
        });
        const { list, pagination } = res.data.data;
        const filtered = (list || []).filter(
          (order: any) => order.orderType === type,
        );
        allOrders.push(...filtered);
        fetched += filtered.length;
        if (pagination?.total != null) {
          totalForType = pagination.total;
        }
        if (
          !filtered.length ||
          (totalForType != null && fetched >= totalForType) ||
          filtered.length < exportSize
        ) {
          break;
        }
        currentPage += 1;
      }
    }
    if (!allOrders.length) {
      return;
    }
    exportToCsv('manufacturer-orders.csv', columns, allOrders);
  } catch (error) {
    console.error('导出厂家派工失败', error);
  } finally {
    exportLoading.value = false;
  }
};

fetchOrders(true);
</script>

<style lang="scss" scoped>
.manufacturer-desktop {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.desktop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.desktop-tabs {
  margin-top: 0;
}

.table-footer {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-footer {
  margin-top: 16px;
  text-align: right;
}

.manufacturer-page {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: env(safe-area-inset-bottom);
}

.order-card {
  background: #fff;
  margin: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  position: relative;

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

  .status-tag {
    padding: 2px 8px;
    font-size: 12px;
    border-radius: 4px;
  }

  .order-type-tag {
    display: inline-block;
    padding: 2px 8px;
    margin-bottom: 8px;
    font-size: 12px;
    background: #e6f7ff;
    color: #1890ff;
    border-radius: 4px;
  }
}

.order-info {
  .info-row {
    font-size: 14px;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      color: var(--text-color-2);
    }
  }
}

.detail-popup {
  padding: 16px;

  .popup-title {
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 16px;
  }
}

.status-tag--pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-tag--accepted {
  background: #e6f7ff;
  color: #1890ff;
}

.status-tag--in_service {
  background: #f0f5ff;
  color: #597ef7;
}

.status-tag--done {
  background: #f0f0f0;
  color: #666;
}

.status-tag--cancelled {
  background: #fff1f0;
  color: #ff4d4f;
}

.status-tag--rejected {
  background: #fff1f0;
  color: #ff4d4f;
}
</style>
