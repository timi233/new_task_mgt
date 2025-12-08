<template>
  <DesktopOrders
    v-if="isDesktop"
    :orders="orders"
    :loading="loading"
    :can-create="canCreate"
    :keyword="keyword"
    :filters="filters"
    :status-options="statusOptions"
    :order-type-options="orderTypeOptions"
    :priority-options="priorityOptions"
    :page="page"
    :page-size="pageSize"
    :total="totalCount"
    :export-loading="exportLoading"
    @update:keyword="updateKeyword"
    @update:filters="updateFilters"
    @search="fetchOrders(true)"
    @reset="fetchOrders(true)"
    @create="router.push('/order/create')"
    @open="openOrder"
    @change-page="handlePageChange"
    @export="exportOrders"
  />
  <div v-else class="orders-page">
    <van-nav-bar title="工单列表">
      <template #right>
        <van-icon name="plus" size="20" @click="router.push('/order/create')" v-if="canCreate" />
      </template>
    </van-nav-bar>

    <!-- 搜索和筛选 -->
    <van-search
      v-model="keyword"
      placeholder="搜索工单编号、客户"
      @search="handleSearch"
    />

    <van-dropdown-menu>
      <van-dropdown-item v-model="filters.status" :options="statusOptions" />
      <van-dropdown-item v-model="filters.orderType" :options="orderTypeOptions" />
      <van-dropdown-item v-model="filters.priority" :options="priorityOptions" />
    </van-dropdown-menu>

    <!-- 工单列表 -->
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
          @click="router.push(`/order/${order.id}`)"
        >
          <div class="order-header">
            <span class="order-no">{{ order.orderNo }}</span>
            <span :class="['status-tag', `status-tag--${order.status.toLowerCase()}`]">
              {{ statusText(order.status) }}
            </span>
          </div>

          <div class="order-customer">{{ order.customerName }}</div>
          <div class="order-desc">{{ order.description }}</div>

          <div class="order-info">
            <div class="info-item">
              <van-icon name="manager-o" />
              <span>{{ technicianNames(order) }}</span>
            </div>
            <div class="info-item" v-if="order.manufacturerContact">
              <van-icon name="shop-o" />
              <span>{{ order.manufacturerContact }}</span>
            </div>
          </div>

          <div class="order-footer">
            <div class="footer-left">
              <span :class="['type-tag', `type-tag--${order.orderType.toLowerCase()}`]">
                {{ orderTypeText(order.orderType) }}
              </span>
              <span v-if="isCompanyOrder(order.orderType)" :class="['priority-tag', `priority-tag--${order.priority.toLowerCase()}`]">
                {{ priorityText(order.priority) }}
              </span>
            </div>
            <span class="order-time">{{ formatTime(order.createdAt) }}</span>
          </div>
        </div>

        <van-empty v-if="!loading && orders.length === 0" description="暂无工单" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { workOrderApi } from '@/utils/api';
import {
  isCompanyOrder,
  isTechnician,
  isSales,
  isAdmin,
} from '@/types/enums';
import dayjs from 'dayjs';
import { useUiStore } from '@/stores/ui';
import DesktopOrders from './DesktopOrders.vue';
import { exportToCsv } from '@/utils/export';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUiStore();

const keyword = ref('');
const orders = ref<any[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = 20;
const totalCount = ref(0);
const exportLoading = ref(false);

const filters = ref({
  status: '',
  orderType: '',
  priority: '',
  customer: '',
  technicianId: '',
  technicianName: '',
});
const syncingFromRoute = ref(false);

const isDesktop = computed(() => uiStore.isDesktop);

const canCreate = computed(() => {
  const user = userStore.user;
  return isTechnician(user) || isSales(user) || isAdmin(user);
});

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '待接单', value: 'PENDING' },
  { text: '已接单', value: 'ACCEPTED' },
  { text: '服务中', value: 'IN_SERVICE' },
  { text: '已完成', value: 'DONE' },
  { text: '已取消', value: 'CANCELLED' },
];

const orderTypeOptions = [
  { text: '全部类型', value: '' },
  { text: '公司外勤', value: 'CF' },
  { text: '公司内勤', value: 'CO' },
  { text: '厂家外勤', value: 'MF' },
  { text: '厂家内勤', value: 'MO' },
];

const priorityOptions = [
  { text: '全部优先级', value: '' },
  { text: '非常紧急', value: 'VERY_URGENT' },
  { text: '紧急', value: 'URGENT' },
  { text: '普通', value: 'NORMAL' },
];

const statusText = (status: string) => {
  const map: Record<string, string> = {
    PENDING: '待接单',
    ACCEPTED: '已接单',
    IN_SERVICE: '服务中',
    DONE: '已完成',
    CANCELLED: '已取消',
    REJECTED: '已拒绝',
  };
  return map[status] || status;
};

const priorityText = (priority: string) => {
  const map: Record<string, string> = {
    NORMAL: '普通',
    URGENT: '紧急',
    VERY_URGENT: '非常紧急',
  };
  return map[priority] || priority;
};

const orderTypeText = (type: string) => {
  const map: Record<string, string> = {
    CF: '公司外勤',
    CO: '公司内勤',
    MF: '厂家外勤',
    MO: '厂家内勤',
  };
  return map[type] || type;
};

const technicianNames = (order: any) => {
  if (order.technicianList && order.technicianList.length > 0) {
    return order.technicianList.map((t: any) => t.name).join('、');
  }
  return '未分配';
};

