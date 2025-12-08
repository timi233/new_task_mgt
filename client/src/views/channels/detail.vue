<template>
  <div v-if="isDesktop" class="channel-detail-desktop">
    <el-page-header @back="router.back()" content="渠道详情" />
    <el-skeleton v-if="loading" :loading="loading" animated style="margin-top: 16px" />

    <template v-else-if="channel">
      <div class="desktop-actions">
        <el-button v-if="canEdit" type="primary" @click="goEdit">编辑</el-button>
      </div>
      <el-row :gutter="16" class="channel-sections">
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>基本信息</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="渠道名称">{{ channel.name }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ channel.contactPerson || '-' }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ channel.contactPhone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="使用次数">{{ channel.usageCount || 0 }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>统计信息</template>
            <el-statistic title="总工单数" :value="totalOrderCount" />
            <el-statistic title="关联客户数" :value="relatedCustomersCount" style="margin-top: 16px" />
          </el-card>
        </el-col>
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>关联客户</template>
            <el-table :data="channel.relatedCustomers || []" size="small" v-if="channel.relatedCustomers?.length">
              <el-table-column prop="name" label="客户名称" min-width="200" />
              <el-table-column prop="contactPerson" label="联系人" width="120" />
              <el-table-column prop="contactPhone" label="联系电话" width="140" />
              <el-table-column prop="orderCountViaChannel" label="通过该渠道的工单数" width="160" />
              <el-table-column width="120" label="操作">
                <template #default="{ row }">
                  <el-button type="primary" text size="small" @click="router.push(`/customer/${row.id}`)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无关联客户" />
          </el-card>
        </el-col>
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>最近工单</template>
            <el-table :data="channel.workOrders || []" size="small" v-if="channel.workOrders?.length">
              <el-table-column prop="orderNo" label="工单编号" width="160" />
              <el-table-column prop="customerName" label="客户" width="180" />
              <el-table-column prop="description" label="描述" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="orderStatusTag(row.status)">{{ statusText(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="工程师" width="200">
                <template #default="{ row }">
                  {{ technicianNames(row) }}
                </template>
              </el-table-column>
              <el-table-column width="120" label="操作">
                <template #default="{ row }">
                  <el-button type="primary" text size="small" @click="router.push(`/order/${row.id}`)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无工单记录" />
          </el-card>
        </el-col>
      </el-row>
    </template>
    <el-empty v-else description="未找到渠道信息" />
  </div>
  <div v-else class="channel-detail-page">
    <van-nav-bar title="渠道详情" left-arrow @click-left="router.back()">
      <template #right>
        <van-icon name="edit" size="20" @click="goEdit" v-if="canEdit" />
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" style="text-align: center; padding: 40px" />

    <template v-else-if="channel">
      <van-cell-group title="基本信息">
        <van-cell title="渠道名称" :value="channel.name" />
        <van-cell title="联系人" :value="channel.contactPerson || '-'" />
        <van-cell title="联系电话" :value="channel.contactPhone || '-'" is-link :url="`tel:${channel.contactPhone}`" v-if="channel.contactPhone" />
        <van-cell title="联系电话" :value="channel.contactPhone || '-'" v-else />
        <van-cell title="使用次数" :value="channel.usageCount || 0" />
      </van-cell-group>

      <van-cell-group title="统计信息">
        <van-cell title="总工单数" :value="channel.statistics?.totalOrders || 0" />
        <van-cell title="关联客户数" :value="channel.statistics?.relatedCustomersCount || 0" />
      </van-cell-group>

      <van-cell-group title="关联客户">
        <van-cell
          v-for="customer in channel.relatedCustomers"
          :key="customer.id"
          :title="customer.name"
          :label="`${customer.contactPerson || ''} | ${customer.contactPhone || ''}`"
          is-link
          @click="router.push(`/customer/${customer.id}`)"
        >
          <template #value>
            <span class="order-count-tag">{{ customer.orderCountViaChannel }} 单</span>
          </template>
        </van-cell>
        <van-empty v-if="!channel.relatedCustomers?.length" description="暂无关联客户" />
      </van-cell-group>

      <van-cell-group title="最近工单">
        <van-cell
          v-for="order in channel.workOrders"
          :key="order.id"
          :title="order.description"
          :label="`${order.orderNo} | ${order.customerName} | ${technicianNames(order)}`"
          is-link
          @click="router.push(`/order/${order.id}`)"
        >
          <template #value>
            <span :class="['status-tag', `status-tag--${order.status.toLowerCase()}`]">
              {{ statusText(order.status) }}
            </span>
          </template>
        </van-cell>
        <van-empty v-if="!channel.workOrders?.length" description="暂无工单记录" />
      </van-cell-group>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { useUserStore } from '@/stores/user';
import { channelApi } from '@/utils/api';
import { isSales, isAdmin } from '@/types/enums';
import { useUiStore } from '@/stores/ui';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUiStore();

const channelId = route.params.id as string;
const loading = ref(true);
const channel = ref<any>(null);
const isDesktop = computed(() => uiStore.isDesktop);

const totalOrderCount = computed(() => Number(channel.value?.statistics?.totalOrders ?? 0));
const relatedCustomersCount = computed(() => Number(channel.value?.statistics?.relatedCustomersCount ?? 0));

const canEdit = computed(() => {
  // 销售、管理员、系统管理员可以编辑渠道
  const user = userStore.user;
  return isSales(user) || isAdmin(user);
});

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

const technicianNames = (order: any) => {
  if (order.technicianList && order.technicianList.length > 0) {
    return order.technicianList.map((t: any) => t.name).join('、');
  }
  return '未分配';
};

const orderStatusTag = (status: string) => {
  switch (status) {
    case 'DONE':
      return 'success';
    case 'IN_SERVICE':
      return 'warning';
    case 'PENDING':
      return 'info';
    case 'CANCELLED':
    case 'REJECTED':
      return 'danger';
    default:
      return '';
  }
};

const fetchChannel = async () => {
  loading.value = true;
  try {
    const res = await channelApi.detail(channelId);
    const data = res.data.data;
    if (data?.statistics) {
      data.statistics.totalOrders = Number(data.statistics.totalOrders ?? 0);
      data.statistics.relatedCustomersCount = Number(data.statistics.relatedCustomersCount ?? 0);
    }
    channel.value = data;
  } catch (error) {
    showToast('获取渠道详情失败');
  } finally {
    loading.value = false;
  }
};

const goEdit = () => {
  router.push(`/channel/${channelId}/edit`);
};

onMounted(() => {
  fetchChannel();
});
</script>

<style lang="scss" scoped>
.channel-detail-desktop {
  padding: 24px;
}

.channel-sections {
  margin-top: 16px;
}

.desktop-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.channel-detail-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.order-count-tag {
  font-size: 12px;
  color: #1890ff;
}

.status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;

  &--pending {
    background: #e6f7ff;
    color: #1890ff;
  }

  &--accepted {
    background: #fff7e6;
    color: #fa8c16;
  }

  &--in_service {
    background: #fef0f0;
    color: #f56c6c;
  }

  &--done {
    background: #f0f9ff;
    color: #67c23a;
  }

  &--cancelled,
  &--rejected {
    background: #f5f5f5;
    color: #909399;
  }
}
</style>
