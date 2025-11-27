<template>
  <div class="order-detail-page">
    <van-nav-bar title="工单详情" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px" />

    <template v-else-if="order">
      <!-- 状态卡片 -->
      <div class="status-card" :class="`status-card--${order.status.toLowerCase()}`">
        <div class="status-text">{{ statusText(order.status) }}</div>
        <div class="status-desc">{{ statusDesc }}</div>
      </div>

      <!-- 基本信息 -->
      <van-cell-group title="工单信息">
        <van-cell title="工单编号" :value="order.orderNo" />
        <van-cell title="工单类型" :value="orderTypeText(order.orderType)" />
        <van-cell v-if="isCompanyOrder(order.orderType) && order.workType" title="工作类型" :value="workTypeText(order.workType)" />
        <van-cell v-if="isCompanyOrder(order.orderType)" title="优先级">
          <template #value>
            <span :class="['priority-tag', `priority-tag--${order.priority.toLowerCase()}`]">
              {{ priorityText(order.priority) }}
            </span>
          </template>
        </van-cell>
        <van-cell title="工单描述" :label="order.description" />
        <van-cell v-if="order.estimatedDate" title="预计派工" :value="formatEstimatedTime(order.estimatedDate, order.estimatedPeriod)" />
      </van-cell-group>

      <!-- 客户信息 -->
      <van-cell-group title="客户信息">
        <van-cell title="客户名称" :value="order.customerName" />
        <van-cell v-if="order.customerContact" title="联系人" :value="order.customerContact" />
        <van-cell v-if="order.customerPhone" title="联系电话" :value="order.customerPhone" is-link :url="`tel:${order.customerPhone}`" />
      </van-cell-group>

      <!-- 渠道信息（公司类型且有渠道） -->
      <van-cell-group v-if="isCompanyOrder(order.orderType) && order.hasChannel" title="渠道信息">
        <van-cell title="渠道名称" :value="order.channelName" />
        <van-cell v-if="order.channelContact" title="渠道联系人" :value="order.channelContact" />
        <van-cell v-if="order.channelPhone" title="渠道电话" :value="order.channelPhone" is-link :url="`tel:${order.channelPhone}`" />
      </van-cell-group>

      <!-- 厂家信息（厂家类型） -->
      <van-cell-group v-if="isManufacturerOrder(order.orderType)" title="厂家信息">
        <van-cell title="厂家对接人" :value="order.manufacturerContact || '-'" />
      </van-cell-group>

      <!-- 人员信息 -->
      <van-cell-group title="人员信息">
        <van-cell title="提交人" :value="order.submitter?.name || '-'" />
        <van-cell v-if="order.relatedSales" title="关联销售" :value="order.relatedSales.name" />
        <van-cell title="服务工程师" :value="technicianNames" />
        <template v-if="order.technicianList && order.technicianList.length > 0">
          <van-cell
            v-for="tech in order.technicianList"
            :key="tech.id"
            :title="tech.name"
            :value="tech.phone || '-'"
            :is-link="!!tech.phone"
            :url="tech.phone ? `tel:${tech.phone}` : undefined"
          >
            <template #label>
              <span class="tech-label">工程师电话</span>
            </template>
          </van-cell>
        </template>
      </van-cell-group>

      <!-- 时间信息 -->
      <van-cell-group title="时间信息">
        <van-cell title="创建时间" :value="formatTime(order.createdAt)" />
        <van-cell v-if="order.acceptedAt" title="接单时间" :value="formatTime(order.acceptedAt)" />
        <van-cell v-if="order.startedAt" title="开始服务" :value="formatTime(order.startedAt)" />
        <van-cell v-if="order.completedAt" title="完成时间" :value="formatTime(order.completedAt)" />
      </van-cell-group>

      <!-- 服务信息（已完成时显示） -->
      <van-cell-group v-if="order.status === 'DONE'" title="服务信息">
        <van-cell title="服务小结" :label="order.serviceSummary || '-'" />
      </van-cell-group>

      <!-- 评价信息 -->
      <van-cell-group v-if="order.evaluation" title="服务评价">
        <van-cell title="服务质量">
          <template #value>
            <van-rate v-model="order.evaluation.qualityRating" readonly />
          </template>
        </van-cell>
        <van-cell title="响应速度">
          <template #value>
            <van-rate v-model="order.evaluation.responseRating" readonly />
          </template>
        </van-cell>
        <van-cell v-if="order.evaluation.customerFeedback" title="客户反馈" :label="order.evaluation.customerFeedback" />
        <van-cell v-if="order.evaluation.improvementSuggestion" title="改进建议" :label="order.evaluation.improvementSuggestion" />
      </van-cell-group>

      <!-- 操作按钮 -->
      <div class="action-buttons" v-if="showActions">
        <!-- 技术人员操作 -->
        <template v-if="isTechnician">
          <van-button
            v-if="order.status === 'PENDING'"
            type="primary"
            block
            @click="handleAccept"
          >
            确认接单
          </van-button>
          <van-button
            v-if="order.status === 'PENDING'"
            type="default"
            block
            @click="showRejectDialog = true"
          >
            拒绝接单
          </van-button>
          <van-button
            v-if="order.status === 'ACCEPTED'"
            type="primary"
            block
            @click="handleStart"
          >
            开始服务
          </van-button>
          <van-button
            v-if="order.status === 'IN_SERVICE'"
            type="primary"
            block
            @click="showCompletePopup = true"
          >
            完成服务
          </van-button>
        </template>

        <!-- 销售/提交人操作 -->
        <template v-if="isSubmitterOrSales">
          <van-button
            v-if="order.status === 'DONE' && !order.evaluation"
            type="primary"
            block
            @click="router.push(`/order/${order.id}/evaluate`)"
          >
            提交评价
          </van-button>
        </template>

        <!-- 通用取消操作 -->
        <van-button
          v-if="canCancel"
          type="default"
          block
          @click="showCancelDialog = true"
        >
          取消工单
        </van-button>
      </div>
    </template>

    <!-- 拒绝弹窗 -->
    <van-dialog
      v-model:show="showRejectDialog"
      title="拒绝接单"
      show-cancel-button
      @confirm="handleReject"
    >
      <van-field
        v-model="rejectReason"
        type="textarea"
        placeholder="请输入拒绝原因"
        rows="3"
        style="margin: 16px"
      />
    </van-dialog>

    <!-- 取消弹窗 -->
    <van-dialog
      v-model:show="showCancelDialog"
      title="取消工单"
      show-cancel-button
      @confirm="handleCancel"
    >
      <van-field
        v-model="cancelReason"
        type="textarea"
        placeholder="请输入取消原因"
        rows="3"
        style="margin: 16px"
      />
    </van-dialog>

    <!-- 完成服务弹窗 -->
    <van-popup v-model:show="showCompletePopup" position="bottom" round style="max-height: 80%">
      <div class="complete-form">
        <div class="form-title">完成服务</div>
        <van-form @submit="handleComplete">
          <van-cell-group inset>
            <van-field
              v-model="completeForm.serviceSummary"
              type="textarea"
              label="服务小结"
              placeholder="请输入服务小结"
              rows="3"
              required
              :rules="[{ required: true, message: '请输入服务小结' }]"
            />
          </van-cell-group>
          <div style="margin: 16px">
            <van-button type="primary" block native-type="submit">确认完成</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast, showConfirmDialog } from 'vant';
