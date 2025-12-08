import axios from 'axios';
import { showToast } from 'vant';
import router from '@/router';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    if (response) {
      const { status, data } = response;

      switch (status) {
        case 401:
          localStorage.removeItem('token');
          router.push({ name: 'Login' });
          showToast('登录已过期，请重新登录');
          break;
        case 403:
          showToast('没有权限执行此操作');
          break;
        case 404:
          showToast(data.message || '请求的资源不存在');
          break;
        case 500:
          showToast('服务器错误，请稍后重试');
          break;
        default:
          showToast(data.message || '请求失败');
      }
    } else {
      showToast('网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

// API 接口封装
export const authApi = {
  feishuLogin: (code: string) => api.post('/auth/feishu/login', { code }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }),
  search: (keyword: string) => api.get('/customers/search', { params: { keyword } }),
  detail: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const workOrderApi = {
  list: (params?: any) => api.get('/workorders', { params }),
  pending: () => api.get('/workorders/pending'),
  detail: (id: string) => api.get(`/workorders/${id}`),
  create: (data: any) => api.post('/workorders', data),
  accept: (id: string) => api.post(`/workorders/${id}/accept`),
  reject: (id: string, reason?: string) => api.post(`/workorders/${id}/reject`, { reason }),
  start: (id: string) => api.post(`/workorders/${id}/start`),
  complete: (id: string, data: any) => api.post(`/workorders/${id}/complete`, data),
  cancel: (id: string, reason?: string) => api.post(`/workorders/${id}/cancel`, { reason }),
  evaluate: (id: string, data: any) => api.post(`/workorders/${id}/evaluate`, data),
  // 联想输入接口
  suggestCustomers: (keyword: string) => api.get('/workorders/suggest/customers', { params: { keyword } }),
  suggestChannels: (keyword: string) => api.get('/workorders/suggest/channels', { params: { keyword } }),
  suggestManufacturerContacts: (keyword: string) => api.get('/workorders/suggest/manufacturer-contacts', { params: { keyword } }),
};

export const channelApi = {
  list: (params?: any) => api.get('/channels', { params }),
  options: () => api.get('/channels/options'),
  detail: (id: string) => api.get(`/channels/${id}`),
  create: (data: any) => api.post('/channels', data),
  update: (id: string, data: any) => api.put(`/channels/${id}`, data),
  delete: (id: string) => api.delete(`/channels/${id}`),
};

export const manufacturerApi = {
  list: (params?: any) => api.get('/manufacturers', { params }),
  search: (keyword: string) => api.get('/manufacturers/search', { params: { keyword } }),
  options: () => api.get('/manufacturers/options'),
  orders: (params?: any) => api.get('/manufacturer-orders', { params }),
  orderDetail: (id: string) => api.get(`/manufacturer-orders/${id}`),
  createOrder: (data: any) => api.post('/manufacturer-orders', data),
  completeOrder: (id: string, data: any) => api.post(`/manufacturer-orders/${id}/complete`, data),
};

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

export const workbenchApi = {
  data: () => api.get('/workbench'),
  availableTechnicians: () => api.get('/workbench/available-technicians'),
};

export const statisticsApi = {
  overview: (params?: any) => api.get('/statistics/overview', { params }),
  orderStatus: (params?: any) => api.get('/statistics/order-status', { params }),
  orderType: (params?: any) => api.get('/statistics/order-type', { params }),
  technicianWorkload: (params?: any) => api.get('/statistics/technician-workload', { params }),
  problemTypes: () => api.get('/statistics/problem-types'),
  evaluation: (params?: any) => api.get('/statistics/evaluation', { params }),
  trend: (days?: number, params?: any) => api.get('/statistics/trend', { params: { days, ...(params || {}) } }),
};

export const knowledgeApi = {
  list: (params?: any) => api.get('/knowledge', { params }),
  search: (keyword: string) => api.get('/knowledge/search', { params: { keyword } }),
  problemTypes: () => api.get('/knowledge/problem-types'),
  detail: (id: string) => api.get(`/knowledge/${id}`),
  create: (data: any) => api.post('/knowledge', data),
  update: (id: string, data: any) => api.put(`/knowledge/${id}`, data),
  delete: (id: string) => api.delete(`/knowledge/${id}`),
  related: (id: string) => api.get(`/knowledge/${id}/related`),
};

export const scheduleApi = {
  overview: (params?: any) => api.get('/schedule', { params }),
};

export const followUpApi = {
  list: (workOrderId: string) => api.get(`/workorders/${workOrderId}/follow-ups`),
  create: (workOrderId: string, formData: FormData) => api.post(`/workorders/${workOrderId}/follow-ups`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (workOrderId: string, noteId: string) => api.delete(`/workorders/${workOrderId}/follow-ups/${noteId}`),
};
