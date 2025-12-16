<template>
  <div class="desktop-orders">
    <el-card class="filter-card" shadow="never">
      <template #header>
        <div class="filters-header">
          <div>
            <div class="filters-title">工单筛选</div>
            <p class="filters-subtitle">按状态与条件组合定位目标工单</p>
          </div>
          <div class="header-actions">
            <el-button
              @click="$emit('export')"
              :icon="Download"
              :disabled="!orders.length || exportLoading"
              :loading="exportLoading"
            >
              导出 CSV
            </el-button>
            <el-button
              v-if="canCreate"
              type="primary"
              size="large"
              :icon="Plus"
              @click="$emit('create')"
            >
              新建工单
            </el-button>
          </div>
        </div>
      </template>

      <div class="status-segment">
        <el-radio-group v-model="localFilters.status" size="large" @change="handleStatusChange">
          <el-radio-button
            v-for="option in statusOptions"
            :key="option.value || 'ALL'"
            :label="option.value"
          >
            {{ option.text.replace('全部状态', '全部') }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <el-form :model="localFilters" label-position="top" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="localKeyword"
            placeholder="搜索工单编号或描述"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="客户">
          <el-autocomplete
            v-model="customerKeyword"
            :fetch-suggestions="fetchCustomerSuggestions"
            placeholder="输入客户名称"
            clearable
            :debounce="300"
            @select="handleCustomerSelect"
            @clear="handleCustomerClear"
          />
        </el-form-item>
        <el-form-item label="工程师">
          <el-autocomplete
            v-model="technicianKeyword"
            :fetch-suggestions="queryTechnicians"
            placeholder="输入工程师姓名"
            clearable
            :debounce="0"
            @select="handleTechnicianSelect"
            @clear="handleTechnicianClear"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="localFilters.orderType" placeholder="全部" clearable>
            <el-option
              v-for="option in orderTypeOptions"
              :key="option.value || 'all-type'"
              :label="option.text"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="localFilters.priority" placeholder="全部" clearable>
            <el-option
              v-for="option in priorityOptions"
              :key="option.value || 'all-priority'"
              :label="option.text"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item class="form-actions">
          <el-button type="primary" plain @click="handleSearch">查询</el-button>
          <el-button text @click="handleReset">清除所有条件</el-button>
        </el-form-item>
      </el-form>

      <div v-if="filterChips.length" class="filter-chips">
        <div v-for="chip in filterChips" :key="chip.key" class="filter-chip">
          <span>{{ chip.label }}</span>
          <span class="filter-chip__remove" @click="removeChip(chip.key)">×</span>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="table-toolbar">
        <div class="table-title">
          工单列表
          <span class="table-count">共 {{ total }} 条记录</span>
        </div>
        <el-button
          @click="$emit('export')"
          :disabled="!orders.length || exportLoading"
          :loading="exportLoading"
        >
          导出 CSV
        </el-button>
      </div>
      <el-table
        class="orders-table"
        :data="orders"
        v-loading="loading"
        stripe
        highlight-current-row
        @row-click="handleOpen"
      >
        <el-table-column prop="orderNo" label="工单编号" min-width="160" align="left" />
        <el-table-column
          prop="customerName"
          label="客户"
          min-width="160"
          show-overflow-tooltip
          align="left"
        />
        <el-table-column
          prop="description"
          label="描述"
          min-width="200"
          show-overflow-tooltip
          align="left"
        />
        <el-table-column prop="orderType" label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ orderTypeText(row.orderType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="priorityTag(row.priority)">
              {{ priorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" align="right">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" width="120" label="操作" align="right">
          <template #default="{ row }">
            <div class="table-operations">
              <el-button size="small" text type="primary" @click.stop="handleOpen(row)">
                查看
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="未找到匹配的工单">
            <el-button text size="small" @click="handleReset">清除筛选条件</el-button>
            <el-button v-if="canCreate" type="primary" size="small" @click="$emit('create')">
              新建工单
            </el-button>
          </el-empty>
        </template>
      </el-table>
      <div class="table-footer">
        <div class="table-meta">
          当前第 {{ page }} / {{ totalPages }} 页
        </div>
        <el-pagination
          background
          layout="prev, pager, next, jumper"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePaginationChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { Plus, Download } from '@element-plus/icons-vue';
import { workOrderApi, userApi } from '@/utils/api';

interface Option {
  text: string;
  value: string;
}

interface FilterPayload {
  status: string;
  orderType: string;
  priority: string;
  customer?: string;
  technicianId?: string;
  technicianName?: string;
}

type FilterChipKey = 'keyword' | 'status' | 'orderType' | 'priority' | 'customer' | 'technician';
type SuggestionItem = { value: string; id?: string };

const props = defineProps<{
  orders: any[];
  loading: boolean;
  canCreate: boolean;
  keyword: string;
  filters: FilterPayload;
  statusOptions: Option[];
  orderTypeOptions: Option[];
  priorityOptions: Option[];
  page: number;
  pageSize: number;
  total: number;
  exportLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'reset'): void;
  (e: 'load-more'): void;
  (e: 'create'): void;
  (e: 'export'): void;
  (e: 'open', row: any): void;
  (e: 'update:keyword', value: string): void;
  (e: 'update:filters', value: FilterPayload): void;
  (e: 'change-page', page: number): void;
}>();

const localKeyword = ref(props.keyword);
const localFilters = reactive<FilterPayload>({
  status: props.filters.status || '',
  orderType: props.filters.orderType || '',
  priority: props.filters.priority || '',
  customer: props.filters.customer || '',
  technicianId: props.filters.technicianId || '',
  technicianName: props.filters.technicianName || '',
});
const customerKeyword = ref(props.filters.customer || '');
const technicianKeyword = ref(props.filters.technicianName || '');

const totalPages = computed(() => (props.total > 0 ? Math.ceil(props.total / props.pageSize) : 1));

watch(
  () => props.keyword,
  value => {
    localKeyword.value = value;
  },
);

watch(
  () => props.filters,
  value => {
    Object.assign(localFilters, value);
    customerKeyword.value = value.customer || '';
    technicianKeyword.value = value.technicianName || '';
  },
  { deep: true },
);

watch(customerKeyword, value => {
  if (!value) {
    localFilters.customer = '';
  }
});

watch(technicianKeyword, value => {
  if (!value) {
    localFilters.technicianId = '';
    localFilters.technicianName = '';
  }
});

const statusLookup = computed(() =>
  Object.fromEntries(props.statusOptions.map(option => [option.value, option.text])),
);

const findLabel = (options: Option[], value: string) => {
  return options.find(option => option.value === value)?.text || value;
};

const filterChips = computed(() => {
  const chips: { key: FilterChipKey; label: string }[] = [];
  if (localKeyword.value) {
    chips.push({ key: 'keyword', label: `关键词：${localKeyword.value}` });
  }
  if (localFilters.status) {
    chips.push({ key: 'status', label: `状态：${statusLookup.value[localFilters.status] || localFilters.status}` });
  }
  if (localFilters.orderType) {
    chips.push({ key: 'orderType', label: `类型：${findLabel(props.orderTypeOptions, localFilters.orderType)}` });
  }
  if (localFilters.priority) {
    chips.push({ key: 'priority', label: `优先级：${findLabel(props.priorityOptions, localFilters.priority)}` });
  }
  if (localFilters.customer) {
    chips.push({ key: 'customer', label: `客户：${localFilters.customer}` });
  }
  if (localFilters.technicianId) {
    chips.push({
      key: 'technician',
      label: `工程师：${localFilters.technicianName || technicianKeyword.value || '已选择'}`,
    });
  }
  return chips;
});

const emitFilterChange = () => {
  const keywordValue = localKeyword.value.trim();
  localKeyword.value = keywordValue;
  emit('update:keyword', keywordValue);
  emit('update:filters', { ...localFilters });
};

const handleSearch = () => {
  emitFilterChange();
  emit('search');
};

const handleReset = () => {
  localKeyword.value = '';
  localFilters.status = '';
  localFilters.orderType = '';
  localFilters.priority = '';
  localFilters.customer = '';
  localFilters.technicianId = '';
  localFilters.technicianName = '';
  customerKeyword.value = '';
  technicianKeyword.value = '';
  emit('update:keyword', '');
  emit('update:filters', { ...localFilters });
  emit('reset');
};

const removeChip = (key: FilterChipKey) => {
  switch (key) {
    case 'keyword':
      localKeyword.value = '';
      break;
    case 'status':
      localFilters.status = '';
      break;
    case 'orderType':
      localFilters.orderType = '';
      break;
    case 'priority':
      localFilters.priority = '';
      break;
    case 'customer':
      localFilters.customer = '';
      customerKeyword.value = '';
      break;
    case 'technician':
      localFilters.technicianId = '';
      localFilters.technicianName = '';
      technicianKeyword.value = '';
      break;
  }
  handleSearch();
};

const handleStatusChange = () => {
  handleSearch();
};

const handlePaginationChange = (page: number) => {
  emit('change-page', page);
};

const technicianPool = ref<SuggestionItem[]>([]);
const techniciansLoaded = ref(false);

const ensureTechnicians = async () => {
  if (techniciansLoaded.value) return;
  try {
    const res = await userApi.technicians();
    technicianPool.value = (res.data.data || []).map((item: any) => ({
      value: item.name,
      id: item.id,
    }));
    techniciansLoaded.value = true;
  } catch (error) {
    console.error('获取工程师列表失败', error);
  }
};

const queryTechnicians = async (queryString: string, cb: (items: SuggestionItem[]) => void) => {
  await ensureTechnicians();
  const keyword = queryString?.trim().toLowerCase();
  const list = technicianPool.value
    .filter(item => !keyword || item.value.toLowerCase().includes(keyword))
    .slice(0, 8);
  cb(list);
};

const handleTechnicianSelect = (item: SuggestionItem) => {
  if (!item) return;
  localFilters.technicianId = item.id || '';
  localFilters.technicianName = item.value;
  technicianKeyword.value = item.value;
  handleSearch();
};

const handleTechnicianClear = () => {
  localFilters.technicianId = '';
  localFilters.technicianName = '';
  technicianKeyword.value = '';
  handleSearch();
};

const fetchCustomerSuggestions = async (queryString: string, cb: (items: SuggestionItem[]) => void) => {
  const keyword = queryString.trim();
  if (!keyword) {
    cb([]);
    return;
  }
  try {
    const res = await workOrderApi.suggestCustomers(keyword);
    const list = (res.data.data || []).map((item: any) => ({
      value: item.name,
    }));
    cb(list);
  } catch (error) {
    console.error('客户联想失败', error);
    cb([]);
  }
};

const handleCustomerSelect = (item: SuggestionItem) => {
  if (!item) return;
  localFilters.customer = item.value;
  customerKeyword.value = item.value;
  handleSearch();
};

const handleCustomerClear = () => {
  localFilters.customer = '';
  customerKeyword.value = '';
  handleSearch();
};

const priorityText = (priority: string) => {
  const map: Record<string, string> = {
    NORMAL: '普通',
    URGENT: '紧急',
    VERY_URGENT: '非常紧急',
  };
  return map[priority] || priority;
};

const priorityTag = (priority: string) => {
  switch (priority) {
    case 'VERY_URGENT':
      return 'danger';
    case 'URGENT':
      return 'warning';
    default:
      return 'success';
  }
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

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm');
};

const handleOpen = (row: any) => {
  emit('open', row);
};
</script>

<style scoped>
.desktop-orders {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  position: sticky;
  top: calc(var(--desktop-header-height) + 16px);
  z-index: 5;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filters-title {
  font-size: 18px;
  font-weight: 600;
}

.filters-subtitle {
  font-size: 13px;
  color: var(--text-color-2);
  margin-top: 4px;
}

.status-segment {
  margin-bottom: 16px;
}

.status-segment :deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px 24px;
  align-items: flex-end;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.filter-form :deep(.el-form-item__label) {
  color: var(--text-color-2);
  font-size: 12px;
}

.filter-form .form-actions {
  justify-self: flex-end;
  white-space: nowrap;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
}

.table-card {
  padding-top: 8px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 12px;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
}

.table-count {
  font-size: 13px;
  color: var(--text-color-2);
  margin-left: 8px;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0 4px;
}

.table-meta {
  font-size: 13px;
  color: var(--text-color-2);
}

.table-operations {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