import { useUserStore } from '@/stores/user';
import { workOrderApi } from '@/utils/api';
import {
  isCompanyOrder,
  isManufacturerOrder,
  isTechnician as checkTechnician,
  isSales,
  isAdmin,
} from '@/types/enums';
import dayjs from 'dayjs';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const orderId = route.params.id as string;
const loading = ref(true);
const order = ref<any>(null);

const showRejectDialog = ref(false);
const showCancelDialog = ref(false);
const showCompletePopup = ref(false);
const rejectReason = ref('');
const cancelReason = ref('');
const completeForm = ref({
  serviceSummary: '',
});

const technicianNames = computed(() => {
  if (order.value?.technicianList && order.value.technicianList.length > 0) {
    return order.value.technicianList.map((t: any) => t.name).join('、');
  }
  return '未分配';
});

const isTechnician = computed(() => {
  if (!order.value?.technicianList || !checkTechnician(userStore.user)) return false;
  return order.value.technicianList.some((t: any) => t.id === userStore.user?.id);
});

const isSubmitterOrSales = computed(() => {
  if (!order.value) return false;
  const userId = userStore.user?.id;
  return order.value.submitterId === userId || order.value.relatedSalesId === userId;
});

const showActions = computed(() => {
  if (!order.value) return false;
  const status = order.value.status;
  return status !== 'CANCELLED' && status !== 'REJECTED';
});

const canCancel = computed(() => {
  if (!order.value) return false;
  const status = order.value.status;
  const user = userStore.user;
  // 只有技术员、销售、管理员才能取消工单（不包括审计）
  return ['PENDING', 'ACCEPTED'].includes(status) &&
    (checkTechnician(user) || isSales(user) || isAdmin(user));
});

