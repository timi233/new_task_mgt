import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { VantResolver } from '@vant/auto-import-resolver';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [VantResolver(), ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue-echarts') || id.includes('echarts')) {
              return 'chunk-echarts';
            }
            if (id.includes('element-plus') || id.includes('@element-plus')) {
              return 'chunk-element-plus';
            }
            if (id.includes('vant')) {
              return 'chunk-vant';
            }
            if (
              id.includes('vue-router') ||
              id.includes('pinia') ||
              id.includes('@vueuse') ||
              /node_modules[\\/]+vue/.test(id)
            ) {
              return 'chunk-vue';
            }
            return 'chunk-vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true, // 强制使用 5173 端口，不自动切换
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