const formatTime = (time: string) => {
  return dayjs(time).format('MM-DD HH:mm');
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
      keyword: keyword.value || undefined,
      status: filters.value.status || undefined,
      orderType: filters.value.orderType || undefined,
      priority: filters.value.priority || undefined,
    };
    if (filters.value.customer) {
      params.customer = filters.value.customer;
    }
    if (filters.value.technicianId) {
      params.technicianId = filters.value.technicianId;
    }

    const res = await workOrderApi.list(params);
    const { list, pagination } = res.data.data;
    totalCount.value = pagination.total || 0;

    if (isRefresh) {
      orders.value = list;
    } else {
      orders.value = [...orders.value, ...list];
    }

    if (orders.value.length >= pagination.total) {
      finished.value = true;
    }
  } catch (error) {
    console.error('获取工单列表失败', error);
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

const handleSearch = () => {
  fetchOrders(true);
};

const updateKeyword = (value: string) => {
  keyword.value = value;
};

const updateFilters = (value: {
  status: string; orderType: string; priority: string;
  customer?: string; technicianId?: string; technicianName?: string;
}) => {
  filters.value = {
    status: value.status || '',
    orderType: value.orderType || '',
    priority: value.priority || '',
    customer: value.customer || '',
    technicianId: value.technicianId || '',
    technicianName: value.technicianName || '',
  };
};

const openOrder = (order: any) => {
  router.push(`/order/${order.id}`);
};

const exportOrders = async () => {
  if (exportLoading.value) return;
  exportLoading.value = true;
  const columns = [
    { label: '工单编号', value: (row: any) => row.orderNo },
    { label: '客户', value: (row: any) => row.customerName },
    { label: '类型', value: (row: any) => orderTypeText(row.orderType) },
    { label: '优先级', value: (row: any) => priorityText(row.priority) },
    {
      label: '工单状态',
      value: (row: any) => statusText(row.status),
    },
    {
      label: '工程师',
      value: (row: any) => (row.technicianList || []).map((t: any) => t.name).join('、'),
    },
    { label: '厂家对接人', value: (row: any) => row.manufacturerContact || '' },
    { label: '创建时间', value: (row: any) => formatTime(row.createdAt) },
    { label: '描述', value: (row: any) => row.description || '' },
  ];
  try {
    const exportSize = 200;
    const allOrders: any[] = [];
    let currentPage = 1;
    while (true) {
      const params: any = {
        page: currentPage,
        pageSize: exportSize,
        keyword: keyword.value || undefined,
        status: filters.value.status || undefined,
        orderType: filters.value.orderType || undefined,
        priority: filters.value.priority || undefined,
      };
      if (filters.value.customer) params.customer = filters.value.customer;
      if (filters.value.technicianId) params.technicianId = filters.value.technicianId;
      const res = await workOrderApi.list(params);
      const { list, pagination } = res.data.data;
      allOrders.push(...list);
      const total = pagination?.total ?? allOrders.length;
      if (!list.length || allOrders.length >= total || list.length < exportSize) {
        break;
      }
      currentPage += 1;
    }
    if (!allOrders.length) {
      return;
    }
    exportToCsv('orders.csv', columns, allOrders);
  } catch (error) {
    console.error('导出工单失败', error);
  } finally {
    exportLoading.value = false;
  }
};

const handlePageChange = (newPage: number) => {
  page.value = newPage;
  fetchOrders(true);
};

// 监听筛选条件变化
watch(filters, () => {
  if (syncingFromRoute.value) return;
  fetchOrders(true);
}, { deep: true });

const applyRouteFilters = () => {
  syncingFromRoute.value = true;
  keyword.value = typeof route.query.keyword === 'string' ? route.query.keyword : '';
  filters.value = {
    status: typeof route.query.status === 'string' ? route.query.status : '',
    orderType: typeof route.query.orderType === 'string' ? route.query.orderType : '',
    priority: typeof route.query.priority === 'string' ? route.query.priority : '',
    customer: typeof route.query.customer === 'string' ? route.query.customer : '',
    technicianId: typeof route.query.technicianId === 'string' ? route.query.technicianId : '',
    technicianName: typeof route.query.technicianName === 'string' ? route.query.technicianName : '',
  };
  syncingFromRoute.value = false;
};

watch(
  () => route.query,
  () => {
    applyRouteFilters();
    fetchOrders(true);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.orders-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.order-card {
  background: #fff;
  margin: 12px;
  padding: 12px 16px;
  border-radius: 8px;

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

  .order-customer {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .order-desc {
    font-size: 14px;
    color: var(--text-color-2);
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  .order-info {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;

    .info-item {
      display: flex;
      align-items: center;
      font-size: 13px;
      color: var(--text-color-2);

      .van-icon {
        margin-right: 4px;
      }
    }
  }

  .order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-left {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .type-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;

    &--cf {
      background: #e6f7ff;
      color: #1890ff;
    }
    &--co {
      background: #f6ffed;
      color: #52c41a;
    }
    &--mf {
      background: #fff7e6;
      color: #fa8c16;
    }
    &--mo {
      background: #fff0f6;
      color: #eb2f96;
    }
  }

  .priority-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;

    &--normal {
      background: #f0f0f0;
      color: #666;
    }
    &--urgent {
      background: #fff7e6;
      color: #fa8c16;
    }
    &--very_urgent {
      background: #fff1f0;
      color: #f5222d;
    }
  }

  .order-time {
    font-size: 12px;
    color: var(--text-color-3);
  }
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &--pending {
    background: #fff7e6;
    color: #fa8c16;
  }
  &--accepted {
    background: #e6f7ff;
    color: #1890ff;
  }
  &--in_service {
    background: #f6ffed;
    color: #52c41a;
  }
  &--done {
    background: #f0f0f0;
    color: #8c8c8c;
  }
  &--cancelled,
  &--rejected {
    background: #fff1f0;
    color: #f5222d;
  }
}
</style>
