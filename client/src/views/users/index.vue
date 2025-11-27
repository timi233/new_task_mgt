<template>
  <div class="user-management-page">
    <van-nav-bar title="人员管理" left-arrow @click-left="router.back()">
      <template #right>
        <van-button size="small" type="primary" plain @click="handleSyncFeishu" :loading="syncing">
          同步飞书
        </van-button>
      </template>
    </van-nav-bar>

    <!-- 搜索和筛选 -->
    <van-search
      v-model="keyword"
      placeholder="搜索姓名、手机、邮箱、部门"
      @search="handleSearch"
    />

    <van-dropdown-menu>
      <van-dropdown-item v-model="filters.functionalRole" :options="functionalRoleOptions" />
      <van-dropdown-item v-model="filters.responsibilityRole" :options="responsibilityRoleOptions" />
      <van-dropdown-item v-model="filters.status" :options="statusOptions" />
    </van-dropdown-menu>

    <!-- 用户列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <div
          v-for="user in users"
          :key="user.id"
          class="user-card"
        >
          <div class="user-header">
            <div class="user-avatar">
              <van-image
                v-if="user.avatar"
                round
                width="48"
                height="48"
                :src="user.avatar"
                fit="cover"
              />
              <div v-else class="avatar-placeholder">
                {{ user.name?.charAt(0) || '?' }}
              </div>
            </div>
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-dept">{{ user.department || '无部门' }}</div>
            </div>
            <div class="user-status">
              <span :class="['status-tag', user.status === 'ACTIVE' ? 'status-tag--active' : 'status-tag--disabled']">
                {{ user.status === 'ACTIVE' ? '正常' : '已禁用' }}
              </span>
            </div>
          </div>

          <div class="user-contact">
            <span v-if="user.phone"><van-icon name="phone-o" /> {{ user.phone }}</span>
            <span v-if="user.email"><van-icon name="envelop-o" /> {{ user.email }}</span>
          </div>

          <div class="user-footer">
            <div class="user-role">
              <span class="role-label">权限：</span>
              <span class="role-tag">
                {{ getRoleText(user) }}
              </span>
            </div>
            <div class="user-actions">
              <van-button size="small" plain @click="showPermissionPopup(user)">修改权限</van-button>
              <van-button
                size="small"
                :type="user.status === 'ACTIVE' ? 'default' : 'primary'"
                plain
                @click="handleToggleStatus(user)"
              >
                {{ user.status === 'ACTIVE' ? '禁用' : '启用' }}
              </van-button>
            </div>
          </div>
        </div>

        <van-empty v-if="!loading && users.length === 0" description="暂无用户" />
      </van-list>
    </van-pull-refresh>

    <!-- 权限修改弹窗 -->
    <van-popup v-model:show="showPermissionPicker" position="bottom" round>
      <div class="role-picker-header">
        <span class="title">修改权限 - {{ currentEditUser?.name }}</span>
        <van-icon name="cross" @click="showPermissionPicker = false" />
      </div>
      <div class="role-picker-content">
        <!-- 功能权限 -->
        <div class="permission-section" v-if="isAdmin(currentUserData)">
          <div class="section-title">功能权限</div>
          <van-radio-group v-model="selectedFunctionalRole">
            <van-cell-group inset>
              <van-cell title="无" clickable @click="selectedFunctionalRole = null">
                <template #right-icon>
                  <van-radio :name="null" />
                </template>
              </van-cell>
              <van-cell title="技术员" clickable @click="selectedFunctionalRole = FunctionalRole.TECHNICIAN">
                <template #right-icon>
                  <van-radio :name="FunctionalRole.TECHNICIAN" />
                </template>
                <template #label>可以接单、处理工单</template>
              </van-cell>
              <van-cell title="销售" clickable @click="selectedFunctionalRole = FunctionalRole.SALES">
                <template #right-icon>
                  <van-radio :name="FunctionalRole.SALES" />
                </template>
                <template #label>可以创建工单、查看自己的工单</template>
              </van-cell>
            </van-cell-group>
          </van-radio-group>
        </div>

        <!-- 职责权限 -->
        <div class="permission-section" v-if="isSystemAdmin(currentUserData)">
          <div class="section-title">职责权限</div>
          <van-radio-group v-model="selectedResponsibilityRole">
            <van-cell-group inset>
              <van-cell title="系统管理员" clickable @click="selectedResponsibilityRole = ResponsibilityRole.SYSTEM_ADMIN">
                <template #right-icon>
                  <van-radio :name="ResponsibilityRole.SYSTEM_ADMIN" />
                </template>
                <template #label>最高权限，可管理所有用户和权限</template>
              </van-cell>
              <van-cell title="管理员" clickable @click="selectedResponsibilityRole = ResponsibilityRole.ADMIN">
                <template #right-icon>
                  <van-radio :name="ResponsibilityRole.ADMIN" />
                </template>
                <template #label>可查看统计、管理工单、调整功能权限</template>
              </van-cell>
              <van-cell title="审计" clickable @click="selectedResponsibilityRole = ResponsibilityRole.AUDITOR">
                <template #right-icon>
                  <van-radio :name="ResponsibilityRole.AUDITOR" />
                </template>
                <template #label>只读权限，可查看全部数据</template>
              </van-cell>
              <van-cell title="其他" clickable @click="selectedResponsibilityRole = ResponsibilityRole.OTHER">
                <template #right-icon>
                  <van-radio :name="ResponsibilityRole.OTHER" />
                </template>
                <template #label>普通用户，无管理权限</template>
              </van-cell>
            </van-cell-group>
          </van-radio-group>
        </div>

        <div class="role-picker-footer">
          <van-button type="primary" block @click="handleUpdatePermission">确认修改</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showConfirmDialog } from 'vant';
