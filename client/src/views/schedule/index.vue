<template>
  <div v-if="isDesktop" class="schedule-page">
    <el-card shadow="never" class="control-bar">
      <div class="control-info">
        <h2>派工总览</h2>
        <p>{{ weekRangeLabel }}</p>
      </div>
      <div class="control-actions">
        <el-button @click="shiftWeek(-1)" :icon="ArrowLeftBold">上一周</el-button>
        <el-button @click="shiftWeek(1)" :icon="ArrowRightBold">下一周</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="grid-card">
      <el-table :data="rows" v-loading="loading" border>
        <el-table-column prop="name" label="工程师" fixed width="160" />
        <el-table-column
          v-for="day in days"
          :key="day.key"
          :column-key="day.key"
        >
          <template #header>
            <div class="day-header">
              <span class="day-week">{{ day.label }}</span>
              <span class="day-date">{{ formatDay(day.date) }}</span>
            </div>
          </template>
          <template #default="{ row }">
            <div class="cell-content">
              <div
                v-for="item in row.slots[day.key]"
                :key="item.orderId"
                class="assignment"
                role="button"
                tabindex="0"
                :title="`查看工单 ${item.orderNo}`"
                @click="openOrder(item.orderId)"
                @keydown.enter="openOrder(item.orderId)"
                @keydown.space.prevent="openOrder(item.orderId)"
              >
                <div class="assignment-title">{{ item.customerName || '未命名客户' }}</div>
                <div class="assignment-meta">{{ orderTypeText(item.orderType) }}</div>
                <div class="assignment-no">{{ item.orderNo }}</div>
              </div>
              <span v-if="!row.slots[day.key].length" class="empty-cell">-</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !rows.length" description="本周暂无派工安排" />
    </el-card>
  </div>
  <div v-else class="schedule-mobile">
    <div class="mobile-header">
      <div>
        <h3>派工总览</h3>
        <p>{{ weekRangeLabel }}</p>
      </div>
      <div class="mobile-actions">
        <van-button size="small" plain type="primary" @click="shiftWeek(-1)">上一周</van-button>
        <van-button size="small" plain type="primary" @click="shiftWeek(1)">下一周</van-button>
      </div>
    </div>

    <div v-if="loading" class="mobile-loading">
      <van-loading size="24px">加载中...</van-loading>
    </div>
    <template v-else>
      <div
        v-for="day in mobileDays"
        :key="day.key"
        class="mobile-day"
      >
        <div class="mobile-day__header">
          <div class="mobile-day__title">
            <span class="mobile-day__weekday">{{ day.label }}</span>
            <span class="mobile-day__date">{{ formatDay(day.date) }}</span>
          </div>
        </div>
        <template v-if="day.engineers.length">
          <div
            v-for="engineer in day.engineers"
            :key="engineer.id"
            class="mobile-engineer"
          >
            <div class="mobile-engineer__name">{{ engineer.name }}</div>
            <div
              v-for="item in engineer.assignments"
              :key="item.orderId"
              class="mobile-assignment"
              role="button"
              tabindex="0"
              :title="`查看工单 ${item.orderNo}`"
              @click="openOrder(item.orderId)"
              @keydown.enter="openOrder(item.orderId)"
              @keydown.space.prevent="openOrder(item.orderId)"
            >
              <div class="mobile-assignment__customer">{{ item.customerName || '未命名客户' }}</div>
              <div class="mobile-assignment__meta">
                <span>{{ orderTypeText(item.orderType) }}</span>
                <span>{{ item.orderNo }}</span>
              </div>
            </div>
          </div>
        </template>
        <van-empty v-else class="mobile-day__empty" description="暂无派工" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ArrowLeftBold, ArrowRightBold } from '@element-plus/icons-vue';
import { scheduleApi } from '@/utils/api';
import { useUiStore } from '@/stores/ui';
import { useUserStore } from '@/stores/user';
import { isAdmin, isSystemAdmin } from '@/types/enums';
import { useRouter } from 'vue-router';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');

interface ScheduleDay {
  key: string;
  label: string;
  date: string;
}

interface Assignment {
  day: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  orderType: string;
  description: string | null;
}

interface TechnicianRow {
  id: string;
  name: string;
  assignments: Assignment[];
}

interface MobileEngineer {
  id: string;
  name: string;
  assignments: Assignment[];
}

interface MobileDay extends ScheduleDay {
  engineers: MobileEngineer[];
}

