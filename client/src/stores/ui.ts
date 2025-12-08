import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type LayoutMode = 'mobile' | 'desktop';

const STORAGE_KEY = 'layout-mode';
const DESKTOP_BREAKPOINT = 1024;

const detectEnvironment = (): LayoutMode => {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isMobileUA = /mobile|android|iphone|ipad|ipod/.test(userAgent);

  if (!isMobileUA && width >= DESKTOP_BREAKPOINT) {
    return 'desktop';
  }

  return width >= DESKTOP_BREAKPOINT ? 'desktop' : 'mobile';
};

export const useUiStore = defineStore('ui', () => {
  const stored = (typeof window !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEY) as LayoutMode | null)
    : null) ?? null;

  const mode = ref<LayoutMode>(stored ?? detectEnvironment());
  const manualOverride = ref<boolean>(!!stored);

  const isDesktop = computed(() => mode.value === 'desktop');

  const setMode = (nextMode: LayoutMode, options?: { manual?: boolean }) => {
    mode.value = nextMode;
    if (options?.manual) {
      manualOverride.value = true;
      localStorage.setItem(STORAGE_KEY, nextMode);
    }
  };

  const setDesktop = () => {
    setMode('desktop', { manual: true });
  };

  const setMobile = () => {
    setMode('mobile', { manual: true });
  };

  const toggleMode = () => {
    if (mode.value === 'desktop') {
      setMobile();
    } else {
      setDesktop();
    }
  };

  const enableAutoMode = () => {
    manualOverride.value = false;
    localStorage.removeItem(STORAGE_KEY);
    mode.value = detectEnvironment();
  };

  const syncWithEnvironment = () => {
    if (manualOverride.value) return;
    mode.value = detectEnvironment();
  };

  return {
    mode,
    isDesktop,
    manualOverride,
    setDesktop,
    setMobile,
    toggleMode,
    enableAutoMode,
    syncWithEnvironment,
  };
});
