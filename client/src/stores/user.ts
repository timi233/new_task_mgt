import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/utils/api';

interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string | null;
  functionalRole: string | null;
  responsibilityRole: string | null;
  avatar?: string;
  status: string;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);

  const isLoggedIn = computed(() => !!user.value);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      user.value = res.data.data;
      return true;
    } catch {
      user.value = null;
      return false;
    } finally {
      initialized.value = true;
    }
  };

  const login = async (code: string) => {
    const res = await api.post('/auth/feishu/login', { code });
    const { user: userData } = res.data.data;
    user.value = userData;
    initialized.value = true;
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // 忽略错误
    }
    user.value = null;
    initialized.value = true;
  };

  return {
    user,
    initialized,
    isLoggedIn,
    fetchUser,
    login,
    logout,
  };
});
