<template>
  <div v-if="isDesktop" class="order-detail-desktop">
    <el-page-header @back="router.back()" content="工单详情" />

    <el-skeleton v-if="loading" :loading="loading" animated style="margin-top: 16px">
      <template #template>
        <el-skeleton-item variant="h3" style="width: 40%" />
        <el-skeleton-item variant="text" v-for="i in 5" :key="i" />
      </template>
    </el-skeleton>

    <template v-else>
      <el-card v-if="order" class="status-banner" shadow="always">
        <div class="status-banner__text">
          <div class="title">{{ statusText(order.status) }}</div>
          <div class="desc">{{ statusDesc }}</div>
        </div>
        <el-tag :type="desktopStatusTag(order.status)">
          {{ statusText(order.status) }}
        </el-tag>
      </el-card>

      <el-row v-if="order" :gutter="16" class="desktop-sections">
        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>工单信息</template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="工单编号">{{ order.orderNo }}</el-descriptions-item>
              <el-descriptions-item label="工单类型">{{ orderTypeText(order.orderType) }}</el-descriptions-item>
              <el-descriptions-item v-if="isCompanyOrder(order.orderType) && order.workType" label="工作类型">
                {{ workTypeText(order.workType) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="isCompanyOrder(order.orderType)" label="优先级">
                <el-tag :type="priorityTag(order.priority)">
                  {{ priorityText(order.priority) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="工单描述" :span="2">
                {{ order.description }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.estimatedDate" label="预计派工" :span="2">
                {{ formatEstimatedTime(order.estimatedDate, order.estimatedPeriod) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>客户信息</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="客户名称">{{ order.customerName }}</el-descriptions-item>
              <el-descriptions-item v-if="order.customerContact" label="联系人">
                {{ order.customerContact }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.customerPhone" label="联系电话">
                {{ order.customerPhone }}
              </el-descriptions-item>
              <el-descriptions-item v-if="isCompanyOrder(order.orderType) && order.hasChannel" label="渠道名称">
                {{ order.channelName }}
              </el-descriptions-item>
              <el-descriptions-item v-if="isManufacturerOrder(order.orderType)" label="厂家对接人">
                {{ order.manufacturerContact || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>人员信息</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="提交人">{{ order.submitter?.name || '-' }}</el-descriptions-item>
              <el-descriptions-item v-if="order.relatedSales" label="关联销售">
                {{ order.relatedSales.name }}
              </el-descriptions-item>
              <el-descriptions-item label="工程师">{{ technicianNames }}</el-descriptions-item>
            </el-descriptions>
            <el-table
              v-if="order.technicianList && order.technicianList.length"
              :data="order.technicianList"
              size="small"
              class="tech-table"
            >
              <el-table-column prop="name" label="工程师" />
              <el-table-column prop="phone" label="电话" />
            </el-table>
          </el-card>
        </el-col>

        <el-col :md="12" :sm="24">
          <el-card shadow="never">
            <template #header>时间信息</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="创建时间">{{ formatTime(order.createdAt) }}</el-descriptions-item>
              <el-descriptions-item v-if="order.estimatedStartDate" label="预计开始时间">
                {{ formatEstimatedDateTime(order.estimatedStartDate, order.estimatedStartPeriod) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.estimatedEndDate" label="预计结束时间">
                {{ formatEstimatedDateTime(order.estimatedEndDate, order.estimatedEndPeriod) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.acceptedAt" label="接单时间">
                {{ formatTime(order.acceptedAt) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.startedAt" label="开始服务">
                {{ formatTime(order.startedAt) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.completedAt" label="完成时间">
                {{ formatTime(order.completedAt) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.actualServiceDays !== null && order.actualServiceDays !== undefined" label="实际服务时间">
                {{ order.actualServiceDays }} 天
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :span="24" v-if="order.status === 'DONE' && order.serviceSummary">
          <el-card shadow="never">
            <template #header>服务信息</template>
            <div class="text-block">{{ order.serviceSummary }}</div>
          </el-card>
        </el-col>

        <el-col :span="24" v-if="order.evaluation">
          <el-card shadow="never">
            <template #header>服务评价</template>
            <el-descriptions :column="2">
              <el-descriptions-item label="服务质量">{{ order.evaluation.qualityRating }} ⭐</el-descriptions-item>
              <el-descriptions-item label="响应速度">{{ order.evaluation.responseRating }} ⭐</el-descriptions-item>
            </el-descriptions>
            <div class="text-block" v-if="order.evaluation.customerFeedback">
              <strong>客户反馈：</strong>{{ order.evaluation.customerFeedback }}
            </div>
            <div class="text-block" v-if="order.evaluation.improvementSuggestion">
              <strong>改进建议：</strong>{{ order.evaluation.improvementSuggestion }}
            </div>
          </el-card>
        </el-col>

        <el-col :span="24" v-if="['IN_SERVICE', 'DONE'].includes(order.status)">
          <FollowUpListDesktop
            :work-order-id="orderId"
            :user-id="userStore.user?.id || ''"
          />
        </el-col>
      </el-row>

      <el-empty v-else description="未找到工单信息" />

      <div class="desktop-actions" v-if="order && showActions">
        <template v-if="isTechnician">
          <el-button
            v-if="order.status === 'PENDING'"
            type="primary"
            @click="handleAccept"
          >
            确认接单
          </el-button>
          <el-button
            v-if="order.status === 'PENDING'"
            type="danger"
            plain
            @click="showRejectDialog = true"
          >
            拒绝接单
          </el-button>
          <el-button
            v-if="order.status === 'ACCEPTED'"
            type="primary"
            @click="handleStart"
          >
            开始服务
          </el-button>
          <el-button
            v-if="order.status === 'IN_SERVICE'"
            type="success"
            @click="showCompletePopup = true"
          >
            完成服务
          </el-button>
        </template>

        <el-button
          v-if="isSubmitterOrSales && order.status === 'DONE' && !order.evaluation"
          type="primary"
          @click="router.push(`/order/${order.id}/evaluate`)"
        >
          提交评价
        </el-button>

        <el-button
          v-if="canCancel"
          type="danger"
          plain
          @click="showCancelDialog = true"
        >
          取消工单
        </el-button>
      </div>

      <el-dialog
        v-model="showRejectDialog"
        title="拒绝接单"
        width="420px"
      >
        <el-input
          v-model="rejectReason"
          type="textarea"
          :rows="3"
          placeholder="请输入拒绝原因"
        />
        <template #footer>
          <el-button @click="showRejectDialog = false">取消</el-button>
          <el-button type="primary" @click="handleReject">确认</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="showCancelDialog"
        title="取消工单"
        width="420px"
      >
        <el-input
          v-model="cancelReason"
          type="textarea"
          :rows="3"
          placeholder="请输入取消原因"
        />
        <template #footer>
          <el-button @click="showCancelDialog = false">返回</el-button>
          <el-button type="danger" @click="handleCancel">确认取消</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="showCompletePopup"
        title="完成服务"
        width="480px"
      >
        <el-form @submit.prevent label-width="100px">
          <el-form-item label="服务小结" required>
            <el-input
              v-model="completeForm.serviceSummary"
              type="textarea"
              :rows="4"
              placeholder="请输入服务小结"
            />
          </el-form-item>
          <el-form-item label="实际服务时间" required>
            <el-input
              v-model="completeForm.actualServiceDays"
              placeholder="请输入天数"
              style="width: 150px"
            >
              <template #append>天</template>
            </el-input>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCompletePopup = false">取消</el-button>
          <el-button type="primary" @click="handleComplete">确认</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
  <div v-else class="order-detail-page">
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
        <van-cell v-if="order.estimatedStartDate" title="预计开始时间" :value="formatEstimatedDateTime(order.estimatedStartDate, order.estimatedStartPeriod)" />
        <van-cell v-if="order.estimatedEndDate" title="预计结束时间" :value="formatEstimatedDateTime(order.estimatedEndDate, order.estimatedEndPeriod)" />
        <van-cell v-if="order.acceptedAt" title="接单时间" :value="formatTime(order.acceptedAt)" />
        <van-cell v-if="order.startedAt" title="开始服务" :value="formatTime(order.startedAt)" />
        <van-cell v-if="order.completedAt" title="完成时间" :value="formatTime(order.completedAt)" />
        <van-cell v-if="order.actualServiceDays !== null && order.actualServiceDays !== undefined" title="实际服务时间" :value="`${order.actualServiceDays} 天`" />
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

      <!-- 跟进记录（服务中及已完成时显示） -->
      <FollowUpList
        v-if="['IN_SERVICE', 'DONE'].includes(order.status)"
        :work-order-id="orderId"
        :user-id="userStore.user?.id || ''"
        style="margin-top: 12px"
      />

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
            <van-field
              v-model="completeForm.actualServiceDays"
              type="number"
              label="实际服务时间"
              placeholder="请输入天数"
              required
              :rules="[{ required: true, message: '请输入实际服务时间' }]"
            >
              <template #button>天</template>
            </van-field>
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
import { useUiStore } from '@/stores/ui';
import { workOrderApi } from '@/utils/api';
import FollowUpList from '@/components/FollowUpList.vue';
import FollowUpListDesktop from '@/components/FollowUpListDesktop.vue';
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
const uiStore = useUiStore();

const orderId = route.params.id as string;
const loading = ref(true);
const order = ref<any>(null);
const isDesktop = computed(() => uiStore.isDesktop);

const showRejectDialog = ref(false);
const showCancelDialog = ref(false);
const showCompletePopup = ref(false);
const rejectReason = ref('');
const cancelReason = ref('');
const completeForm = ref({
  serviceSummary: '',
  actualServiceDays: '',
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

const priorityTag = (priority: string) => {
  switch (priority) {
    case 'VERY_URGENT':
      return 'danger';
    case 'URGENT':
    case 'HIGH':
      return 'warning';
    default:
      return 'info';
  }
};

const desktopStatusTag = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'ACCEPTED':
      return 'primary';
    case 'IN_SERVICE':
      return 'success';
    case 'DONE':
      return 'info';
    case 'CANCELLED':
    case 'REJECTED':
      return 'danger';
    default:
      return '';
  }
};

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm');
};

const formatEstimatedTime = (date: string, period: string) => {
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  const periodText = period === 'AM' ? '上午' : '下午';
  return `${dateStr} ${periodText}`;
};

const formatEstimatedDateTime = (date: string, period: string) => {
  const periodText = period === 'AM' ? '上午' : '下午';
  return `${dayjs(date).format('YYYY-MM-DD')} ${periodText} ${dayjs(date).format('HH:mm')}`;
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
    showRejectDialog.value = false;
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
    showCancelDialog.value = false;
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
.order-detail-desktop {
  padding: 24px;
}

.status-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;

  &__text {
    .title {
      font-size: 20px;
      font-weight: 600;
    }
    .desc {
      color: #909399;
      margin-top: 4px;
    }
  }
}

.desktop-sections {
  margin-top: 16px;

  .text-block {
    background: #f5f7fa;
    padding: 12px;
    border-radius: 6px;
    line-height: 1.6;
  }

  .tech-table {
    margin-top: 12px;
  }
}

.desktop-actions {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

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
