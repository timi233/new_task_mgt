# 前端双重权限系统更新清单

## 概述

本文档详细说明了前端双重权限系统的所有更新点，包括：
- ✅ 已完成：API 工具（src/utils/api.ts）
- ⏳ 待完成：用户管理页面（src/views/users/index.vue）
- ⏳ 待完成："我的"页面（src/views/mine/index.vue）
- ⏳ 待完成：路由守卫（src/router/index.ts）

---

## 1. ✅ API 工具更新（已完成）

**文件：** `src/utils/api.ts`

**修改内容：**
```typescript
export const userApi = {
  list: (params?: any) => api.get('/users', { params }),
  technicians: () => api.get('/users/technicians'),
  sales: () => api.get('/users/sales'),
  detail: (id: string) => api.get(`/users/${id}`),
  updateRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }), // 向后兼容
  updateFunctionalRole: (id: string, role: string | null) => api.put(`/users/${id}/functional-role`, { functionalRole: role }),
  updateResponsibilityRole: (id: string, role: string | null) => api.put(`/users/${id}/responsibility-role`, { responsibilityRole: role }),
  updateStatus: (id: string, status: string) => api.put(`/users/${id}/status`, { status }),
  syncFeishu: () => api.post('/users/sync-feishu'),
  roleOptions: () => api.get('/users/options/roles'),
};
```

---

## 2. ⏳ 用户管理页面更新

**文件：** `src/views/users/index.vue`

### 2.1 导入语句更新（第145行附近）

**当前代码：**
```typescript
import { RoleLabel, RoleOptions, Role } from '@/types/enums';
```

**修改为：**
```typescript
import {
  FunctionalRole,
  ResponsibilityRole,
  FunctionalRoleLabel,
  ResponsibilityRoleLabel,
  FunctionalRoleOptions,
  ResponsibilityRoleOptions,
  isSystemAdmin,
  isAdmin
} from '@/types/enums';
import { useUserStore } from '@/stores/user';
```

### 2.2 添加用户 store（第147行之后）

**在 `const router = useRouter();` 之后添加：**
```typescript
const userStore = useUserStore();
const currentUserData = computed(() => userStore.user);
```

### 2.3 更新筛选选项（第163-173行）

**当前代码：**
```typescript
// 角色筛选选项（包含"全部角色"）
const roleOptions = [
  { text: '全部角色', value: '' },
  ...RoleOptions,
];

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '正常', value: 'ACTIVE' },
  { text: '已禁用', value: 'DISABLED' },
];
```

**修改为：**
```typescript
// 功能权限筛选选项
const functionalRoleOptions = [
  { text: '全部功能权限', value: '' },
  ...FunctionalRoleOptions.filter(o => o.value !== null),
];

// 职责权限筛选选项
const responsibilityRoleOptions = [
  { text: '全部职责权限', value: '' },
  ...ResponsibilityRoleOptions,
];

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '正常', value: 'ACTIVE' },
  { text: '已禁用', value: 'DISABLED' },
];
```

### 2.4 更新筛选状态（第158-161行）

**当前代码：**
```typescript
const filters = ref({
  role: '',
  status: '',
});
```

**修改为：**
```typescript
const filters = ref({
  functionalRole: '',
  responsibilityRole: '',
  status: '',
});
```

### 2.5 更新角色选择器状态（第175-177行）

**当前代码：**
```typescript
const showRolePicker = ref(false);
const currentUser = ref<any>(null);
const selectedRole = ref('');
```

**修改为：**
```typescript
const showPermissionPicker = ref(false);
const currentEditUser = ref<any>(null);
const selectedFunctionalRole = ref<string | null>(null);
const selectedResponsibilityRole = ref<string | null>(null);
```

### 2.6 更新角色文本函数（第179-181行）

**当前代码：**
```typescript
const roleText = (role: string) => {
  return RoleLabel[role as keyof typeof RoleLabel] || role;
};
```

