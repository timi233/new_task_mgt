<template>
  <div class="customer-create-page">
    <van-nav-bar :title="isEdit ? '编辑客户' : '新建客户'" left-arrow @click-left="router.back()" />

    <van-form @submit="handleSubmit">
      <van-cell-group title="基本信息">
        <van-field
          v-model="form.name"
          label="客户名称"
          placeholder="请输入客户名称"
          required
          :rules="[{ required: true, message: '请输入客户名称' }]"
        />
        <van-field
          v-model="form.shortName"
          label="简称"
          placeholder="请输入简称（可选）"
        />
        <van-field
          v-model="form.contactPerson"
          label="联系人"
          placeholder="请输入联系人"
          required
          :rules="[{ required: true, message: '请输入联系人' }]"
        />
        <van-field
          v-model="form.contactPhone"
          label="联系电话"
          placeholder="请输入联系电话"
          type="tel"
          required
          :rules="[{ required: true, message: '请输入联系电话' }]"
        />
        <van-field
          v-model="form.contactEmail"
          label="邮箱"
          placeholder="请输入邮箱（可选）"
          type="email"
        />
        <van-field
          v-model="form.address"
          label="地址"
          placeholder="请输入地址"
          type="textarea"
          rows="2"
        />
      </van-cell-group>

      <van-cell-group title="其他信息">
        <van-field
          v-model="form.industry"
          label="行业"
          placeholder="请输入行业"
        />
        <van-field
          v-model="form.scale"
          label="规模"
          placeholder="请输入规模"
        />
        <van-field
          v-model="form.channelName"
          label="渠道"
          placeholder="请选择渠道（可选）"
          readonly
          is-link
          @click="showChannelPicker = true"
        />
        <van-field
          v-model="form.remark"
          label="备注"
          placeholder="请输入备注"
          type="textarea"
          rows="3"
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button type="primary" block native-type="submit" :loading="submitting">
          {{ isEdit ? '保存修改' : '创建客户' }}
        </van-button>
      </div>
    </van-form>

    <!-- 渠道选择 -->
    <van-popup v-model:show="showChannelPicker" position="bottom" round>
      <van-picker
        :columns="channelColumns"
        @confirm="onChannelConfirm"
        @cancel="showChannelPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { customerApi, channelApi } from '@/utils/api';

const router = useRouter();
const route = useRoute();

const customerId = route.params.id as string;
const isEdit = !!customerId;

const form = ref({
  name: '',
  shortName: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  industry: '',
  scale: '',
  channelId: '',
  channelName: '',
  remark: '',
});

const submitting = ref(false);
const showChannelPicker = ref(false);
const channelColumns = ref<any[]>([]);

const fetchChannels = async () => {
  try {
    const res = await channelApi.options();
    channelColumns.value = [
      { text: '不选择', value: '' },
      ...res.data.data.map((c: any) => ({ text: c.name, value: c.id })),
    ];
  } catch (error) {
    console.error('获取渠道列表失败', error);
  }
};

const fetchCustomer = async () => {
  if (!isEdit) return;
  try {
    const res = await customerApi.detail(customerId);
    const data = res.data.data;
    form.value = {
      name: data.name,
      shortName: data.shortName || '',
      contactPerson: data.contactPerson,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail || '',
      address: data.address || '',
      industry: data.industry || '',
      scale: data.scale || '',
      channelId: data.channelId || '',
      channelName: data.channel?.name || '',
      remark: data.remark || '',
    };
  } catch (error) {
    showToast('获取客户信息失败');
  }
};

const onChannelConfirm = ({ selectedOptions }: any) => {
  form.value.channelId = selectedOptions[0].value;
  form.value.channelName = selectedOptions[0].value ? selectedOptions[0].text : '';
  showChannelPicker.value = false;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const data = {
      name: form.value.name,
      shortName: form.value.shortName || undefined,
      contactPerson: form.value.contactPerson,
      contactPhone: form.value.contactPhone,
      contactEmail: form.value.contactEmail || undefined,
      address: form.value.address || undefined,
      industry: form.value.industry || undefined,
      scale: form.value.scale || undefined,
      channelId: form.value.channelId || undefined,
      remark: form.value.remark || undefined,
    };

    if (isEdit) {
      await customerApi.update(customerId, data);
      showToast('客户更新成功');
    } else {
      const res = await customerApi.create(data);
      showToast('客户创建成功');
      router.replace(`/customer/${res.data.data.id}`);
      return;
    }

    router.back();
  } catch (error: any) {
    showToast(error?.response?.data?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchChannels();
  fetchCustomer();
});
</script>

<style lang="scss" scoped>
.customer-create-page {
  background: #f7f8fa;
  min-height: 100vh;
}
</style>
