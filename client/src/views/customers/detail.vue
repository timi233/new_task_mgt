<template>
  <div v-if="isDesktop" class="customer-detail-desktop">
    <el-page-header @back="router.back()" content="客户详情" />
    <el-skeleton v-if="loading" :loading="loading" animated style="margin-top: 16px" />

    <template v-else-if="customer">
      <div class="desktop-actions">
        <el-button v-if="canEdit" type="primary" @click="goEdit">编辑</el-button>
        <el-button v-if="canCreate" type="success" @click="createOrder">新建工单</el-button>
      </div>
      <el-row :gutter="16" class="customer-sections">
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>基本信息</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="客户名称">{{ customer.name }}</el-descriptions-item>
              <el-descriptions-item label="简称">{{ customer.shortName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ customer.contactPerson }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ customer.contactPhone }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ customer.contactEmail || '-' }}</el-descriptions-item>
              <el-descriptions-item label="地址">{{ customer.address || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>其他信息</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="行业">{{ customer.industry || '-' }}</el-descriptions-item>
              <el-descriptions-item label="规模">{{ customer.scale || '-' }}</el-descriptions-item>
              <el-descriptions-item label="渠道">{{ customer.channel?.name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="创建人">{{ customer.creator?.name || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div class="text-block">
              <strong>备注：</strong>{{ customer.remark || '-' }}
            </div>
          </el-card>
        </el-col>
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>服务统计</template>
            <el-statistic title="总工单数" :value="totalOrderCount" />
            <el-statistic title="总服务工时" :value="totalServiceHours" suffix="小时" />
          </el-card>
        </el-col>
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>最近工单</template>
            <el-table :data="customer.workOrders || []" size="small" v-if="customer.workOrders?.length">
              <el-table-column prop="orderNo" label="工单编号" width="160" />
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
    <el-empty v-else description="未找到客户信息" />
  </div>
  <div v-else class="customer-detail-page">
    <van-nav-bar title="客户详情" left-arrow @click-left="router.back()">
      <template #right>
        <van-icon name="edit" size="20" @click="goEdit" v-if="canEdit" />
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" style="text-align: center; padding: 40px" />

    <template v-else-if="customer">
      <van-cell-group title="基本信息">
        <van-cell title="客户名称" :value="customer.name" />
        <van-cell title="简称" :value="customer.shortName || '-'" />
        <van-cell title="联系人" :value="customer.contactPerson" />
        <van-cell title="联系电话" :value="customer.contactPhone" is-link :url="`tel:${customer.contactPhone}`" />
        <van-cell title="邮箱" :value="customer.contactEmail || '-'" />
        <van-cell title="地址" :value="customer.address || '-'" />
      </van-cell-group>

      <van-cell-group title="其他信息">
        <van-cell title="行业" :value="customer.industry || '-'" />
        <van-cell title="规模" :value="customer.scale || '-'" />
        <van-cell title="渠道" :value="customer.channel?.name || '-'" />
        <van-cell title="创建人" :value="customer.creator?.name || '-'" />
        <van-cell title="备注" :label="customer.remark || '-'" />
      </van-cell-group>

      <van-cell-group title="服务统计">
        <van-cell title="总工单数" :value="customer.statistics?.totalOrders || 0" />
        <van-cell title="总服务工时" :value="totalHoursDisplay" />
      </van-cell-group>

      <van-cell-group title="最近工单">
        <van-cell
          v-for="order in customer.workOrders"
          :key="order.id"
          :title="order.description"
          :label="`${order.orderNo} | ${technicianNames(order)}`"
          is-link
          @click="router.push(`/order/${order.id}`)"
        >
          <template #value>
            <span :class="['status-tag', `status-tag--${order.status.toLowerCase()}`]">
              {{ statusText(order.status) }}
            </span>
          </template>
        </van-cell>
        <van-empty v-if="!customer.workOrders?.length" description="暂无工单记录" />
      </van-cell-group>

      <div style="margin: 16px" v-if="canCreate">
        <van-button type="primary" block @click="createOrder">为该客户创建工单</van-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { useUserStore } from '@/stores/user';
import { customerApi } from '@/utils/api';
import { isSales, isAdmin } from '@/types/enums';
import { useUiStore } from '@/stores/ui';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUiStore();

const customerId = route.params.id as string;
const loading = ref(true);
const customer = ref<any>(null);
const isDesktop = computed(() => uiStore.isDesktop);

const totalOrderCount = computed(() => Number(customer.value?.statistics?.totalOrders ?? 0));
const totalServiceHours = computed(() => Number(customer.value?.statistics?.totalHours ?? 0));
const totalHoursDisplay = computed(() => `${totalServiceHours.value} 小时`);

const canEdit = computed(() => {
  // 销售、管理员、系统管理员可以编辑客户
  const user = userStore.user;
  return isSales(user) || isAdmin(user);
});

const canCreate = computed(() => {
  // 销售、管理员、系统管理员可以创建工单
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

const fetchCustomer = async () => {
  loading.value = true;
  try {
    const res = await customerApi.detail(customerId);
    const data = res.data.data;
    if (data?.statistics) {
      data.statistics.totalOrders = Number(data.statistics.totalOrders ?? 0);
      data.statistics.totalHours = Number(data.statistics.totalHours ?? 0);
    }
    customer.value = data;
  } catch (error) {
    showToast('获取客户详情失败');
  } finally {
    loading.value = false;
  }
};

const goEdit = () => {
  router.push(`/customer/${customerId}/edit`);
};

const createOrder = () => {
  router.push(`/order/create?customerId=${customerId}&customerName=${encodeURIComponent(customer.value.name)}`);
};

onMounted(() => {
  fetchCustomer();
});
</script>

<style lang="scss" scoped>
.customer-detail-desktop {
  padding: 24px;
}

.customer-sections {
  margin-top: 16px;
}

.desktop-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.text-block {
  margin-top: 12px;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 6px;
  min-height: 48px;
}

.customer-detail-page {
  background: #f7f8fa;
  min-height: 100vh;
}
</style>