const statusDesc = computed(() => {
  if (!order.value) return '';
  const status = order.value.status;
  const map: Record<string, string> = {
    PENDING: '等待技术人员确认接单',
    ACCEPTED: '技术人员已接单，等待开始服务',
    IN_SERVICE: '技术人员正在提供服务',
    DONE: '服务已完成',
    CANCELLED: '工单已取消',
    REJECTED: '技术人员已拒绝接单',
  };
  return map[status] || '';
});

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

const orderTypeText = (type: string) => {
  const map: Record<string, string> = {
    CF: '公司外勤',
    CO: '公司内勤',
    MF: '厂家外勤',
    MO: '厂家内勤',
  };
  return map[type] || type;
};

const workTypeText = (type: string) => {
  const map: Record<string, string> = {
    COMMUNICATION: '交流',
    TEST: '测试',
    DELIVERY: '交付',
    ISSUE: '问题处理',
    INSPECTION: '巡检',
    TRAINING: '培训',
    OTHER: '其他',
  };
  return map[type] || type;
};

const priorityText = (priority: string) => {
  const map: Record<string, string> = {
    NORMAL: '普通',
    URGENT: '紧急',
    VERY_URGENT: '非常紧急',
  };
  return map[priority] || priority;
};

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm');
};

const formatEstimatedTime = (date: string, period: string) => {
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  const periodText = period === 'AM' ? '上午' : '下午';
  return `${dateStr} ${periodText}`;
};

const fetchOrder = async () => {
  loading.value = true;
  try {
    const res = await workOrderApi.detail(orderId);
    order.value = res.data.data;
  } catch (error) {
    showToast('获取工单详情失败');
  } finally {
    loading.value = false;
  }
};

const handleAccept = async () => {
  try {
    await showConfirmDialog({ title: '确认接单', message: '确认接收这个工单吗？' });
    await workOrderApi.accept(orderId);
    showToast('接单成功');
    fetchOrder();
  } catch (error: any) {
    if (error !== 'cancel') {
      showToast(error?.response?.data?.message || '操作失败');
    }
  }
};

const handleReject = async () => {
  try {
    await workOrderApi.reject(orderId, rejectReason.value);
    showToast('已拒绝接单');
    rejectReason.value = '';
    fetchOrder();
  } catch (error: any) {
    showToast(error?.response?.data?.message || '操作失败');
  }
};

const handleStart = async () => {
  try {
    await showConfirmDialog({ title: '开始服务', message: '确认开始服务吗？' });
    await workOrderApi.start(orderId);
    showToast('已开始服务');
    fetchOrder();
  } catch (error: any) {
    if (error !== 'cancel') {
      showToast(error?.response?.data?.message || '操作失败');
    }
  }
};

const handleComplete = async () => {
  try {
    await workOrderApi.complete(orderId, completeForm.value);
    showToast('服务已完成');
    showCompletePopup.value = false;
    fetchOrder();
  } catch (error: any) {
    showToast(error?.response?.data?.message || '操作失败');
  }
};

const handleCancel = async () => {
  try {
    await workOrderApi.cancel(orderId, cancelReason.value);
    showToast('工单已取消');
    cancelReason.value = '';
    fetchOrder();
  } catch (error: any) {
    showToast(error?.response?.data?.message || '操作失败');
  }
};

onMounted(() => {
  fetchOrder();
});
</script>

<style lang="scss" scoped>
.order-detail-page {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 100px;
}

.status-card {
  padding: 24px 16px;
  text-align: center;
  color: #fff;

  &--pending {
    background: linear-gradient(135deg, #fa8c16 0%, #f5222d 100%);
  }

  &--accepted {
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  }

  &--in_service {
    background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  }

  &--done {
    background: linear-gradient(135deg, #8c8c8c 0%, #595959 100%);
  }

  &--cancelled,
  &--rejected {
    background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
  }

  .status-text {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .status-desc {
    font-size: 14px;
    opacity: 0.9;
  }
}

.priority-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &--normal {
    background: #f0f0f0;
    color: #666;
  }
  &--urgent {
    background: #fff7e6;
    color: #fa8c16;
  }
  &--very_urgent {
    background: #fff1f0;
    color: #f5222d;
  }
}

.tech-label {
  font-size: 12px;
  color: #999;
}

.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 12px;
  padding-bottom: calc(12px + constant(safe-area-inset-bottom));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));

  .van-button {
    flex: 1;
  }
}

.complete-form {
  padding: 16px;

  .form-title {
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 16px;
  }
}
</style>
