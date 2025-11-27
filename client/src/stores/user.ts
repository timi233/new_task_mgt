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
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(null);

  const isLoggedIn = computed(() => !!token.value);

  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  };

  const clearToken = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  };

  const fetchUser = async () => {
    if (!token.value) return;

    try {
      const res = await api.get('/auth/me');
      user.value = res.data.data;
    } catch (error) {
      clearToken();
    }
  };

  const login = async (code: string) => {
    const res = await api.post('/auth/feishu/login', { code });
    const { token: newToken, user: userData } = res.data.data;
    setToken(newToken);
    user.value = userData;
    return userData;
  };

  const logout = () => {
    clearToken();
  };

  // 初始化时获取用户信息
  if (token.value) {
    fetchUser();
  }

  return {
    token,
    user,
    isLoggedIn,
    setToken,
    clearToken,
    fetchUser,
    login,
    logout,
  };
});
