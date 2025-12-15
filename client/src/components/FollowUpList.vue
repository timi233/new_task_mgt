<template>
  <van-collapse v-model="activeNames">
    <van-collapse-item title="跟进记录" name="followUp" :value="`${followUps.length}条`">
      <div class="follow-up-list">
        <van-loading v-if="loading" size="24px" style="text-align: center; padding: 20px" />

        <van-empty v-else-if="followUps.length === 0" description="暂无跟进记录" />

        <div v-else class="note-list">
          <div v-for="note in followUps" :key="note.id" class="note-card" :class="{ deleted: note.deletedAt }">
            <div class="note-header">
              <div class="user-info">
                <van-image
                  round
                  width="32"
                  height="32"
                  :src="note.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
                />
                <div class="meta">
                  <span class="name">{{ note.author.name }}</span>
                  <span class="time">{{ formatTime(note.createdAt) }}</span>
                  <span v-if="note.updatedAt" class="edited">(已在{{ formatTime(note.updatedAt) }}修改)</span>
                  <span v-if="note.deletedAt" class="deleted-tag">[已删除]</span>
                </div>
              </div>
              <div v-if="!note.deletedAt" class="actions">
                <van-icon name="edit" class="action-icon" @click="startEdit(note)" />
                <van-icon v-if="note.authorId === userId" name="delete-o" class="action-icon" @click="handleDelete(note.id)" />
              </div>
            </div>

            <template v-if="editingId === note.id">
              <van-field v-model="editContent" type="textarea" rows="2" autosize placeholder="编辑内容" />
              <div class="edit-actions">
                <van-button size="small" @click="cancelEdit">取消</van-button>
                <van-button size="small" type="primary" @click="handleUpdate(note.id)">保存</van-button>
              </div>
            </template>
            <div v-else-if="note.content" class="note-content">{{ note.content }}</div>

            <div v-if="note.attachments.length" class="attachment-grid">
              <template v-for="att in note.attachments" :key="att.id">
                <van-image
                  v-if="att.type === 'IMAGE'"
                  fit="cover"
                  :src="getAttachmentUrl(att.id)"
                  class="grid-img"
                  @click="previewImages(note.attachments, att.id)"
                />
                <div v-else class="file-item" @click="downloadFile(att)">
                  <van-icon name="description" />
                  <span>{{ att.originalName }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="input-area">
          <div v-if="fileList.length" class="uploader-preview">
            <van-uploader v-model="fileList" preview-size="60px" />
          </div>
          <div class="input-row">
            <van-uploader v-model="fileList" multiple :max-count="9" :after-read="afterRead">
              <van-icon name="photo-o" size="24" class="action-icon" />
            </van-uploader>
            <van-field
              v-model="newContent"
              rows="1"
              autosize
              type="textarea"
              placeholder="添加跟进记录..."
              class="chat-input"
            />
            <van-button
              size="small"
              type="primary"
              :disabled="!newContent.trim() && !fileList.length"
              :loading="submitting"
              @click="handleSubmit"
            >
              发送
            </van-button>
          </div>
        </div>
      </div>
    </van-collapse-item>
  </van-collapse>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { showToast, showConfirmDialog, showImagePreview } from 'vant';
import { followUpApi } from '@/utils/api';
import dayjs from 'dayjs';

const props = defineProps<{
  workOrderId: string;
  userId: string;
  isSystemAdmin?: boolean;
}>();

const activeNames = ref(['followUp']);
const loading = ref(false);
const submitting = ref(false);
const followUps = ref<any[]>([]);
const newContent = ref('');
const fileList = ref<any[]>([]);
const editingId = ref<string | null>(null);
const editContent = ref('');

const formatTime = (time: string) => dayjs(time).format('MM-DD HH:mm');
const getAttachmentUrl = (id: string) => followUpApi.getAttachmentUrl(id);

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

const afterRead = () => {
  // file already added to fileList by v-model
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
      if (f.file) formData.append('attachments', f.file);
    });

    await followUpApi.create(props.workOrderId, formData);
    showToast('添加成功');
    newContent.value = '';
    fileList.value = [];
    fetchFollowUps();
  } catch {
    showToast('添加失败');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (noteId: string) => {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定要删除这条跟进记录吗？' });
    await followUpApi.delete(props.workOrderId, noteId);
    showToast('删除成功');
    fetchFollowUps();
  } catch (e: any) {
    if (e !== 'cancel') showToast('删除失败');
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
    showToast('修改成功');
    editingId.value = null;
    fetchFollowUps();
  } catch {
    showToast('修改失败');
  }
};

const previewImages = (attachments: any[], clickedId: string) => {
  const images = attachments.filter((a: any) => a.type === 'IMAGE');
  const urls = images.map((a: any) => followUpApi.getAttachmentUrl(a.id));
  const startPosition = images.findIndex((a: any) => a.id === clickedId);
  showImagePreview({ images: urls, startPosition: Math.max(0, startPosition) });
};

const downloadFile = (att: any) => {
  window.open(followUpApi.getAttachmentUrl(att.id), '_blank');
};

onMounted(() => {
  fetchFollowUps();
});
</script>

<style lang="scss" scoped>
.follow-up-list {
  padding: 8px 0;
}

.note-list {
  max-height: 400px;
  overflow-y: auto;
}

.note-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #ebedf0;

  &.deleted {
    opacity: 0.6;
    background: #f5f5f5;
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .meta {
        display: flex;
        flex-direction: column;
        .name { font-weight: 500; font-size: 14px; color: #323233; }
        .time { font-size: 11px; color: #969799; }
        .edited { font-size: 11px; color: #ff976a; }
        .deleted-tag { font-size: 11px; color: #ee0a24; }
      }
    }

    .actions {
      display: flex;
      gap: 8px;
      .action-icon { color: #969799; font-size: 18px; padding: 4px; }
    }
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .note-content {
    font-size: 14px;
    color: #323233;
    line-height: 1.5;
    white-space: pre-wrap;
    margin-bottom: 8px;
  }

  .attachment-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    margin-top: 8px;

    .grid-img {
      width: 100%;
      height: 80px;
      border-radius: 4px;
      overflow: hidden;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px;
      background: #f7f8fa;
      border-radius: 4px;
      font-size: 12px;
      color: #1989fa;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.input-area {
  border-top: 1px solid #ebedf0;
  padding-top: 12px;
  margin-top: 12px;

  .uploader-preview {
    margin-bottom: 8px;
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;

    .action-icon {
      color: #646566;
      padding: 8px 0;
    }

    .chat-input {
      flex: 1;
      background: #f7f8fa;
      border-radius: 4px;
      padding: 8px;
    }
  }
}
</style>
