<template>
  <DesktopChannelCreate
    v-if="isDesktop"
    :channel-id="channelId"
    :on-submit="handleSubmit"
    :on-back="handleBack"
    :on-fetch-channel="fetchChannelData"
  />
  <div v-else class="channel-create-page">
    <van-nav-bar :title="isEdit ? '编辑渠道' : '新建渠道'" left-arrow @click-left="router.back()" />

    <van-form @submit="handleSubmitMobile">
      <van-cell-group title="基本信息">
        <van-field
          v-model="form.name"
          label="渠道名称"
          placeholder="请输入渠道名称"
          required
          :rules="[{ required: true, message: '请输入渠道名称' }]"
        />
        <van-field
          v-model="form.region"
          label="地区"
          placeholder="请输入地区"
        />
        <van-field
          v-model="form.contactPerson"
          label="联系人"
          placeholder="请输入联系人"
        />
        <van-field
          v-model="form.contactPhone"
          label="联系电话"
          placeholder="请输入联系电话"
          type="tel"
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button type="primary" block native-type="submit" :loading="submitting">
          {{ isEdit ? '保存修改' : '创建渠道' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { ElMessage } from 'element-plus';
import { channelApi } from '@/utils/api';
import { useUiStore } from '@/stores/ui';
import DesktopChannelCreate from './DesktopChannelCreate.vue';

const router = useRouter();
const route = useRoute();
const uiStore = useUiStore();

const channelId = route.params.id as string;
const isEdit = !!channelId;
const isDesktop = computed(() => uiStore.isDesktop);

const form = ref({
  name: '',
  region: '',
  contactPerson: '',
  contactPhone: '',
});

const submitting = ref(false);

const fetchChannelData = async (id: string) => {
  const res = await channelApi.detail(id);
  return res.data.data;
};

const fetchChannel = async () => {
  if (!isEdit) return;
  try {
    const data = await fetchChannelData(channelId);
    form.value = {
      name: data.name,
      region: data.region || '',
      contactPerson: data.contactPerson || '',
      contactPhone: data.contactPhone || '',
    };
  } catch (error) {
    if (isDesktop.value) {
      ElMessage.error('获取渠道信息失败');
    } else {
      showToast('获取渠道信息失败');
    }
  }
};

const handleSubmit = async (data: any) => {
  try {
    if (isEdit) {
      await channelApi.update(channelId, data);
      ElMessage.success('渠道更新成功');
      router.back();
    } else {
      const res = await channelApi.create(data);
      ElMessage.success('渠道创建成功');
      router.replace(`/channel/${res.data.data.id}`);
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '操作失败');
    throw error;
  }
};

const handleSubmitMobile = async () => {
  submitting.value = true;
  try {
    const data = {
      name: form.value.name,
      region: form.value.region || undefined,
      contactPerson: form.value.contactPerson || undefined,
      contactPhone: form.value.contactPhone || undefined,
    };

    if (isEdit) {
      await channelApi.update(channelId, data);
      showToast('渠道更新成功');
    } else {
      const res = await channelApi.create(data);
      showToast('渠道创建成功');
      router.replace(`/channel/${res.data.data.id}`);
      return;
    }

    router.back();
  } catch (error: any) {
    showToast(error?.response?.data?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const handleBack = () => {
  router.back();
};

onMounted(() => {
  if (!isDesktop.value) {
    fetchChannel();
  }
});
</script>

<style lang="scss" scoped>
.channel-create-page {
  background: #f7f8fa;
  min-height: 100vh;
}
</style>
