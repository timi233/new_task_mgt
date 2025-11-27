<template>
  <div class="knowledge-page">
    <van-nav-bar title="知识库" left-arrow @click-left="router.back()" />

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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { knowledgeApi } from '@/utils/api';

const router = useRouter();

const keyword = ref('');
const items = ref<any[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = 20;

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

fetchItems(true);
</script>

<style lang="scss" scoped>
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