const uiStore = useUiStore();
const userStore = useUserStore();
const router = useRouter();

if (!(isAdmin(userStore.user) || isSystemAdmin(userStore.user))) {
  router.replace('/workbench');
}

const loading = ref(false);
const days = ref<ScheduleDay[]>([]);
const technicians = ref<TechnicianRow[]>([]);
const selectedWeekStart = ref(getInitialWeekStart());

const isDesktop = computed(() => uiStore.isDesktop);

const rows = computed(() =>
  technicians.value.map(tech => {
    const slots: Record<string, Assignment[]> = {};
    days.value.forEach(day => {
      slots[day.key] = tech.assignments.filter(assignment => assignment.day === day.key);
    });
    return {
      id: tech.id,
      name: tech.name,
      slots,
    };
  }),
);

const mobileDays = computed<MobileDay[]>(() =>
  days.value.map(day => {
    const engineers = technicians.value
      .map(tech => ({
        id: tech.id,
        name: tech.name,
        assignments: tech.assignments.filter(assignment => assignment.day === day.key),
      }))
      .filter(engineer => engineer.assignments.length > 0);

    return {
      ...day,
      engineers,
    };
  }),
);

const weekRangeLabel = computed(() => {
  if (!days.value.length) return '';
  const start = dayjs(days.value[0].date).format('YYYY-MM-DD');
  const end = dayjs(days.value[days.value.length - 1].date).format('YYYY-MM-DD');
  return `${start} 至 ${end}`;
});

function formatDay(date: string) {
  return dayjs(date).format('MM-DD');
}

function getInitialWeekStart() {
  const now = dayjs().tz('Asia/Shanghai');
  // 周日18点后显示下周
  let target = now;
  if (now.day() === 0 && now.hour() >= 18) {
    target = now.add(1, 'day');
  }
  // 计算本周一
  const weekday = target.day();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return target.add(diff, 'day').format('YYYY-MM-DD');
}

const fetchSchedule = async () => {
  loading.value = true;
  try {
    const res = await scheduleApi.overview({ weekStart: selectedWeekStart.value });
    days.value = res.data.data.days;
    technicians.value = res.data.data.technicians;
  } catch (error) {
    console.error('获取派工总览失败', error);
  } finally {
    loading.value = false;
  }
};

const shiftWeek = (offset: number) => {
  const date = dayjs(selectedWeekStart.value).tz('Asia/Shanghai');
  selectedWeekStart.value = date.add(offset * 7, 'day').format('YYYY-MM-DD');
  fetchSchedule();
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

const openOrder = (orderId: string) => {
  if (!orderId) return;
  router.push({ name: 'OrderDetail', params: { id: orderId } });
};

onMounted(fetchSchedule);
</script>

<style scoped>
.schedule-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-info h2 {
  margin: 0 0 4px;
}

.control-info p {
  margin: 0;
  color: #909399;
}

.control-actions {
  display: flex;
  gap: 8px;
}

.grid-card {
  overflow-x: auto;
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}

.day-week {
  font-weight: 600;
}

.day-date {
  font-size: 12px;
  color: #909399;
}

.cell-content {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assignment {
  padding: 8px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.assignment-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.assignment-meta {
  font-size: 12px;
  color: #909399;
}

.assignment-no {
  font-size: 12px;
  color: #c0c4cc;
}

.assignment:hover,
.assignment:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
  outline: none;
}

.empty-cell {
  font-size: 12px;
  color: #c0c4cc;
}

.schedule-mobile {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mobile-header h3 {
  margin: 0;
  font-size: 16px;
}

.mobile-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

.mobile-actions {
  display: flex;
  gap: 8px;
}

.mobile-loading {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.mobile-day {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mobile-day__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mobile-day__weekday {
  font-weight: 600;
  margin-right: 6px;
}

.mobile-day__date {
  font-size: 12px;
  color: #909399;
}

.mobile-engineer {
  margin-top: 8px;
}

.mobile-engineer__name {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}

.mobile-assignment {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f7f8fa;
  border: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 8px;
}

.mobile-assignment:last-child {
  margin-bottom: 0;
}

.mobile-assignment__customer {
  font-weight: 600;
}

.mobile-assignment__meta {
  font-size: 12px;
  color: #606266;
  display: flex;
  justify-content: space-between;
}

.mobile-day__empty {
  --van-empty-padding: 16px 0 8px;
}
</style>
