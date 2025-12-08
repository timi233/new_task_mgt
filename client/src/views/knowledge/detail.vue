<template>
  <div v-if="isDesktop" class="desktop-page knowledge-detail-desktop">
    <el-page-header @back="router.back()" content="知识详情" />
    <el-skeleton v-if="loading" :loading="loading" animated style="margin-top: 16px" />
    <template v-else-if="item">
      <el-card shadow="never" class="detail-card">
        <h1 class="knowledge-title">{{ item.title }}</h1>
        <div class="knowledge-meta">
          <el-tag v-if="item.problemType" size="small">{{ item.problemType }}</el-tag>
          <span class="view-count">浏览 {{ item.viewCount }}</span>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header>问题描述</template>
        <div class="content-block">{{ item.problem }}</div>
      </el-card>

      <el-card shadow="never">
        <template #header>解决方案</template>
        <div class="content-block">{{ item.solution }}</div>
      </el-card>

      <el-card v-if="relatedItems.length > 0" shadow="never">
        <template #header>相关知识</template>
        <el-table :data="relatedItems" size="small">
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="problemType" label="分类" width="160" />
          <el-table-column width="120" label="操作">
            <template #default="{ row }">
              <el-button type="primary" text size="small" @click="goRelated(row.id)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
    <el-empty v-else description="未找到知识" />
  </div>
  <div v-else class="knowledge-detail-page">
    <van-nav-bar title="知识详情" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px" />

    <template v-else-if="item">
      <div class="knowledge-header">
        <h1 class="knowledge-title">{{ item.title }}</h1>
        <div class="knowledge-meta">
          <span v-if="item.problemType" class="type-tag">{{ item.problemType }}</span>
          <span class="view-count">浏览 {{ item.viewCount }}</span>
        </div>
      </div>

      <van-cell-group title="问题描述">
        <div class="content-block">{{ item.problem }}</div>
      </van-cell-group>

      <van-cell-group title="解决方案">
        <div class="content-block">{{ item.solution }}</div>
      </van-cell-group>

      <van-cell-group v-if="relatedItems.length > 0" title="相关知识">
        <van-cell
          v-for="related in relatedItems"
          :key="related.id"
          :title="related.title"
          :label="related.problemType"
          is-link
          @click="goRelated(related.id)"
        />
      </van-cell-group>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { knowledgeApi } from '@/utils/api';
import { useUiStore } from '@/stores/ui';

const router = useRouter();
const route = useRoute();
const uiStore = useUiStore();

const itemId = ref(route.params.id as string);
const loading = ref(true);
const item = ref<any>(null);
const relatedItems = ref<any[]>([]);
const isDesktop = computed(() => uiStore.isDesktop);

const fetchItem = async () => {
  loading.value = true;
  try {
    const res = await knowledgeApi.detail(itemId.value);
    item.value = res.data.data;
    fetchRelated();
  } catch (error) {
    showToast('获取知识详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchRelated = async () => {
  try {
    const res = await knowledgeApi.related(itemId.value);
    relatedItems.value = res.data.data;
  } catch (error) {
    console.error('获取相关知识失败', error);
  }
};

const goRelated = (id: string) => {
  router.push(`/knowledge/${id}`);
};

watch(() => route.params.id, (newId) => {
  if (newId) {
    itemId.value = newId as string;
    fetchItem();
  }
});

onMounted(() => {
  fetchItem();
});
</script>

<style lang="scss" scoped>
.knowledge-detail-desktop {
  padding: 24px;
}

.detail-card {
  margin-bottom: 16px;

  .knowledge-title {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .knowledge-meta {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .view-count {
    color: #909399;
  }
}

.content-block {
  line-height: 1.8;
  white-space: pre-wrap;
}

.knowledge-detail-desktop {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.knowledge-detail-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.knowledge-header {
  background: #fff;
  padding: 16px;
  margin-bottom: 12px;

  .knowledge-title {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 12px;
  }

  .knowledge-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .type-tag {
    background: #e6f7ff;
    color: #1890ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .view-count {
    font-size: 12px;
    color: var(--text-color-3);
  }
}

.content-block {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-color);
  white-space: pre-wrap;
}
</style>