**修改为：**
```typescript
const getRoleText = (user: any) => {
  const parts = [];
  if (user.functionalRole) {
    parts.push(FunctionalRoleLabel[user.functionalRole] || user.functionalRole);
  }
  if (user.responsibilityRole) {
    parts.push(ResponsibilityRoleLabel[user.responsibilityRole] || user.responsibilityRole);
  }
  return parts.length > 0 ? parts.join(' + ') : '无权限';
};
```

### 2.7 更新 fetchUsers 参数（第191-197行）

**当前代码：**
```typescript
const params: any = {
  page: page.value,
  pageSize,
  keyword: keyword.value || undefined,
  role: filters.value.role || undefined,
  status: filters.value.status || undefined,
};
```

**修改为：**
```typescript
const params: any = {
  page: page.value,
  pageSize,
  keyword: keyword.value || undefined,
  functionalRole: filters.value.functionalRole || undefined,
  responsibilityRole: filters.value.responsibilityRole || undefined,
  status: filters.value.status || undefined,
};
```

### 2.8 更新飞书同步提示（第238行）

**当前代码：**
```typescript
message: '将从飞书同步组织架构，新用户将默认设为技术员角色。确认同步？',
```

**修改为：**
```typescript
message: '将从飞书同步组织架构，新用户将默认无权限，需管理员手动分配。确认同步？',
```

### 2.9 更新权限修改弹窗显示函数（第254-263行）

**当前代码：**
```typescript
// 显示角色修改弹窗
const showRolePopup = (user: any) => {
  if (user.role === Role.SYSTEM_ADMIN) {
    showToast('系统管理员角色不可修改');
    return;
  }
  currentUser.value = user;
  selectedRole.value = user.role;
  showRolePicker.value = true;
};
```

**修改为：**
```typescript
// 显示权限修改弹窗
const showPermissionPopup = (user: any) => {
  // 系统管理员的职责权限不可修改
  if (user.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN) {
    showToast('系统管理员的职责权限不可修改');
    return;
  }

  // 检查当前用户权限
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
```

### 2.10 更新权限修改处理函数（第265-282行）

**当前代码：**
```typescript
// 修改角色
const handleUpdateRole = async () => {
  if (!currentUser.value || !selectedRole.value) return;

  try {
    await userApi.updateRole(currentUser.value.id, selectedRole.value);
    showToast('角色修改成功');
    showRolePicker.value = false;

    // 更新列表中的数据
    const index = users.value.findIndex(u => u.id === currentUser.value.id);
    if (index !== -1) {
      users.value[index].role = selectedRole.value;
    }
  } catch (error: any) {
    showToast(error?.response?.data?.message || '修改失败');
  }
};
```

**修改为：**
```typescript
// 修改权限
const handleUpdatePermission = async () => {
  if (!currentEditUser.value) return;
  if (!currentUserData.value) return;

  const canModifyResponsibility = isSystemAdmin(currentUserData.value);
  const canModifyFunctional = isAdmin(currentUserData.value);

  try {
    // 更新功能权限（管理员及以上可修改）
    if (canModifyFunctional && selectedFunctionalRole.value !== currentEditUser.value.functionalRole) {
      await userApi.updateFunctionalRole(currentEditUser.value.id, selectedFunctionalRole.value);
    }

    // 更新职责权限（仅系统管理员可修改）
    if (canModifyResponsibility && selectedResponsibilityRole.value !== currentEditUser.value.responsibilityRole) {
      await userApi.updateResponsibilityRole(currentEditUser.value.id, selectedResponsibilityRole.value);
    }

    showToast('权限修改成功');
    showPermissionPicker.value = false;

    // 更新列表中的数据
    const index = users.value.findIndex(u => u.id === currentEditUser.value.id);
    if (index !== -1) {
      users.value[index].functionalRole = selectedFunctionalRole.value;
      users.value[index].responsibilityRole = selectedResponsibilityRole.value;
    }
  } catch (error: any) {
    showToast(error?.response?.data?.message || '修改失败');
  }
};
```

### 2.11 更新状态切换函数（第284-313行）

