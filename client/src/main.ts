import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { LegacyGridContainLabel } from 'echarts/features';
import VueECharts from 'vue-echarts';
import App from './App.vue';
import router from './router';

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  LegacyGridContainLabel,
]);

// 样式
import 'element-plus/dist/index.css';
import 'vant/lib/index.css';
import './styles/index.scss';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.component('VChart', VueECharts);

app.mount('#app');
