<template>
  <div v-if="isDesktop" class="desktop-page knowledge-desktop">
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          placeholder="搜索知识"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </el-card>
    <el-card shadow="never">
      <div class="knowledge-table-wrapper">
        <el-table
          class="knowledge-table"
          :data="items"
          v-loading="loading"
          @row-click="handleDesktopOpen"
        >
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="problemType" label="分类" width="160" />
        <el-table-column prop="problem" label="问题描述" show-overflow-tooltip />
        <el-table-column prop="viewCount" label="浏览" width="120" />
        <el-table-column width="120" label="操作">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click.stop="router.push(`/knowledge/${row.id}`)">
              查看
            </el-button>
          </template>
        </el-table-column>
        </el-table>
      </div>
      <div class="table-footer">
        <el-button
          @click="loadMore"
          :loading="loading"
          :disabled="finished"
        >
          {{ finished ? '没有更多了' : '加载更多' }}
        </el-button>
      </div>
      <el-empty v-if="!loading && items.length === 0" description="暂无知识条目" />
    </el-card>
  </div>
  <div v-else class="knowledge-page">
    <van-search
      v-model="keyword"
      placeholder="搜索知识"
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
          v-for="item in items"
          :key="item.id"
          class="knowledge-card"
          @click="router.push(`/knowledge/${item.id}`)"
        >
          <div class="knowledge-title">{{ item.title }}</div>
          <div class="knowledge-type" v-if="item.problemType">{{ item.problemType }}</div>
          <div class="knowledge-desc">{{ item.problem }}</div>
          <div class="knowledge-footer">
            <span>浏览 {{ item.viewCount }}</span>
          </div>
        </div>

        <van-empty v-if="!loading && items.length === 0" description="暂无知识条目" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { knowledgeApi } from '@/utils/api';
import { useUiStore } from '@/stores/ui';

const router = useRouter();
const uiStore = useUiStore();

const keyword = ref('');
const items = ref<any[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = 20;
const isDesktop = computed(() => uiStore.isDesktop);

const fetchItems = async (isRefresh = false) => {
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

    const res = await knowledgeApi.list(params);
    const { list, pagination } = res.data.data;

    if (isRefresh) {
      items.value = list;
    } else {
      items.value = [...items.value, ...list];
    }

    if (items.value.length >= pagination.total) {
      finished.value = true;
    }
  } catch (error) {
    console.error('获取知识列表失败', error);
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

const loadMore = () => {
  page.value++;
  fetchItems();
};

const onRefresh = () => {
  fetchItems(true);
};

const handleSearch = () => {
  fetchItems(true);
};

const handleReset = () => {
  keyword.value = '';
  fetchItems(true);
};

const handleDesktopOpen = (row: any) => {
  router.push(`/knowledge/${row.id}`);
};

fetchItems(true);
</script>

<style lang="scss" scoped>
.knowledge-desktop {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  margin-top: 0;
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-row :deep(.el-input) {
  flex: 1;
  min-width: 240px;
}

.filter-row :deep(.el-button) {
  flex-shrink: 0;
}

.table-footer {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.knowledge-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.knowledge-table-wrapper :deep(.el-table) {
  width: 100%;
  min-width: 700px;
}

.knowledge-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.knowledge-card {
  background: #fff;
  margin: 12px;
  padding: 12px 16px;
  border-radius: 8px;

  .knowledge-title {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .knowledge-type {
    display: inline-block;
    background: #e6f7ff;
    color: #1890ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .knowledge-desc {
    font-size: 14px;
    color: var(--text-color-2);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .knowledge-footer {
    font-size: 12px;
    color: var(--text-color-3);
  }
}
</style>