**当前代码：**
```typescript
// 切换用户状态
const handleToggleStatus = async (user: any) => {
  if (user.role === Role.SYSTEM_ADMIN) {
    showToast('系统管理员状态不可修改');
    return;
  }
  // ... 其余代码保持不变
};
```

**修改为：**
```typescript
// 切换用户状态
const handleToggleStatus = async (user: any) => {
  if (user.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN) {
    showToast('系统管理员状态不可修改');
    return;
  }
  // ... 其余代码保持不变
};
```

### 2.12 更新模板部分

#### 2.12.1 更新筛选下拉菜单（第18-21行）

**当前代码：**
```vue
<van-dropdown-menu>
  <van-dropdown-item v-model="filters.role" :options="roleOptions" />
  <van-dropdown-item v-model="filters.status" :options="statusOptions" />
</van-dropdown-menu>
```

**修改为：**
```vue
<van-dropdown-menu>
  <van-dropdown-item v-model="filters.functionalRole" :options="functionalRoleOptions" />
  <van-dropdown-item v-model="filters.responsibilityRole" :options="responsibilityRoleOptions" />
  <van-dropdown-item v-model="filters.status" :options="statusOptions" />
</van-dropdown-menu>
```

#### 2.12.2 更新用户卡片角色显示（第66-72行）

**当前代码：**
```vue
<div class="user-footer">
  <div class="user-role">
    <span class="role-label">角色：</span>
    <span :class="['role-tag', `role-tag--${user.role.toLowerCase()}`]">
      {{ roleText(user.role) }}
    </span>
  </div>
```

**修改为：**
```vue
<div class="user-footer">
  <div class="user-role">
    <span class="role-label">权限：</span>
    <span class="role-tag">
      {{ getRoleText(user) }}
    </span>
  </div>
```

#### 2.12.3 更新修改按钮文字（第74行）

**当前代码：**
```vue
<van-button size="small" plain @click="showRolePopup(user)">修改角色</van-button>
```

**修改为：**
```vue
<van-button size="small" plain @click="showPermissionPopup(user)">修改权限</van-button>
```

#### 2.12.4 更新权限修改弹窗（第91-136行）

**当前代码：**
```vue
<!-- 角色修改弹窗 -->
<van-popup v-model:show="showRolePicker" position="bottom" round>
  <div class="role-picker-header">
    <span class="title">修改角色 - {{ currentUser?.name }}</span>
    <van-icon name="cross" @click="showRolePicker = false" />
  </div>
  <div class="role-picker-content">
    <van-radio-group v-model="selectedRole">
      <van-cell-group inset>
        <van-cell title="管理员" clickable @click="selectedRole = 'ADMIN'">
          <template #right-icon>
            <van-radio name="ADMIN" />
          </template>
          <template #label>可以查看统计数据，管理工单</template>
        </van-cell>
        <van-cell title="销售" clickable @click="selectedRole = 'SALES'">
          <template #right-icon>
            <van-radio name="SALES" />
          </template>
          <template #label>可以创建工单，查看自己的工单</template>
        </van-cell>
        <van-cell title="技术员" clickable @click="selectedRole = 'TECHNICIAN'">
          <template #right-icon>
            <van-radio name="TECHNICIAN" />
          </template>
          <template #label>可以接单，处理工单</template>
        </van-cell>
        <van-cell title="审计" clickable @click="selectedRole = 'AUDITOR'">
          <template #right-icon>
            <van-radio name="AUDITOR" />
          </template>
          <template #label>可以查看所有工单，不能管理工单</template>
        </van-cell>
        <van-cell title="其他" clickable @click="selectedRole = 'OTHER'">
          <template #right-icon>
            <van-radio name="OTHER" />
          </template>
          <template #label>无工单权限，只能访问知识库等基础功能</template>
        </van-cell>
      </van-cell-group>
    </van-radio-group>
    <div class="role-picker-footer">
      <van-button type="primary" block @click="handleUpdateRole">确认修改</van-button>
    </div>
  </div>
</van-popup>
```