import { userApi } from '@/utils/api';
import {
  FunctionalRole,
  ResponsibilityRole,
  FunctionalRoleLabel,
  ResponsibilityRoleLabel,
  FunctionalRoleOptions,
  ResponsibilityRoleOptions,
  isSystemAdmin,
  isAdmin,
} from '@/types/enums';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const currentUserData = computed(() => userStore.user);

const keyword = ref('');
const users = ref<any[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const syncing = ref(false);
const page = ref(1);
const pageSize = 20;

const filters = ref({
  functionalRole: '',
  responsibilityRole: '',
  status: '',
});

const functionalRoleOptions = [
  { text: '全部功能权限', value: '' },
  ...FunctionalRoleOptions.filter(option => option.value !== null),
];

const responsibilityRoleOptions = [
  { text: '全部职责权限', value: '' },
  ...ResponsibilityRoleOptions,
];

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '正常', value: 'ACTIVE' },
  { text: '已禁用', value: 'DISABLED' },
];

const showPermissionPicker = ref(false);
const currentEditUser = ref<any>(null);
const selectedFunctionalRole = ref<string | null>(null);
const selectedResponsibilityRole = ref<string | null>(null);

const getRoleText = (user: any) => {
  const parts: string[] = [];
  if (user.functionalRole) {
    parts.push(FunctionalRoleLabel[user.functionalRole] || user.functionalRole);
  }
  if (user.responsibilityRole) {
    parts.push(ResponsibilityRoleLabel[user.responsibilityRole] || user.responsibilityRole);
  }
  return parts.length > 0 ? parts.join(' + ') : '无权限';
};

