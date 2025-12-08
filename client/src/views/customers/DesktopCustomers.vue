<template>
  <div class="desktop-page customers-desktop">
    <el-card shadow="never" class="filter-card">
      <el-form inline @submit.prevent>
        <el-form-item>
          <el-input
            v-model="localKeyword"
            placeholder="搜索客户名称 / 联系人 / 电话"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
        <el-form-item>
          <el-button
            @click="$emit('export')"
            :disabled="!customers.length || exportLoading"
            :loading="exportLoading"
            class="desktop-export"
          >
            导出 CSV
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="success" v-if="canCreate" @click="$emit('create')">新建客户</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <el-table :data="customers" v-loading="loading" @row-click="handleRowClick">
        <el-table-column prop="name" label="客户名称" min-width="200" />
        <el-table-column label="联系人" min-width="160">
          <template #default="{ row }">
            <div>{{ row.contactPerson }}</div>
            <div class="muted">{{ row.contactPhone }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="channel.name" label="渠道" width="160">
          <template #default="{ row }">
            <el-tag size="small" v-if="row.channel">{{ row.channel.name }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="工单数" width="120" />
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click.stop="$emit('open', row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <el-pagination
          background
          layout="prev, pager, next, jumper"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="$emit('change-page', $event)"
        />
      </div>
      <el-empty v-if="!loading && customers.length === 0" description="暂无客户" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  customers: any[];
  loading: boolean;
  canCreate: boolean;
  keyword: string;
  page: number;
  pageSize: number;
  total: number;
  exportLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:keyword', value: string): void;
  (e: 'search'): void;
  (e: 'reset'): void;
  (e: 'change-page', value: number): void;
  (e: 'open', row: any): void;
  (e: 'export'): void;
  (e: 'create'): void;
}>();

const localKeyword = ref(props.keyword);

watch(
  () => props.keyword,
  value => {
    localKeyword.value = value;
  },
);

const handleSearch = () => {
  emit('update:keyword', localKeyword.value);
  emit('search');
};

const handleReset = () => {
  localKeyword.value = '';
  emit('update:keyword', '');
  emit('reset');
};

const handleRowClick = (row: any) => {
  emit('open', row);
};
</script>

<style scoped>
.customers-desktop {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  margin-top: 0;
}

.desktop-export {
  min-width: 120px;
}

.muted {
  font-size: 12px;
  color: #909399;
}

.table-footer {
  display: flex;
  justify-content: center;
  padding: 16px 0 0;
}
</style>
