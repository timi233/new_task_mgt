<template>
  <div v-if="isDesktop" class="order-create-desktop">
    <el-page-header @back="router.back()" content="创建工单" />
    <div class="desktop-form-wrapper">
      <el-form label-width="110px" class="desktop-form">
        <el-card shadow="never" class="section-card">
          <template #header>基本配置</template>
          <el-form-item label="工单类型">
            <el-radio-group v-model="form.orderType" class="inline-group">
              <el-radio-button label="CF">公司外勤</el-radio-button>
              <el-radio-button label="CO">公司内勤</el-radio-button>
              <el-radio-button label="MF">厂家外勤</el-radio-button>
              <el-radio-button label="MO">厂家内勤</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="isManufacturerOrder" label="厂家对接人" required>
            <el-input
              v-model="form.manufacturerContact"
              placeholder="请输入厂家对接人"
              @focus="showManufacturerSuggest = true"
              @blur="delayHideSuggest('manufacturer')"
            />
            <div v-if="showManufacturerSuggest && manufacturerSuggests.length" class="suggest-list">
              <div
                v-for="item in manufacturerSuggests"
                :key="item.id"
                class="suggest-item"
                @mousedown.prevent="selectManufacturerContact(item)"
              >
                {{ item.name }}
              </div>
            </div>
          </el-form-item>
        </el-card>

        <el-card shadow="never" class="section-card">
          <template #header>客户信息</template>
          <el-form-item label="客户名称" required>
            <el-input
              v-model="form.customerName"
              placeholder="请输入客户名称"
              @focus="showCustomerSuggest = true"
              @blur="delayHideSuggest('customer')"
              @input="searchCustomers"
            />
            <div v-if="showCustomerSuggest && customerSuggests.length" class="suggest-list">
              <div
                v-for="item in customerSuggests"
                :key="item.id"
                class="suggest-item"
                @mousedown.prevent="selectCustomer(item)"
              >
                <div class="suggest-name">{{ item.name }}</div>
                <div v-if="item.contactPerson" class="suggest-desc">{{ item.contactPerson }} {{ item.contactPhone }}</div>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="form.customerContact" placeholder="请输入联系人" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.customerPhone" placeholder="请输入联系电话" />
          </el-form-item>
        </el-card>

        <el-card v-if="isCompanyOrder" shadow="never" class="section-card">
          <template #header>渠道信息</template>
          <el-form-item label="通过渠道">
            <el-switch v-model="form.hasChannel" />
          </el-form-item>
          <template v-if="form.hasChannel">
            <el-form-item label="渠道名称" required>
              <el-input
                v-model="form.channelName"
                placeholder="请输入渠道名称"
                @focus="showChannelSuggest = true"
                @blur="delayHideSuggest('channel')"
                @input="searchChannels"
              />
              <div v-if="showChannelSuggest && channelSuggests.length" class="suggest-list">
                <div
                  v-for="item in channelSuggests"
                  :key="item.id"
                  class="suggest-item"
                  @mousedown.prevent="selectChannel(item)"
                >
                  <div class="suggest-name">{{ item.name }}</div>
                  <div v-if="item.contactPerson" class="suggest-desc">{{ item.contactPerson }} {{ item.contactPhone }}</div>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="渠道联系人">
              <el-input v-model="form.channelContact" placeholder="请输入渠道联系人" />
            </el-form-item>
            <el-form-item label="渠道电话">
              <el-input v-model="form.channelPhone" placeholder="请输入渠道电话" />
            </el-form-item>
          </template>
        </el-card>

        <el-card v-if="showRelatedSales" shadow="never" class="section-card">
          <template #header>关联销售</template>
          <el-form-item label="关联销售" required>
            <el-select
              v-model="form.relatedSalesId"
              placeholder="请选择关联销售"
              filterable
              style="width: 100%"
              @change="onSalesChange"
            >
              <el-option
                v-for="sale in salesList"
                :key="sale.id"
                :label="sale.name"
                :value="sale.id"
              >
                <div class="option-label">
                  <span>{{ sale.name }}</span>
                  <span class="option-desc" v-if="sale.department">{{ sale.department }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-card>

        <el-card shadow="never" class="section-card">
          <template #header>工单信息</template>
          <el-form-item v-if="isCompanyOrder" label="工作类型" required>
            <el-radio-group v-model="form.workType" class="inline-group">
              <el-radio-button label="COMMUNICATION">交流</el-radio-button>
              <el-radio-button label="TEST">测试</el-radio-button>
              <el-radio-button label="DELIVERY">交付</el-radio-button>
              <el-radio-button label="ISSUE">问题处理</el-radio-button>
              <el-radio-button label="INSPECTION">巡检</el-radio-button>
              <el-radio-button label="TRAINING">培训</el-radio-button>
              <el-radio-button label="OTHER">其他</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="isCompanyOrder" label="优先级">
            <el-select v-model="form.priority" placeholder="请选择优先级">
              <el-option label="普通" value="NORMAL" />
              <el-option label="紧急" value="URGENT" />
              <el-option label="非常紧急" value="VERY_URGENT" />
            </el-select>
          </el-form-item>
          <el-form-item label="工单描述" required>
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="请详细描述工单内容"
            />
          </el-form-item>
          <el-form-item label="预计开始">
            <div class="date-field">
              <el-date-picker
                v-model="form.estimatedStartDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                :disabled-date="disabledDate"
              />
              <el-select v-model="form.estimatedStartPeriod" class="period-select" placeholder="时段">
                <el-option label="上午" value="AM" />
                <el-option label="下午" value="PM" />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item label="预计结束">
            <div class="date-field">
              <el-date-picker
                v-model="form.estimatedEndDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                :disabled-date="disabledDate"
              />
              <el-select v-model="form.estimatedEndPeriod" class="period-select" placeholder="时段">
                <el-option label="上午" value="AM" />
                <el-option label="下午" value="PM" />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item v-if="estimatedDuration > 0" label="预计时长">
            <el-tag type="info">{{ estimatedDurationText }}</el-tag>
          </el-form-item>
          <el-form-item label="服务工程师" required>
            <el-select
              v-model="form.technicianIds"
              multiple
              placeholder="请选择服务工程师"
              filterable
              @change="updateTechnicianNames"
            >
              <el-option
                v-for="tech in technicians"
                :key="tech.id"
                :label="tech.name"
                :value="tech.id"
              >
                <div class="option-label">
                  <span>{{ tech.name }}</span>
                  <span class="option-desc" v-if="tech.department">{{ tech.department }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-card>

        <div class="form-actions">
          <el-button @click="router.back()">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            提交工单
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
  <div v-else class="order-create-page">
    <van-nav-bar title="创建工单" left-arrow @click-left="router.back()" />

    <van-form @submit="handleSubmit">
      <van-cell-group title="工单类型">
        <van-field name="orderType">
          <template #input>
            <van-radio-group v-model="form.orderType" direction="horizontal" class="order-type-group">
              <van-radio name="CF">公司外勤</van-radio>
              <van-radio name="CO">公司内勤</van-radio>
              <van-radio name="MF">厂家外勤</van-radio>
              <van-radio name="MO">厂家内勤</van-radio>
            </van-radio-group>
          </template>
        </van-field>
      </van-cell-group>

      <!-- 厂家对接人（厂家类型） -->
      <van-cell-group v-if="isManufacturerOrder" title="厂家信息">
        <van-field
          v-model="form.manufacturerContact"
          label="厂家对接人"
          placeholder="请输入厂家对接人"
          required
          :rules="[{ required: true, message: '请输入厂家对接人' }]"
          @focus="showManufacturerSuggest = true"
          @blur="delayHideSuggest('manufacturer')"
        />
        <div v-if="showManufacturerSuggest && manufacturerSuggests.length > 0" class="suggest-list">
          <div
            v-for="item in manufacturerSuggests"
            :key="item.id"
            class="suggest-item"
            @mousedown.prevent="selectManufacturerContact(item)"
          >
            {{ item.name }}
          </div>
        </div>
      </van-cell-group>

      <!-- 客户信息（所有类型都需要） -->
      <van-cell-group title="客户信息">
        <van-field
          v-model="form.customerName"
          label="客户名称"
          placeholder="请输入客户名称"
          required
          :rules="[{ required: true, message: '请输入客户名称' }]"
          @focus="showCustomerSuggest = true"
          @blur="delayHideSuggest('customer')"
          @update:model-value="searchCustomers"
        />
        <div v-if="showCustomerSuggest && customerSuggests.length > 0" class="suggest-list">
          <div
            v-for="item in customerSuggests"
            :key="item.id"
            class="suggest-item"
            @mousedown.prevent="selectCustomer(item)"
          >
            <div class="suggest-name">{{ item.name }}</div>
            <div v-if="item.contactPerson" class="suggest-desc">{{ item.contactPerson }} {{ item.contactPhone }}</div>
          </div>
        </div>
        <van-field
          v-model="form.customerContact"
          label="联系人"
          placeholder="请输入联系人"
        />
        <van-field
          v-model="form.customerPhone"
          label="联系电话"
          placeholder="请输入联系电话"
          type="tel"
        />
      </van-cell-group>

      <!-- 渠道信息（公司外勤/内勤可选） -->
      <van-cell-group v-if="isCompanyOrder" title="渠道信息">
        <van-field name="hasChannel">
          <template #input>
            <van-switch v-model="form.hasChannel" size="20px" />
          </template>
          <template #label>
            <span>通过渠道</span>
          </template>
        </van-field>
        <template v-if="form.hasChannel">
          <van-field
            v-model="form.channelName"
            label="渠道名称"
            placeholder="请输入渠道名称"
            required
            :rules="[{ required: form.hasChannel, message: '请输入渠道名称' }]"
            @focus="showChannelSuggest = true"
            @blur="delayHideSuggest('channel')"
            @update:model-value="searchChannels"
          />
          <div v-if="showChannelSuggest && channelSuggests.length > 0" class="suggest-list">
            <div
              v-for="item in channelSuggests"
              :key="item.id"
              class="suggest-item"
              @mousedown.prevent="selectChannel(item)"
            >
              <div class="suggest-name">{{ item.name }}</div>
              <div v-if="item.contactPerson" class="suggest-desc">{{ item.contactPerson }} {{ item.contactPhone }}</div>
            </div>
          </div>
          <van-field
            v-model="form.channelContact"
            label="渠道联系人"
            placeholder="请输入渠道联系人"
          />
          <van-field
            v-model="form.channelPhone"
            label="渠道电话"
            placeholder="请输入渠道电话"
            type="tel"
          />
        </template>
      </van-cell-group>

      <!-- 关联销售（公司内勤 + 技术员提交时显示） -->
      <van-cell-group v-if="showRelatedSales" title="关联销售">
        <van-field
          v-model="form.relatedSalesName"
          label="关联销售"
          placeholder="请选择关联销售"
          readonly
          is-link
          required
          :rules="[{ required: true, message: '请选择关联销售' }]"
          @click="showSalesPicker = true"
        />
      </van-cell-group>

      <!-- 工单信息 -->
      <van-cell-group title="工单信息">
        <!-- 工作类型（仅公司类型） -->
        <van-field
          v-if="isCompanyOrder"
          name="workType"
          label="工作类型"
          required
          :rules="[{ required: isCompanyOrder, message: '请选择工作类型' }]"
        >
          <template #input>
            <van-radio-group v-model="form.workType" direction="horizontal" class="work-type-group">
              <van-radio name="COMMUNICATION">交流</van-radio>
              <van-radio name="TEST">测试</van-radio>
              <van-radio name="DELIVERY">交付</van-radio>
              <van-radio name="ISSUE">问题处理</van-radio>
              <van-radio name="INSPECTION">巡检</van-radio>
              <van-radio name="TRAINING">培训</van-radio>
              <van-radio name="OTHER">其他</van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <!-- 优先级（仅公司类型） -->
        <van-field
          v-if="isCompanyOrder"
          v-model="form.priorityText"
          label="优先级"
          placeholder="请选择优先级"
          readonly
          is-link
          @click="showPriorityPicker = true"
        />

        <van-field
          v-model="form.description"
          type="textarea"
          label="工单描述"
          placeholder="请详细描述工单内容"
          rows="4"
          required
          :rules="[{ required: true, message: '请输入工单描述' }]"
        />

        <!-- 预计派工时间 -->
        <van-field
          v-model="form.estimatedStartText"
          label="预计开始"
          placeholder="请选择预计开始时间"
          readonly
          is-link
          @click="showStartDatePicker = true"
        />
        <van-field
          v-model="form.estimatedEndText"
          label="预计结束"
          placeholder="请选择预计结束时间"
          readonly
          is-link
          @click="showEndDatePicker = true"
        />
        <van-field
          v-if="estimatedDuration > 0"
          label="预计时长"
          :model-value="estimatedDurationText"
          readonly
          input-align="right"
        />
      </van-cell-group>

      <!-- 服务工程师（多选） -->
      <van-cell-group title="服务工程师">
        <van-field
          v-model="form.technicianNames"
          label="工程师"
          placeholder="请选择服务工程师"
          readonly
          is-link
          required
          :rules="[{ required: true, message: '请选择服务工程师' }]"
          @click="showTechnicianPicker = true"
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button type="primary" block native-type="submit" :loading="submitting">
          提交工单
        </van-button>
      </div>
    </van-form>

    <!-- 优先级选择 -->
    <van-popup v-model:show="showPriorityPicker" position="bottom" round>
      <van-picker
        :columns="priorityColumns"
        @confirm="onPriorityConfirm"
        @cancel="showPriorityPicker = false"
      />
    </van-popup>

    <!-- 预计开始时间选择 -->
    <van-popup v-model:show="showStartDatePicker" position="bottom" round>
      <div class="date-picker-wrapper">
        <div class="date-picker-header">
          <span @click="showStartDatePicker = false">取消</span>
          <span class="title">预计开始时间</span>
          <span class="confirm" @click="confirmStartDatePicker">确认</span>
        </div>
        <van-date-picker
          v-model="tempStartDate"
          :min-date="minDate"
          :max-date="maxDate"
        />
        <div class="period-selector">
          <van-radio-group v-model="tempStartPeriod" direction="horizontal">
            <van-radio name="AM">上午</van-radio>
            <van-radio name="PM">下午</van-radio>
          </van-radio-group>
        </div>
      </div>
    </van-popup>

    <!-- 预计结束时间选择 -->
    <van-popup v-model:show="showEndDatePicker" position="bottom" round>
      <div class="date-picker-wrapper">
        <div class="date-picker-header">
          <span @click="showEndDatePicker = false">取消</span>
          <span class="title">预计结束时间</span>
          <span class="confirm" @click="confirmEndDatePicker">确认</span>
        </div>
        <van-date-picker
          v-model="tempEndDate"
          :min-date="minDate"
          :max-date="maxDate"
        />
        <div class="period-selector">
          <van-radio-group v-model="tempEndPeriod" direction="horizontal">
            <van-radio name="AM">上午</van-radio>
            <van-radio name="PM">下午</van-radio>
          </van-radio-group>
        </div>
      </div>
    </van-popup>

    <!-- 销售选择 -->
    <van-popup v-model:show="showSalesPicker" position="bottom" round>
      <div class="picker-header">
        <span class="picker-title">选择关联销售</span>
        <van-icon name="cross" @click="showSalesPicker = false" />
      </div>
      <div class="picker-list">
        <div
          v-for="sale in salesList"
          :key="sale.id"
          class="picker-item"
          @click="selectSales(sale)"
        >
          <div class="item-name">{{ sale.name }}</div>
          <div v-if="sale.department" class="item-desc">{{ sale.department }}</div>
        </div>
        <van-empty v-if="salesList.length === 0" description="暂无销售人员" />
      </div>
    </van-popup>

    <!-- 技术人员多选 -->
    <van-popup v-model:show="showTechnicianPicker" position="bottom" round>
      <div class="picker-header">
        <span class="picker-title">选择服务工程师（可多选）</span>
        <van-icon name="cross" @click="showTechnicianPicker = false" />
      </div>
      <div class="picker-list">
        <van-checkbox-group v-model="form.technicianIds">
          <div
            v-for="tech in technicians"
            :key="tech.id"
            class="picker-item checkbox-item"
          >
            <van-checkbox :name="tech.id" shape="square">
              <div class="item-name">{{ tech.name }}</div>
              <div v-if="tech.department" class="item-desc">{{ tech.department }}</div>
            </van-checkbox>
          </div>
        </van-checkbox-group>
        <van-empty v-if="technicians.length === 0" description="暂无可用技术人员" />
      </div>
      <div class="picker-footer">
        <van-button type="primary" block @click="confirmTechnicians">
          确定（已选 {{ form.technicianIds.length }} 人）
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { workOrderApi, userApi } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { useUiStore } from '@/stores/ui';
import {
  OrderType,
  isCompanyOrder as checkCompanyOrder,
  isManufacturerOrder as checkManufacturerOrder,
  isTechnician,
} from '@/types/enums';

const router = useRouter();
const userStore = useUserStore();
const uiStore = useUiStore();
const { isDesktop } = storeToRefs(uiStore);

const form = ref({
  orderType: 'CF',
  // 客户信息
  customerName: '',
  customerContact: '',
  customerPhone: '',
  // 渠道信息
  hasChannel: false,
  channelName: '',
  channelContact: '',
  channelPhone: '',
  // 厂家对接人
  manufacturerContact: '',
  // 关联销售
  relatedSalesId: '',
  relatedSalesName: '',
  // 工单信息
  workType: '',
  priority: 'NORMAL',
  priorityText: '普通',
  description: '',
  // 预计派工时间
  estimatedStartDate: '',
  estimatedStartPeriod: 'AM',
  estimatedEndDate: '',
  estimatedEndPeriod: 'PM',
  estimatedStartText: '',
  estimatedEndText: '',
  // 技术人员（多选）
  technicianIds: [] as string[],
  technicianNames: '',
});

// 计算属性
const isCompanyOrder = computed(() => checkCompanyOrder(form.value.orderType));
const isManufacturerOrder = computed(() => checkManufacturerOrder(form.value.orderType));

// 公司内勤 + 技术员提交时显示关联销售
const showRelatedSales = computed(() => {
  return form.value.orderType === OrderType.CO && isTechnician(userStore.user);
});

// 计算派工时长（天）
const estimatedDuration = computed(() => {
  if (!form.value.estimatedStartDate || !form.value.estimatedEndDate) {
    return 0;
  }

  const startDate = new Date(form.value.estimatedStartDate);
  const endDate = new Date(form.value.estimatedEndDate);

  // 计算天数差
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // 计算总时段数（每天2个时段：上午和下午）
  // 包含起始日，所以是 (daysDiff + 1) 天
  let totalPeriods = (daysDiff + 1) * 2;

  // 根据开始时段调整
  if (form.value.estimatedStartPeriod === 'PM') {
    totalPeriods -= 1; // 如果从下午开始，减去上午的1个时段
  }

  // 根据结束时段调整
  if (form.value.estimatedEndPeriod === 'AM') {
    totalPeriods -= 1; // 如果到上午结束，减去下午的1个时段
  }

  // 每个时段是0.5天
  const duration = totalPeriods * 0.5;

  return duration > 0 ? duration : 0;
});

// 派工时长文本
const estimatedDurationText = computed(() => {
  const duration = estimatedDuration.value;
  if (duration === 0) return '';
  return `${duration}天`;
});

// 监听工单类型变化，清除不相关的字段
watch(() => form.value.orderType, () => {
  if (!isCompanyOrder.value) {
    form.value.hasChannel = false;
    form.value.channelName = '';
    form.value.channelContact = '';
    form.value.channelPhone = '';
    form.value.workType = '';
    form.value.priority = 'NORMAL';
    form.value.priorityText = '普通';
  }
  if (!isManufacturerOrder.value) {
    form.value.manufacturerContact = '';
  }
  if (!showRelatedSales.value) {
    form.value.relatedSalesId = '';
    form.value.relatedSalesName = '';
  }
});

// 状态
const submitting = ref(false);
const showPriorityPicker = ref(false);
const showStartDatePicker = ref(false);
const showEndDatePicker = ref(false);
const showSalesPicker = ref(false);
const showTechnicianPicker = ref(false);

// 联想输入
const showCustomerSuggest = ref(false);
const showChannelSuggest = ref(false);
const showManufacturerSuggest = ref(false);
const customerSuggests = ref<any[]>([]);
const channelSuggests = ref<any[]>([]);
const manufacturerSuggests = ref<any[]>([]);

// 数据
const salesList = ref<any[]>([]);
const technicians = ref<any[]>([]);

// 日期选择
const minDate = new Date();
minDate.setHours(0, 0, 0, 0);
const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
const tempStartDate = ref([
  String(new Date().getFullYear()),
  String(new Date().getMonth() + 1).padStart(2, '0'),
  String(new Date().getDate()).padStart(2, '0'),
]);
const tempStartPeriod = ref('AM');
const tempEndDate = ref([
  String(new Date().getFullYear()),
  String(new Date().getMonth() + 1).padStart(2, '0'),
  String(new Date().getDate()).padStart(2, '0'),
]);
const tempEndPeriod = ref('PM');
const disabledDate = (time: Date) => time.getTime() < minDate.getTime();

// 选项
const priorityColumns = [
  { text: '普通', value: 'NORMAL' },
  { text: '紧急', value: 'URGENT' },
  { text: '非常紧急', value: 'VERY_URGENT' },
];

// 延迟隐藏联想列表（防止点击时列表先消失）
const delayHideSuggest = (type: string) => {
  setTimeout(() => {
    if (type === 'customer') showCustomerSuggest.value = false;
    if (type === 'channel') showChannelSuggest.value = false;
    if (type === 'manufacturer') showManufacturerSuggest.value = false;
  }, 200);
};

// 搜索客户
const searchCustomers = async (keyword: string) => {
  if (!keyword || keyword.length < 1) {
    customerSuggests.value = [];
    return;
  }
  try {
    const res = await workOrderApi.suggestCustomers(keyword);
    customerSuggests.value = res.data.data || [];
  } catch (error) {
    console.error('搜索客户失败', error);
  }
};

// 搜索渠道
const searchChannels = async (keyword: string) => {
  if (!keyword || keyword.length < 1) {
    channelSuggests.value = [];
    return;
  }
  try {
    const res = await workOrderApi.suggestChannels(keyword);
    channelSuggests.value = res.data.data || [];
  } catch (error) {
    console.error('搜索渠道失败', error);
  }
};

// 搜索厂家对接人
const searchManufacturerContacts = async () => {
  if (!form.value.manufacturerContact || form.value.manufacturerContact.length < 1) {
    manufacturerSuggests.value = [];
    return;
  }
  try {
    const res = await workOrderApi.suggestManufacturerContacts(form.value.manufacturerContact);
    manufacturerSuggests.value = res.data.data || [];
  } catch (error) {
    console.error('搜索厂家对接人失败', error);
  }
};

// 监听厂家对接人输入
watch(() => form.value.manufacturerContact, searchManufacturerContacts);

// 选择客户
const selectCustomer = (item: any) => {
  form.value.customerName = item.name;
  form.value.customerContact = item.contactPerson || '';
  form.value.customerPhone = item.contactPhone || '';
  showCustomerSuggest.value = false;
};

// 选择渠道
const selectChannel = (item: any) => {
  form.value.channelName = item.name;
  form.value.channelContact = item.contactPerson || '';
  form.value.channelPhone = item.contactPhone || '';
  showChannelSuggest.value = false;
};

// 选择厂家对接人
const selectManufacturerContact = (item: any) => {
  form.value.manufacturerContact = item.name;
  showManufacturerSuggest.value = false;
};

// 选择销售
const selectSales = (sale: any) => {
  form.value.relatedSalesId = sale.id;
  form.value.relatedSalesName = sale.name;
  showSalesPicker.value = false;
};

const onSalesChange = (salesId: string) => {
  const sale = salesList.value.find(item => item.id === salesId);
  form.value.relatedSalesName = sale?.name || '';
};

// 确认技术人员
const confirmTechnicians = () => {
  const selectedNames = technicians.value
    .filter(t => form.value.technicianIds.includes(t.id))
    .map(t => t.name);
  form.value.technicianNames = selectedNames.join('、');
  showTechnicianPicker.value = false;
};

const updateTechnicianNames = () => {
  const selectedNames = technicians.value
    .filter(t => form.value.technicianIds.includes(t.id))
    .map(t => t.name);
  form.value.technicianNames = selectedNames.join('、');
};

// 优先级确认
const onPriorityConfirm = ({ selectedOptions }: any) => {
  form.value.priority = selectedOptions[0].value;
  form.value.priorityText = selectedOptions[0].text;
  showPriorityPicker.value = false;
};

// 开始日期时段确认
const confirmStartDatePicker = () => {
  const dateStr = tempStartDate.value.join('-');
  const periodText = tempStartPeriod.value === 'AM' ? '上午' : '下午';
  form.value.estimatedStartDate = dateStr;
  form.value.estimatedStartPeriod = tempStartPeriod.value;
  form.value.estimatedStartText = `${dateStr} ${periodText}`;
  showStartDatePicker.value = false;
};

// 结束日期时段确认
const confirmEndDatePicker = () => {
  const dateStr = tempEndDate.value.join('-');
  const periodText = tempEndPeriod.value === 'AM' ? '上午' : '下午';
  form.value.estimatedEndDate = dateStr;
  form.value.estimatedEndPeriod = tempEndPeriod.value;
  form.value.estimatedEndText = `${dateStr} ${periodText}`;
  showEndDatePicker.value = false;
};

// 获取销售列表
const fetchSales = async () => {
  try {
    const res = await userApi.sales();
    salesList.value = res.data.data || [];
  } catch (error) {
    console.error('获取销售列表失败', error);
  }
};

// 获取技术人员列表
const fetchTechnicians = async () => {
  try {
    const res = await userApi.technicians();
    technicians.value = res.data.data || [];
  } catch (error) {
    console.error('获取技术人员列表失败', error);
  }
};

// 提交
const handleSubmit = async () => {
  submitting.value = true;
  try {
    const data: any = {
      orderType: form.value.orderType,
      customerName: form.value.customerName,
      customerContact: form.value.customerContact || undefined,
      customerPhone: form.value.customerPhone || undefined,
      description: form.value.description,
      technicianIds: form.value.technicianIds,
      estimatedStartDate: form.value.estimatedStartDate || undefined,
      estimatedStartPeriod: form.value.estimatedStartDate ? form.value.estimatedStartPeriod : undefined,
      estimatedEndDate: form.value.estimatedEndDate || undefined,
      estimatedEndPeriod: form.value.estimatedEndDate ? form.value.estimatedEndPeriod : undefined,
    };

    // 公司类型额外字段
    if (isCompanyOrder.value) {
      data.workType = form.value.workType;
      data.priority = form.value.priority;
      data.hasChannel = form.value.hasChannel;
      if (form.value.hasChannel) {
        data.channelName = form.value.channelName;
        data.channelContact = form.value.channelContact || undefined;
        data.channelPhone = form.value.channelPhone || undefined;
      }
    }

    // 厂家类型额外字段
    if (isManufacturerOrder.value) {
      data.manufacturerContact = form.value.manufacturerContact;
    }

    // 公司内勤 + 技术员提交时需要关联销售
    if (showRelatedSales.value) {
      data.relatedSalesId = form.value.relatedSalesId;
    }

    const res = await workOrderApi.create(data);
    showToast('工单创建成功');
    router.replace(`/order/${res.data.data.id}`);
  } catch (error: any) {
    showToast(error?.response?.data?.message || '创建失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchTechnicians();
  fetchSales();
});
</script>

<style lang="scss" scoped>
.order-create-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.order-create-desktop {
  background: #f5f6fb;
  min-height: 100vh;
  padding: 24px;
}

.desktop-form-wrapper {
  max-width: 960px;
  margin: 16px auto 48px;
}

.desktop-form .section-card {
  margin-bottom: 20px;
}

.inline-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.date-field {
  display: flex;
  gap: 12px;
  align-items: center;
}

.period-select {
  width: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.option-label {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.option-desc {
  color: var(--text-color-2, #909399);
  font-size: 12px;
}

.order-type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .van-radio {
    margin-right: 0;
    margin-bottom: 8px;
  }
}

.work-type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .van-radio {
    margin-right: 0;
    margin-bottom: 8px;
  }
}

.suggest-list {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  margin: -8px 16px 8px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.suggest-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #f7f8fa;
  }

  .suggest-name {
    font-size: 14px;
  }

  .suggest-desc {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);

  .picker-title {
    font-size: 16px;
    font-weight: 500;
  }

  .van-icon {
    font-size: 20px;
    color: var(--text-color-2);
  }
}

.picker-list {
  max-height: 400px;
  overflow-y: auto;
  padding-bottom: 60px;
}

.picker-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);

  .item-name {
    font-size: 15px;
    margin-bottom: 4px;
  }

  .item-desc {
    font-size: 12px;
    color: var(--text-color-2);
  }
}

.checkbox-item {
  .van-checkbox {
    width: 100%;
  }

  .van-checkbox__label {
    flex: 1;
  }
}

.picker-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid var(--border-color);
}

.date-picker-wrapper {
  .date-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #eee;

    span {
      color: #969799;
      font-size: 14px;
    }

    .title {
      font-size: 16px;
      font-weight: 500;
      color: #323233;
    }

    .confirm {
      color: #1989fa;
    }
  }

  .period-selector {
    display: flex;
    justify-content: center;
    padding: 16px;
    border-top: 1px solid #eee;

    .van-radio-group {
      gap: 32px;
    }
  }
}
</style>