const fetchUsers = async (isRefresh = false) => {
  if (isRefresh) {
    page.value = 1;
    finished.value = false;
  }

  loading.value = true;
  try {
    const params: any = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      functionalRole: filters.value.functionalRole || undefined,
      responsibilityRole: filters.value.responsibilityRole || undefined,
      status: filters.value.status || undefined,
    };

    const res = await userApi.list(params);
    const { list, pagination } = res.data.data;

    if (isRefresh) {
      users.value = list;
    } else {
      users.value = [...users.value, ...list];
    }

    if (users.value.length >= pagination.total) {
      finished.value = true;
    }
  } catch (error) {
    console.error('获取用户列表失败', error);
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

const loadMore = () => {
  page.value++;
  fetchUsers();
};

const onRefresh = () => {
  fetchUsers(true);
};

const handleSearch = () => {
  fetchUsers(true);
};

// 同步飞书组织架构
const handleSyncFeishu = async () => {
  try {
    await showConfirmDialog({
      title: '同步飞书',
      message: '将从飞书同步组织架构，新用户将默认无权限，需要管理员手动分配。确认同步？',
    });

    syncing.value = true;
    const res = await userApi.syncFeishu();
    showToast(res.data.message || '同步成功');
    fetchUsers(true);
  } catch (error: any) {
    if (error !== 'cancel') {
      showToast(error?.response?.data?.message || '同步失败');
    }
  } finally {
    syncing.value = false;
  }
};

// 显示权限修改弹窗
const showPermissionPopup = (user: any) => {
  if (user.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN) {
    showToast('系统管理员的职责权限不可修改');
    return;
  }

  if (!currentUserData.value) return;

  const canModifyResponsibility = isSystemAdmin(currentUserData.value);
  const canModifyFunctional = isAdmin(currentUserData.value);

  if (!canModifyResponsibility && !canModifyFunctional) {
    showToast('权限不足');
    return;
  }

  currentEditUser.value = user;
  selectedFunctionalRole.value = user.functionalRole;
  selectedResponsibilityRole.value = user.responsibilityRole;
  showPermissionPicker.value = true;
};

// 修改权限
const handleUpdatePermission = async () => {
  if (!currentEditUser.value || !currentUserData.value) return;

  const canModifyResponsibility = isSystemAdmin(currentUserData.value);
  const canModifyFunctional = isAdmin(currentUserData.value);
  const targetUser = currentEditUser.value;

  try {
    if (canModifyFunctional && selectedFunctionalRole.value !== targetUser.functionalRole) {
      await userApi.updateFunctionalRole(targetUser.id, selectedFunctionalRole.value);
    }

    if (canModifyResponsibility && selectedResponsibilityRole.value !== targetUser.responsibilityRole) {
      await userApi.updateResponsibilityRole(targetUser.id, selectedResponsibilityRole.value);
    }

    showToast('权限修改成功');
    showPermissionPicker.value = false;

    const index = users.value.findIndex(u => u.id === targetUser.id);
    if (index !== -1) {
      users.value[index].functionalRole = selectedFunctionalRole.value;
      users.value[index].responsibilityRole = selectedResponsibilityRole.value;
    }
  } catch (error: any) {
    showToast(error?.response?.data?.message || '修改失败');
  }
};

// 切换用户状态
const handleToggleStatus = async (user: any) => {
  if (user.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN) {
    showToast('系统管理员状态不可修改');
    return;
  }

  const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const actionText = newStatus === 'ACTIVE' ? '启用' : '禁用';

  try {
    await showConfirmDialog({
      title: `${actionText}用户`,
      message: `确认${actionText}用户"${user.name}"吗？`,
    });

    await userApi.updateStatus(user.id, newStatus);
    showToast(`用户已${actionText}`);

    // 更新列表中的数据
    const index = users.value.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users.value[index].status = newStatus;
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      showToast(error?.response?.data?.message || '操作失败');
    }
  }
};

// 监听筛选条件变化
watch(filters, () => {
  fetchUsers(true);
}, { deep: true });

// 初始加载
fetchUsers(true);
</script>

<style lang="scss" scoped>
.user-management-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.user-card {
  background: #fff;
  margin: 12px;
  padding: 16px;
  border-radius: 8px;

  .user-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .user-avatar {
    margin-right: 12px;

    .avatar-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #1989fa;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 500;
    }
  }

  .user-info {
    flex: 1;

    .user-name {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .user-dept {
      font-size: 13px;
      color: #999;
    }
  }

  .user-contact {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: #666;
    margin-bottom: 12px;

    .van-icon {
      margin-right: 4px;
    }
  }

  .user-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }

  .user-role {
    display: flex;
    align-items: center;

    .role-label {
      font-size: 13px;
      color: #999;
      margin-right: 8px;
    }
  }

  .role-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    background: #f5f5f5;
    color: #666;
  }

  .user-actions {
    display: flex;
    gap: 8px;
  }
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &--active {
    background: #f6ffed;
    color: #52c41a;
  }
  &--disabled {
    background: #f0f0f0;
    color: #999;
  }
}

.role-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;

  .title {
    font-size: 16px;
    font-weight: 500;
  }

  .van-icon {
    font-size: 20px;
    color: #999;
  }
}

.role-picker-content {
  padding-bottom: 16px;
}

.role-picker-footer {
  padding: 16px;
}

.permission-section {
  margin: 16px 0;

  .section-title {
    font-size: 14px;
    font-weight: 500;
    color: #323233;
    padding: 8px 16px;
    background: #f7f8fa;
  }
}
</style>