**修改为：**
```vue
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
          <van-cell title="技术" clickable @click="selectedFunctionalRole = 'TECHNICIAN'">
            <template #right-icon>
              <van-radio name="TECHNICIAN" />
            </template>
            <template #label>可以接单、处理工单</template>
          </van-cell>
          <van-cell title="销售" clickable @click="selectedFunctionalRole = 'SALES'">
            <template #right-icon>
              <van-radio name="SALES" />
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
          <van-cell title="系统管理员" clickable @click="selectedResponsibilityRole = 'SYSTEM_ADMIN'">
            <template #right-icon>
              <van-radio name="SYSTEM_ADMIN" />
            </template>
            <template #label>最高权限，可以管理所有用户和权限</template>
          </van-cell>
          <van-cell title="管理员" clickable @click="selectedResponsibilityRole = 'ADMIN'">
            <template #right-icon>
              <van-radio name="ADMIN" />
            </template>
            <template #label>可以查看统计、管理工单、修改功能权限</template>
          </van-cell>
          <van-cell title="审计" clickable @click="selectedResponsibilityRole = 'AUDITOR'">
            <template #right-icon>
              <van-radio name="AUDITOR" />
            </template>
            <template #label>只读权限，可以查看所有数据</template>
          </van-cell>
          <van-cell title="其他" clickable @click="selectedResponsibilityRole = 'OTHER'">
            <template #right-icon>
              <van-radio name="OTHER" />
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
```

### 2.13 添加样式（在 style 部分末尾添加）

**在第474行之前添加：**
```scss
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
```

---

## 3. ⏳ "我的"页面更新

**文件：** `src/views/mine/index.vue`

### 3.1 导入语句更新（script 部分开头）

**查找并更新 import 语句，添加：**
```typescript
import {
  FunctionalRoleLabel,
  ResponsibilityRoleLabel,
  isSystemAdmin,
  isAdmin
} from '@/types/enums';
```

### 3.2 更新 roleText 计算属性

**查找 `roleText` 计算属性并替换为：**
```typescript
const roleText = computed(() => {
  if (!user.value) return '未登录';

  const parts = [];
  if (user.value.functionalRole) {
    parts.push(FunctionalRoleLabel[user.value.functionalRole] || user.value.functionalRole);
  }
  if (user.value.responsibilityRole) {
    parts.push(ResponsibilityRoleLabel[user.value.responsibilityRole] || user.value.responsibilityRole);
  }
  return parts.length > 0 ? parts.join(' + ') : '无权限';
});
```

### 3.3 更新个人信息弹窗

**在个人信息弹窗中，将单个"角色"字段改为两个字段：**

**查找类似以下的代码：**
```vue
<van-cell title="角色" :value="roleText" />
```

**替换为：**
```vue
<van-cell title="功能权限" :value="user?.functionalRole ? FunctionalRoleLabel[user.functionalRole] : '无'" />
<van-cell title="职责权限" :value="user?.responsibilityRole ? ResponsibilityRoleLabel[user.responsibilityRole] : '无'" />
```

### 3.4 更新权限检查逻辑

**查找所有使用旧角色检查的地方，例如：**
```typescript
// 旧代码示例
if (user.value?.role === 'SYSTEM_ADMIN') { ... }
if (user.value?.role === 'ADMIN') { ... }
```

**替换为：**
```typescript
// 新代码
if (isSystemAdmin(user.value)) { ... }
if (isAdmin(user.value)) { ... }
```

---

## 4. ⏳ 路由守卫更新

**文件：** `src/router/index.ts`

### 4.1 导入语句更新

**在文件开头添加/更新导入：**
```typescript
import {
  ResponsibilityRole,
  FunctionalRole,
  isSystemAdmin,
  isAdmin
} from '@/types/enums';
```

### 4.2 更新路由 meta 定义

**查找所有路由的 meta 定义，更新权限检查逻辑。**

**示例 - 统计页面：**
```typescript
{
  path: '/statistics',
  name: 'Statistics',
  component: () => import('@/views/statistics/index.vue'),
  meta: {
    requiresAuth: true,
    checkPermission: (user: any) => {
      // 管理员、系统管理员、审计 可以访问
      return user?.responsibilityRole === ResponsibilityRole.ADMIN ||
             user?.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN ||
             user?.responsibilityRole === ResponsibilityRole.AUDITOR;
    }
  }
}
```

