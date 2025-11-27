#!/usr/bin/env python3
# -*- coding: utf-8 -*-
with open('index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """  if (to.meta.checkPermission && typeof to.meta.checkPermission === 'function') {
    if (!to.meta.checkPermission(userStore.user)) {
      showToast('权限不足');
      const fallbackRoute = getFallbackRoute(userStore.user);
      if (to.name === fallbackRoute.name) {
        next(false);
      } else {
        next(fallbackRoute);
      }
      return;
    }
  }"""

new_code = """  if (to.meta.checkPermission && typeof to.meta.checkPermission === 'function') {
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
  }"""

content = content.replace(old_code, new_code)

with open('index.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("路由守卫修改成功")
