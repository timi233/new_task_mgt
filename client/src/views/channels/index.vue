<template>
  <DesktopChannels
    v-if="isDesktop"
    :channels="channels"
    :loading="loading"
    :can-create="canCreate"
    :keyword="keyword"
    :page="page"
    :page-size="pageSize"
    :total="totalCount"
    :export-loading="exportLoading"
    @update:keyword="updateKeyword"
    @search="fetchChannels(true)"
    @reset="handleReset"
    @change-page="handlePageChange"
    @create="router.push('/channel/create')"
    @open="openChannel"
    @export="exportChannels"
  />
  <div v-else class="channels-page">
    <van-nav-bar title="渠道列表">
      <template #right>
        <van-icon name="plus" size="20" @click="router.push('/channel/create')" v-if="canCreate" />
      </template>
    </van-nav-bar>

    <van-search
      v-model="keyword"
      placeholder="搜索渠道名称、联系人、电话"
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
          v-for="channel in channels"
          :key="channel.id"
          class="channel-card"
          @click="router.push(`/channel/${channel.id}`)"
        >
          <div class="channel-name">{{ channel.name }}</div>
          <div class="channel-info">
            <span>{{ channel.contactPerson }}</span>
            <span>{{ channel.contactPhone }}</span>
          </div>
          <div class="channel-footer">
            <span class="order-count">工单: {{ channel.orderCount || 0 }}</span>
          </div>
        </div>

        <van-empty v-if="!loading && channels.length === 0" description="暂无渠道" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { channelApi } from '@/utils/api';
import { isSales, isAdmin } from '@/types/enums';
import { useUiStore } from '@/stores/ui';
import DesktopChannels from './DesktopChannels.vue';
import { exportToCsv } from '@/utils/export';

const router = useRouter();
const userStore = useUserStore();
const uiStore = useUiStore();

const keyword = ref('');
const channels = ref<any[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = 20;
const totalCount = ref(0);
const isDesktop = computed(() => uiStore.isDesktop);
const exportLoading = ref(false);

const canCreate = computed(() => {
  // 销售、管理员、系统管理员可以创建渠道
  const user = userStore.user;
  return isSales(user) || isAdmin(user);
});

const fetchChannels = async (isRefresh = false) => {
  if (isRefresh) {
    finished.value = false;
    if (!isDesktop.value) {
      page.value = 1;
    }
  }

  loading.value = true;
  try {
    const params: any = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
    };

    const res = await channelApi.list(params);
    const { list, pagination } = res.data.data;
    totalCount.value = pagination.total || 0;

    const shouldAppend = !isDesktop.value && !isRefresh;
    channels.value = shouldAppend ? [...channels.value, ...list] : list;

    if (!isDesktop.value && channels.value.length >= pagination.total) {
      finished.value = true;
    } else if (isDesktop.value) {
      finished.value = list.length < pageSize;
    }
  } catch (error) {
    console.error('获取渠道列表失败', error);
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

const loadMore = () => {
  page.value++;
  fetchChannels();
};

const onRefresh = () => {
  fetchChannels(true);
};

const handleSearch = () => {
  page.value = 1;
  fetchChannels(true);
};

const handleReset = () => {
  keyword.value = '';
  page.value = 1;
  fetchChannels(true);
};

const updateKeyword = (value: string) => {
  keyword.value = value;
};

const handlePageChange = (newPage: number) => {
  page.value = newPage;
  fetchChannels();
};

const openChannel = (channel: any) => {
  router.push(`/channel/${channel.id}`);
};

const exportChannels = async () => {
  if (exportLoading.value) return;
  exportLoading.value = true;
  const columns = [
    { label: '渠道名称', value: (row: any) => row.name },
    { label: '联系人', value: (row: any) => row.contactPerson },
    { label: '联系电话', value: (row: any) => row.contactPhone },
    { label: '工单数', value: (row: any) => row.orderCount ?? '' },
    { label: '更新时间', value: (row: any) => row.updatedAt || '' },
  ];
  try {
    const allChannels: any[] = [];
    const exportSize = 200;
    let currentPage = 1;
    while (true) {
      const res = await channelApi.list({
        page: currentPage,
        pageSize: exportSize,
        keyword: keyword.value || undefined,
      });
      const { list, pagination } = res.data.data;
      allChannels.push(...list);
      const total = pagination?.total ?? allChannels.length;
      if (!list.length || allChannels.length >= total || list.length < exportSize) {
        break;
      }
      currentPage += 1;
    }
    if (!allChannels.length) {
      return;
    }
    exportToCsv('channels.csv', columns, allChannels);
  } catch (error) {
    console.error('导出渠道失败', error);
  } finally {
    exportLoading.value = false;
  }
};

fetchChannels(true);
</script>

<style lang="scss" scoped>
.channels-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.channel-card {
  background: #fff;
  margin: 12px;
  padding: 12px 16px;
  border-radius: 8px;

  .channel-name {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .channel-info {
    font-size: 13px;
    color: var(--text-color-2);
    margin-bottom: 8px;

    span {
      margin-right: 16px;
    }
  }

  .channel-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .order-count {
    font-size: 12px;
    color: var(--text-color-3);
  }
}
</style>
