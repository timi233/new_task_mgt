import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { showToast } from 'vant';
import { useUserStore } from '@/stores/user';
import {
  ResponsibilityRole,
  FunctionalRole,
  isSystemAdmin,
  isAdmin,
} from '@/types/enums';

const canViewWorkOrders = (user: any) => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  return (
    user.responsibilityRole === ResponsibilityRole.AUDITOR ||
    user.functionalRole === FunctionalRole.TECHNICIAN ||
    user.functionalRole === FunctionalRole.SALES
  );
};

const canManageOrders = (user: any) => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  return (
    user.functionalRole === FunctionalRole.TECHNICIAN ||
    user.functionalRole === FunctionalRole.SALES
  );
};

const canAccessStatistics = (user: any) => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  return (
    user.functionalRole === FunctionalRole.TECHNICIAN ||
    user.functionalRole === FunctionalRole.SALES
  );
};

const canAccessSchedule = (user: any) => {
  if (!user) return false;
  // 所有有业务权限的用户都可以访问派工总览
  return (
    user.responsibilityRole === ResponsibilityRole.ADMIN ||
    user.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN ||
    user.responsibilityRole === ResponsibilityRole.AUDITOR ||
    user.functionalRole === FunctionalRole.TECHNICIAN ||
    user.functionalRole === FunctionalRole.SALES
  );
};

const canAccessUserManagement = (user: any) => {
  return isSystemAdmin(user);
};

const getFallbackRoute = (user: any) => {
  if (!user) {
    return { name: 'Login' };
  }
  return canViewWorkOrders(user) ? { name: 'Workbench' } : { name: 'Mine' };
};

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/ResponsiveLayout.vue'),
    redirect: '/workbench',
    children: [
      {
        path: 'workbench',
        name: 'Workbench',
        component: () => import('@/views/workbench/index.vue'),
        meta: {
          title: '工作台',
          icon: 'home-o',
          checkPermission: canViewWorkOrders,
        },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/index.vue'),
        meta: {
          title: '工单',
          icon: 'orders-o',
          checkPermission: canViewWorkOrders,
        },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/customers/index.vue'),
        meta: { title: '客户', icon: 'friends-o' },
      },
      {
        path: 'channels',
        name: 'Channels',
        component: () => import('@/views/channels/index.vue'),
        meta: { title: '渠道', icon: 'share-o' },
      },
      {
        path: 'mine',
        name: 'Mine',
        component: () => import('@/views/mine/index.vue'),
        meta: { title: '我的', icon: 'user-o' },
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/statistics/index.vue'),
        meta: {
          title: '数据统计',
          checkPermission: canAccessStatistics,
        },
      },
      {
        path: 'knowledge',
        name: 'Knowledge',
        component: () => import('@/views/knowledge/index.vue'),
        meta: { title: '知识库' },
      },
      {
        path: 'knowledge/:id',
        name: 'KnowledgeDetail',
        component: () => import('@/views/knowledge/detail.vue'),
        meta: { title: '知识详情' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: {
          title: '人员管理',
          checkPermission: canAccessUserManagement,
        },
      },
      {
        path: 'manufacturer-orders',
        name: 'ManufacturerOrders',
        component: () => import('@/views/manufacturer/index.vue'),
        meta: {
          title: '厂家派单',
          checkPermission: canViewWorkOrders,
        },
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/schedule/index.vue'),
        meta: {
          title: '派工总览',
          checkPermission: canAccessSchedule,
        },
      },
    ],
  },
  // 工单详情（审计可查看）
  {
    path: '/order/:id',
    name: 'OrderDetail',
    component: () => import('@/views/orders/detail.vue'),
    meta: {
      title: '工单详情',
      checkPermission: canViewWorkOrders,
    },
  },
  // 创建工单（审计不能创建）
  {
    path: '/order/create',
    name: 'OrderCreate',
    component: () => import('@/views/orders/create.vue'),
    meta: {
      title: '创建工单',
      checkPermission: canManageOrders,
    },
  },
  // 工单评价（审计不能评价）
  {
    path: '/order/:id/evaluate',
    name: 'OrderEvaluate',
    component: () => import('@/views/orders/evaluate.vue'),
    meta: {
      title: '工单评价',
      checkPermission: canManageOrders,
    },
  },
  // 客户详情
  {
    path: '/customer/:id',
    name: 'CustomerDetail',
    component: () => import('@/views/customers/detail.vue'),
    meta: { title: '客户详情' },
  },
  // 创建客户
  {
    path: '/customer/create',
    name: 'CustomerCreate',
    component: () => import('@/views/customers/create.vue'),
    meta: { title: '新建客户' },
  },
  // 渠道详情
  {
    path: '/channel/:id',
    name: 'ChannelDetail',
    component: () => import('@/views/channels/detail.vue'),
    meta: { title: '渠道详情' },
  },
  // 创建渠道
  {
    path: '/channel/create',
    name: 'ChannelCreate',
    component: () => import('@/views/channels/create.vue'),
    meta: { title: '新建渠道' },
  },
  // 编辑渠道
  {
    path: '/channel/:id/edit',
    name: 'ChannelEdit',
    component: () => import('@/views/channels/create.vue'),
    meta: { title: '编辑渠道' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const chunkLoadErrorPattern =
  /(Failed to fetch dynamically imported module|Loading chunk .* failed|Importing a module script failed)/i;

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore();
  const requiresAuth = to.meta.requiresAuth !== false;

  // 设置页面标题
  document.title = `${to.meta.title || '派工系统'} - IT服务派工系统`;

  if (requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }

  if (userStore.isLoggedIn && !userStore.user) {
    await userStore.fetchUser();
  }

  if (to.name === 'Login' && userStore.isLoggedIn) {
    const user = userStore.user;
    const hasPermission =
      !!user?.functionalRole ||
      (!!user?.responsibilityRole && user.responsibilityRole !== ResponsibilityRole.OTHER);

    next({ name: hasPermission ? 'Workbench' : 'Mine' });
    return;
  }

  if (to.meta.checkPermission && typeof to.meta.checkPermission === 'function') {
    if (!to.meta.checkPermission(userStore.user)) {
      const fallbackRoute = getFallbackRoute(userStore.user);

      // 如果是从根路径重定向过来的，静默重定向到fallback，不显示错误提示
      const isFromRootRedirect = _from.path === '/' && to.name === 'Workbench';

      if (!isFromRootRedirect) {
        showToast('权限不足');
      }

      if (to.name === fallbackRoute.name) {
        next(false);
      } else {
        next(fallbackRoute);
      }
      return;
    }
  }

  next();
});

router.onError(error => {
  const message = error instanceof Error ? error.message : String(error);
  if (chunkLoadErrorPattern.test(message)) {
    showToast('资源加载失败，正在刷新页面');
    window.location.reload();
    return;
  }
  console.error('[Router Error]', error);
});

export default router;
