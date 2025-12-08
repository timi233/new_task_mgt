<template>
  <div :class="['login-page', deviceMode]">
    <div class="login-card">
      <div class="logo-box">
        <img src="@/assets/logo.svg" alt="IT Service Logo" />
      </div>
      <h1 class="title">IT 服务派工系统</h1>
      <p class="subtitle">Internal Service Dispatch Console</p>

      <van-button
        type="primary"
        size="large"
        block
        :loading="loading"
        @click="handleFeishuLogin"
      >
        <span class="feishu-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M9.6 4.1 3.4 13.5c-.7 1 .1 2.4 1.3 2.4h5.8l4.5-6.5-4.1-5.3c-.3-.4-1-.4-1.3 0Z"
              fill="white"
              fill-opacity=".7"
            />
            <path
              d="M14.4 19.9 20.6 10.5c.7-1-.1-2.4-1.3-2.4h-5.8l-4.5 6.5 4.1 5.3c.3.4 1 .4 1.3 0Z"
              fill="white"
            />
          </svg>
        </span>
        飞书账号一键登录
      </van-button>

      <div class="footer">
        <p>© 2024 IT 服务派工系统 · 建议使用 Chrome / Edge 浏览器</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { useUserStore } from '@/stores/user';

type DeviceMode = 'desktop' | 'mobile';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const loading = ref(false);
const deviceMode = ref<DeviceMode>('desktop');

const FEISHU_APP_ID = import.meta.env.VITE_FEISHU_APP_ID;

const detectDeviceMode = (): DeviceMode => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  const uaHints = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  const ua = navigator.userAgent || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = (uaHints && uaHints.mobile) || mobileRegex.test(ua);
  const isSmallViewport = window.innerWidth < 920;

  return isMobileUA || isSmallViewport ? 'mobile' : 'desktop';
};

const applyDeviceMode = () => {
  deviceMode.value = detectDeviceMode();
};

const handleResize = () => {
  applyDeviceMode();
};

onMounted(() => {
  applyDeviceMode();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

const handleFeishuLogin = () => {
  const redirectUri = encodeURIComponent(window.location.origin + '/login');
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem('feishu_state', state);

  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${FEISHU_APP_ID}&redirect_uri=${redirectUri}&state=${state}`;
  window.location.href = authUrl;
};

const checkCallback = async () => {
  const code = route.query.code as string;
  const state = route.query.state as string;

  if (code) {
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
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top right, #e6f0ff, #f5f7fb 60%, #ffffff);
  padding: 48px 16px;

  &.mobile {
    background: #ffffff;
    padding: 24px 16px 48px;
  }
}

.login-card {
  width: min(420px, 100%);
  padding: 52px 44px;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
  text-align: center;
}

.logo-box {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: #3370ff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(51, 112, 255, 0.3);

  img {
    width: 40px;
    height: 40px;
  }
}

.title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  color: #1f2329;
}

.subtitle {
  margin: 0 0 24px;
  font-size: 14px;
  color: #8f959e;
}

.footer {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid #f0f0f0;
  font-size: 11px;
  color: rgba(31, 35, 41, 0.45);
}

.feishu-icon {
  display: inline-flex;
  margin-right: 8px;
}

.login-page.mobile .login-card {
  box-shadow: none;
  padding: 40px 28px;
}
</style>
