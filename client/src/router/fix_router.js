const fs = require('fs');

const content = fs.readFileSync('index.ts', 'utf-8');

const oldCode = `  if (to.meta.checkPermission && typeof to.meta.checkPermission === 'function') {
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
  }`;

const newCode = `  if (to.meta.checkPermission && typeof to.meta.checkPermission === 'function') {
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
  }`;

const newContent = content.replace(oldCode, newCode);

if (newContent === content) {
  console.log('未找到匹配的代码，检查文件内容');
  process.exit(1);
}

fs.writeFileSync('index.ts', newContent, 'utf-8');
console.log('路由守卫修改成功');
