<template>
  <div class="evaluate-page">
    <van-nav-bar title="服务评价" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px" />

    <template v-else-if="order">
      <!-- 工单信息 -->
      <van-cell-group title="工单信息">
        <van-cell title="工单编号" :value="order.orderNo" />
        <van-cell title="客户名称" :value="order.customerName" />
        <van-cell title="技术人员" :value="technicianNames" />
      </van-cell-group>

      <!-- 评价表单 -->
      <van-form @submit="handleSubmit">
        <van-cell-group title="服务评价">
          <van-field label="服务质量" required>
            <template #input>
              <van-rate v-model="form.qualityRating" />
            </template>
          </van-field>
          <van-field label="响应速度" required>
            <template #input>
              <van-rate v-model="form.responseRating" />
            </template>
          </van-field>
          <van-field
            v-model="form.customerFeedback"
            type="textarea"
            label="客户反馈"
            placeholder="请输入客户对本次服务的反馈"
            rows="3"
          />
          <van-field
            v-model="form.improvementSuggestion"
            type="textarea"
            label="改进建议"
            placeholder="请输入改进建议（可选）"
            rows="3"
          />
        </van-cell-group>

        <div style="margin: 16px">
          <van-button type="primary" block native-type="submit" :loading="submitting">
            提交评价
          </van-button>
        </div>
      </van-form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { workOrderApi } from '@/utils/api';

const router = useRouter();
const route = useRoute();

const orderId = route.params.id as string;
const loading = ref(true);
const submitting = ref(false);
const order = ref<any>(null);

const form = ref({
  qualityRating: 5,
  responseRating: 5,
  customerFeedback: '',
  improvementSuggestion: '',
});

const technicianNames = computed(() => {
  if (order.value?.technicianList && order.value.technicianList.length > 0) {
    return order.value.technicianList.map((t: any) => t.name).join('、');
  }
  return '未分配';
});

const fetchOrder = async () => {
  loading.value = true;
  try {
    const res = await workOrderApi.detail(orderId);
    order.value = res.data.data;

    if (order.value.evaluation) {
      showToast('该工单已评价');
      router.back();
    }
  } catch (error) {
    showToast('获取工单信息失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (form.value.qualityRating === 0 || form.value.responseRating === 0) {
    showToast('请完成评分');
    return;
  }

  submitting.value = true;
  try {
    await workOrderApi.evaluate(orderId, form.value);
    showToast('评价提交成功');
    router.back();
  } catch (error: any) {
    showToast(error?.response?.data?.message || '提交失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchOrder();
});
</script>

<style lang="scss" scoped>
.evaluate-page {
  background: #f7f8fa;
  min-height: 100vh;
}
</style>
