import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/utils/api';

interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string | null; // 旧的角色字段（向后兼容）
  functionalRole: string | null; // 功能权限：TECHNICIAN | SALES | null
  responsibilityRole: string | null; // 职责权限：SYSTEM_ADMIN | ADMIN | AUDITOR | OTHER | null
  avatar?: string;
  status: string;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);

  // 登录状态基于 user 对象是否存在（由 Cookie 中的 Token 决定）
  const isLoggedIn = computed(() => !!user.value);

  // 兼容旧代码：token 从 localStorage 读取（过渡期保留）
  const token = computed(() => localStorage.getItem('token'));

  const setToken = (newToken: string) => {
    // 过渡期：仍然保存到 localStorage，以兼容旧代码
    localStorage.setItem('token', newToken);
  };

  const clearToken = () => {
    user.value = null;
    localStorage.removeItem('token');
  };

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      user.value = res.data.data;
      return true;
    } catch {
      user.value = null;
      // 如果 Cookie 无效，也清除 localStorage 中的旧 token
      localStorage.removeItem('token');
      return false;
    } finally {
      initialized.value = true;
    }
  };

  const login = async (code: string) => {
    const res = await api.post('/auth/feishu/login', { code });
    const { token: newToken, user: userData } = res.data.data;
    // 过渡期：保存 token 到 localStorage（后端已设置 Cookie）
    setToken(newToken);
    user.value = userData;
    initialized.value = true;
    return userData;
  };

  const logout = async () => {
    try {
      // 调用后端清除 Cookie
      await api.post('/auth/logout');
    } catch {
      // 忽略错误
    }
    clearToken();
    initialized.value = true;
  };

  return {
    token,
    user,
    initialized,
    isLoggedIn,
    setToken,
    clearToken,
    fetchUser,
    login,
    logout,
  };
});