**示例 - 人员管理页面：**
```typescript
{
  path: '/users',
  name: 'Users',
  component: () => import('@/views/users/index.vue'),
  meta: {
    requiresAuth: true,
    checkPermission: (user: any) => {
      // 仅系统管理员可访问
      return user?.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN;
    }
  }
}
```

**示例 - 工单相关页面：**
```typescript
{
  path: '/workorders',
  name: 'WorkOrders',
  component: () => import('@/views/workorders/index.vue'),
  meta: {
    requiresAuth: true,
    checkPermission: (user: any) => {
      // 有功能权限或管理权限的可访问
      return user?.functionalRole === FunctionalRole.TECHNICIAN ||
             user?.functionalRole === FunctionalRole.SALES ||
             user?.responsibilityRole === ResponsibilityRole.ADMIN ||
             user?.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN ||
             user?.responsibilityRole === ResponsibilityRole.AUDITOR;
    }
  }
}
```

### 4.3 更新路由守卫逻辑

**查找路由守卫的实现（通常在 `router.beforeEach` 中），更新权限检查：**

**当前可能的代码：**
```typescript
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login' });
    return;
  }

  if (to.meta.roles && !to.meta.roles.includes(userStore.user?.role)) {
    showToast('权限不足');
    next(false);
    return;
  }

  next();
});
```

**修改为：**
```typescript
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login' });
    return;
  }

  // 使用新的权限检查函数
  if (to.meta.checkPermission && typeof to.meta.checkPermission === 'function') {
    if (!to.meta.checkPermission(userStore.user)) {
      showToast('权限不足');
      next(false);
      return;
    }
  }

  next();
});
```

---

## 5. 测试检查清单

完成所有更新后，请测试以下功能：

### 5.1 用户管理页面
- [ ] 筛选功能：功能权限、职责权限、状态筛选正常工作
- [ ] 用户卡片显示：正确显示双重权限组合
- [ ] 修改权限：
  - [ ] 系统管理员可以修改所有权限
  - [ ] 管理员只能修改功能权限
  - [ ] 系统管理员的职责权限不可被修改
- [ ] 飞书同步：提示信息更新为"新用户将默认无权限"

### 5.2 "我的"页面
- [ ] 个人信息显示：功能权限和职责权限分别显示
- [ ] 权限文本：正确显示权限组合

### 5.3 路由守卫
- [ ] 统计页面：仅 ADMIN、SYSTEM_ADMIN、AUDITOR 可访问
- [ ] 人员管理：仅 SYSTEM_ADMIN 可访问
- [ ] 工单页面：有功能权限或管理权限的可访问
- [ ] 无权限用户正确被拦截并提示

### 5.4 API 调用
- [ ] updateFunctionalRole 正确调用后端接口
- [ ] updateResponsibilityRole 正确调用后端接口
- [ ] 后端返回的错误信息正确显示

---

## 6. 注意事项

1. **向后兼容：** 保留了 `updateRole` 接口，但前端不再使用
2. **权限分离：** 功能权限和职责权限完全独立，用户可以只有一种或两种都有
3. **系统管理员保护：** 系统管理员的职责权限不可修改，状态不可禁用
4. **权限等级：**
   - 系统管理员：可修改所有权限
   - 管理员：只能修改功能权限
   - 其他用户：无修改权限
5. **样式更新：** role-tag 样式已简化，不再根据具体角色设置不同颜色

---

## 7. 文件清单

需要修改的文件：
1. ✅ `src/utils/api.ts` - 已完成
2. ⏳ `src/views/users/index.vue` - 475行，需多处修改
3. ⏳ `src/views/mine/index.vue` - 需要更新
4. ⏳ `src/router/index.ts` - 需要更新

---

**修改完成后，请验证所有功能正常，并确保前后端接口调用正确。**
