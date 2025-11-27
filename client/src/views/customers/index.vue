<template>
  <div class="customers-page">
    <van-nav-bar title="客户列表">
      <template #right>
        <van-icon name="plus" size="20" @click="router.push('/customer/create')" v-if="canCreate" />
      </template>
    </van-nav-bar>

    <van-search
      v-model="keyword"
      placeholder="搜索客户名称、联系人、电话"
      @search="handleSearch"
    />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <div
          v-for="customer in customers"
          :key="customer.id"
          class="customer-card"
          @click="router.push(`/customer/${customer.id}`)"
        >
          <div class="customer-name">{{ customer.name }}</div>
          <div class="customer-info">
            <span>{{ customer.contactPerson }}</span>
            <span>{{ customer.contactPhone }}</span>
          </div>
          <div class="customer-footer">
            <span v-if="customer.channel" class="channel-tag">{{ customer.channel.name }}</span>
            <span class="order-count">工单: {{ customer.orderCount || 0 }}</span>
          </div>
        </div>

        <van-empty v-if="!loading && customers.length === 0" description="暂无客户" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { customerApi } from '@/utils/api';
import { isSales, isAdmin } from '@/types/enums';

const router = useRouter();
const userStore = useUserStore();

const keyword = ref('');
const customers = ref<any[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = 20;

const canCreate = computed(() => {
  // 销售、管理员、系统管理员可以创建客户
  const user = userStore.user;
  return isSales(user) || isAdmin(user);
});

const fetchCustomers = async (isRefresh = false) => {
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
    };

    const res = await customerApi.list(params);
    const { list, pagination } = res.data.data;

    if (isRefresh) {
      customers.value = list;
    } else {
      customers.value = [...customers.value, ...list];
    }

    if (customers.value.length >= pagination.total) {
      finished.value = true;
    }
  } catch (error) {
    console.error('获取客户列表失败', error);
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

const loadMore = () => {
  page.value++;
  fetchCustomers();
};

const onRefresh = () => {
  fetchCustomers(true);
};

const handleSearch = () => {
  fetchCustomers(true);
};

fetchCustomers(true);
</script>

<style lang="scss" scoped>
.customers-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.customer-card {
  background: #fff;
  margin: 12px;
  padding: 12px 16px;
  border-radius: 8px;

  .customer-name {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .customer-info {
    font-size: 13px;
    color: var(--text-color-2);
    margin-bottom: 8px;

    span {
      margin-right: 16px;
    }
  }

  .customer-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .channel-tag {
    background: #e6f7ff;
    color: #1890ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .order-count {
    font-size: 12px;
    color: var(--text-color-3);
  }
}
</style>
