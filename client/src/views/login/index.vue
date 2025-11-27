<template>
  <div class="login-page">
    <div class="login-header">
      <img src="@/assets/logo.svg" alt="Logo" class="logo" />
      <h1 class="title">IT服务派工系统</h1>
      <p class="subtitle">高效、便捷的工单管理平台</p>
    </div>

    <div class="login-content">
      <van-button
        type="primary"
        size="large"
        block
        :loading="loading"
        @click="handleFeishuLogin"
      >
        <van-icon name="chat-o" /> 飞书登录
      </van-button>

      <p class="login-tip">点击上方按钮，使用飞书账号登录</p>
    </div>

    <div class="login-footer">
      <p>© 2024 IT服务派工系统</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const loading = ref(false);

const FEISHU_APP_ID = import.meta.env.VITE_FEISHU_APP_ID;

const handleFeishuLogin = () => {
  // 构建飞书授权URL
  const redirectUri = encodeURIComponent(window.location.origin + '/login');
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem('feishu_state', state);

  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${FEISHU_APP_ID}&redirect_uri=${redirectUri}&state=${state}`;

  window.location.href = authUrl;
};

// 检查是否有回调code
const checkCallback = async () => {
  const code = route.query.code as string;
  const state = route.query.state as string;

  if (code) {
    // 验证state
    const savedState = localStorage.getItem('feishu_state');
    if (state !== savedState) {
      showToast('登录验证失败，请重试');
      return;
    }

    loading.value = true;
    try {
      await userStore.login(code);
      showToast('登录成功');

      const redirect = route.query.redirect as string;
      router.replace(redirect || '/workbench');
    } catch (error) {
      showToast('登录失败，请重试');
    } finally {
      loading.value = false;
      localStorage.removeItem('feishu_state');
    }
  }
};

checkCallback();
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 32px;
}

.login-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  text-align: center;

  .logo {
    width: 80px;
    height: 80px;
    margin-bottom: 24px;
  }

  .title {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .subtitle {
    font-size: 14px;
    opacity: 0.8;
  }
}

.login-content {
  padding: 40px 0;

  .van-button {
    height: 48px;
    font-size: 16px;
    border-radius: 24px;

    .van-icon {
      margin-right: 8px;
    }
  }

  .login-tip {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    margin-top: 16px;
  }
}

.login-footer {
  padding: 24px 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}
</style>
