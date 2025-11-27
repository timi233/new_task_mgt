<template>
  <div class="customer-detail-page">
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
        <van-cell title="总服务工时" :value="`${customer.statistics?.totalHours || 0} 小时`" />
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

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const customerId = route.params.id as string;
const loading = ref(true);
const customer = ref<any>(null);

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

const fetchCustomer = async () => {
  loading.value = true;
  try {
    const res = await customerApi.detail(customerId);
    customer.value = res.data.data;
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
.customer-detail-page {
  background: #f7f8fa;
  min-height: 100vh;
}
</style>
