<template>
  <el-card shadow="never" class="follow-up-card">
    <template #header>
      <span>跟进记录 ({{ followUps.length }})</span>
    </template>

    <el-skeleton v-if="loading" :rows="3" animated />

    <el-empty v-else-if="followUps.length === 0" description="暂无跟进记录" :image-size="60" />

    <div v-else class="note-list">
      <div v-for="note in followUps" :key="note.id" class="note-item" :class="{ deleted: note.deletedAt }">
        <div class="note-header">
          <el-avatar :size="32" :src="note.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
          <div class="meta">
            <span class="name">{{ note.author.name }}</span>
            <span class="time">{{ formatTime(note.createdAt) }}</span>
            <span v-if="note.updatedAt" class="edited">(已在{{ formatTime(note.updatedAt) }}修改)</span>
            <el-tag v-if="note.deletedAt" type="danger" size="small">已删除</el-tag>
          </div>
          <div v-if="!note.deletedAt" class="actions">
            <el-button type="primary" text size="small" @click="startEdit(note)">修改</el-button>
            <el-button v-if="note.authorId === userId" type="danger" text size="small" @click="handleDelete(note.id)">删除</el-button>
          </div>
        </div>
        <template v-if="editingId === note.id">
          <el-input v-model="editContent" type="textarea" :rows="2" placeholder="编辑内容" />
          <div class="edit-actions">
            <el-button size="small" @click="cancelEdit">取消</el-button>
            <el-button size="small" type="primary" @click="handleUpdate(note.id)">保存</el-button>
          </div>
        </template>
        <div v-else-if="note.content" class="note-content">{{ note.content }}</div>
        <div v-if="note.attachments.length" class="attachments">
          <template v-for="att in note.attachments" :key="att.id">
            <el-image
              v-if="att.type === 'IMAGE'"
              :src="getAttachmentUrl(att.id)"
              :preview-src-list="getImageUrls(note.attachments)"
              fit="cover"
              class="att-img"
            />
            <el-link v-else type="primary" :href="getAttachmentUrl(att.id)" target="_blank" class="att-file">
              <el-icon><Document /></el-icon>
              {{ att.originalName }}
            </el-link>
          </template>
        </div>
      </div>
    </div>

    <el-divider />

    <div class="input-area">
      <el-input
        v-model="newContent"
        type="textarea"
        :rows="2"
        placeholder="添加跟进记录..."
        resize="none"
      />
      <div class="input-actions">
        <el-upload
          v-model:file-list="fileList"
          :auto-upload="false"
          multiple
          :limit="9"
          list-type="picture"
        >
          <el-button size="small">选择文件</el-button>
        </el-upload>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!newContent.trim() && !fileList.length"
          @click="handleSubmit"
        >
          发送
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import { followUpApi } from '@/utils/api';
import dayjs from 'dayjs';

const props = defineProps<{
  workOrderId: string;
  userId: string;
  isSystemAdmin?: boolean;
}>();

const loading = ref(false);
const submitting = ref(false);
const followUps = ref<any[]>([]);
const newContent = ref('');
const fileList = ref<any[]>([]);
const editingId = ref<string | null>(null);
const editContent = ref('');

const formatTime = (time: string) => dayjs(time).format('MM-DD HH:mm');

const getAttachmentUrl = (id: string) => followUpApi.getAttachmentUrl(id);
const getImageUrls = (attachments: any[]) =>
  attachments.filter((a: any) => a.type === 'IMAGE').map((a: any) => getAttachmentUrl(a.id));

const fetchFollowUps = async () => {
  loading.value = true;
  try {
    const res = await followUpApi.list(props.workOrderId);
    followUps.value = res.data.data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (!newContent.value.trim() && !fileList.value.length) return;

  submitting.value = true;
  try {
    const formData = new FormData();
    if (newContent.value.trim()) {
      formData.append('content', newContent.value.trim());
    }
    fileList.value.forEach(f => {
      if (f.raw) formData.append('attachments', f.raw);
    });

    await followUpApi.create(props.workOrderId, formData);
    ElMessage.success('添加成功');
    newContent.value = '';
    fileList.value = [];
    fetchFollowUps();
  } catch {
    ElMessage.error('添加失败');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (noteId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这条跟进记录吗？', '确认删除');
    await followUpApi.delete(props.workOrderId, noteId);
    ElMessage.success('删除成功');
    fetchFollowUps();
  } catch {
    // cancelled or error
  }
};

const startEdit = (note: any) => {
  editingId.value = note.id;
  editContent.value = note.content || '';
};

const cancelEdit = () => {
  editingId.value = null;
  editContent.value = '';
};

const handleUpdate = async (noteId: string) => {
  try {
    await followUpApi.update(props.workOrderId, noteId, editContent.value);
    ElMessage.success('修改成功');
    editingId.value = null;
    fetchFollowUps();
  } catch {
    ElMessage.error('修改失败');
  }
};

onMounted(() => {
  fetchFollowUps();
});
</script>

<style lang="scss" scoped>
.follow-up-card {
  margin-top: 16px;
}

.note-list {
  max-height: 400px;
  overflow-y: auto;
}

.note-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 12px;

  &.deleted {
    opacity: 0.6;
    background: #f5f5f5;
  }

  .note-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .meta {
      flex: 1;
      .name { font-weight: 500; margin-right: 8px; }
      .time { color: #909399; font-size: 12px; }
      .edited { color: #e6a23c; font-size: 12px; margin-left: 8px; }
    }
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .note-content {
    white-space: pre-wrap;
    line-height: 1.6;
    margin-bottom: 8px;
  }

  .attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .att-img {
      width: 80px;
      height: 80px;
      border-radius: 4px;
    }

    .att-file {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.input-area {
  .input-actions {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 12px;
  }
}
</style>
