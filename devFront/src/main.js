// 配置自定义icons
// modified by jinlong.feng at 2026-11-19 开发态前端本地启动
import './plugins/registerIcons.js';
// end
import { createApp } from 'vue';
// loading组件
import { dotSpinner } from 'ldrs';
// Pinia 相关
import { createPinia, setActivePinia } from 'pinia';
import piniaPluginPersistence from 'pinia-plugin-persistedstate';

// 应用核心
import App from './App.vue';
import router from './router';
import i18n from '@/i18n/index.js';
import '@/router/routeGuard.js';
// 样式
import './style.scss';
import ErrorLoggerPlugin from '@/plugins/ErrorLoggerPlugin.js';
import BroadcastChannelPlugin from '@/plugins/BroadcastChannelPlugin.js';

dotSpinner.register();

const app = createApp(App);

// 初始化 Pinia
const pinia = createPinia();
pinia.use(piniaPluginPersistence);

// 安装插件
app.use(pinia); // 状态管理
app.use(router); // 路由

app.use(i18n); // 国际化
setActivePinia(pinia);

app.use(ErrorLoggerPlugin);
app.use(BroadcastChannelPlugin);
// 挂载应用
app.mount('#app');
