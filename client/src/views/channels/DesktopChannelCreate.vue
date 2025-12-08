<template>
  <div class="desktop-page channel-create-desktop">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <el-button text @click="handleBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="title">{{ isEdit ? '编辑渠道' : '新建渠道' }}</span>
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

        <el-form-item label="渠道名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入渠道名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="地区" prop="region">
          <el-input
            v-model="form.region"
            placeholder="请输入地区"
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

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存修改' : '创建渠道' }}
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
  channelId?: string;
  onSubmit: (data: any) => Promise<void>;
  onBack: () => void;
  onFetchChannel?: (id: string) => Promise<any>;
}>();

const isEdit = !!props.channelId;
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  name: '',
  region: '',
  contactPerson: '',
  contactPhone: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入渠道名称', trigger: 'blur' }],
};

const fetchChannel = async () => {
  if (!isEdit || !props.channelId || !props.onFetchChannel) return;
  try {
    const data = await props.onFetchChannel(props.channelId);
    Object.assign(form, {
      name: data.name,
      region: data.region || '',
      contactPerson: data.contactPerson || '',
      contactPhone: data.contactPhone || '',
    });
  } catch (error) {
    ElMessage.error('获取渠道信息失败');
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
        region: form.region || undefined,
        contactPerson: form.contactPerson || undefined,
        contactPhone: form.contactPhone || undefined,
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
  fetchChannel();
});
</script>

<style lang="scss" scoped>
.channel-create-desktop {
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
