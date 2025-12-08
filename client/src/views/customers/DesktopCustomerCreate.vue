<template>
  <div class="desktop-page customer-create-desktop">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <el-button text @click="handleBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="title">{{ isEdit ? '编辑客户' : '新建客户' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        style="max-width: 800px"
      >
        <el-divider content-position="left">基本信息</el-divider>

        <el-form-item label="客户名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入客户名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="简称" prop="shortName">
          <el-input
            v-model="form.shortName"
            placeholder="请输入简称（可选）"
            clearable
          />
        </el-form-item>

        <el-form-item label="联系人" prop="contactPerson">
          <el-input
            v-model="form.contactPerson"
            placeholder="请输入联系人"
            clearable
          />
        </el-form-item>

        <el-form-item label="联系电话" prop="contactPhone">
          <el-input
            v-model="form.contactPhone"
            placeholder="请输入联系电话"
            clearable
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="contactEmail">
          <el-input
            v-model="form.contactEmail"
            placeholder="请输入邮箱（可选）"
            clearable
            type="email"
          />
        </el-form-item>

        <el-form-item label="地址" prop="address">
          <el-input
            v-model="form.address"
            placeholder="请输入地址"
            type="textarea"
            :rows="2"
          />
        </el-form-item>

        <el-divider content-position="left">其他信息</el-divider>

        <el-form-item label="行业" prop="industry">
          <el-input
            v-model="form.industry"
            placeholder="请输入行业"
            clearable
          />
        </el-form-item>

        <el-form-item label="规模" prop="scale">
          <el-input
            v-model="form.scale"
            placeholder="请输入规模"
            clearable
          />
        </el-form-item>

        <el-form-item label="渠道" prop="channelId">
          <el-select
            v-model="form.channelId"
            placeholder="请选择渠道（可选）"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="channel in channels"
              :key="channel.id"
              :label="channel.name"
              :value="channel.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            placeholder="请输入备注"
            type="textarea"
            :rows="3"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存修改' : '创建客户' }}
          </el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';

const props = defineProps<{
  customerId?: string;
  channels: any[];
  onSubmit: (data: any) => Promise<void>;
  onBack: () => void;
  onFetchCustomer?: (id: string) => Promise<any>;
}>();

const isEdit = !!props.customerId;
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  name: '',
  shortName: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  industry: '',
  scale: '',
  channelId: '',
  remark: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  contactPerson: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
};

const fetchCustomer = async () => {
  if (!isEdit || !props.customerId || !props.onFetchCustomer) return;
  try {
    const data = await props.onFetchCustomer(props.customerId);
    Object.assign(form, {
      name: data.name,
      shortName: data.shortName || '',
      contactPerson: data.contactPerson,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail || '',
      address: data.address || '',
      industry: data.industry || '',
      scale: data.scale || '',
      channelId: data.channelId || '',
      remark: data.remark || '',
    });
  } catch (error) {
    ElMessage.error('获取客户信息失败');
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async valid => {
    if (!valid) return;

    submitting.value = true;
    try {
      const data = {
        name: form.name,
        shortName: form.shortName || undefined,
        contactPerson: form.contactPerson,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail || undefined,
        address: form.address || undefined,
        industry: form.industry || undefined,
        scale: form.scale || undefined,
        channelId: form.channelId || undefined,
        remark: form.remark || undefined,
      };

      await props.onSubmit(data);
    } finally {
      submitting.value = false;
    }
  });
};

const handleBack = () => {
  props.onBack();
};

onMounted(() => {
  fetchCustomer();
});
</script>

<style lang="scss" scoped>
.customer-create-desktop {
  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;

    .title {
      font-size: 18px;
      font-weight: 600;
    }
  }

  :deep(.el-divider__text) {
    font-weight: 600;
    color: #303133;
  }
}
</style>
