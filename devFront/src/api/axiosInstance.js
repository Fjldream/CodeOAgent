import axios from 'axios';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import router from '@/router/index.js';
import { useLangStore } from '@/stores/langStore.js';
import { t } from '@/i18n/index.js';
// 创建 Axios 实例
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_PROXY_DOMAIN, // 可替换为 process.env.VUE_APP_BASE_API
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    const userStore = useLoginUserStore();

    const token = userStore.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    const { i18nReactive } = useLangStore();
    const result = response.data;
    if (result.errorCode !== 0) {
      ElMessage({
        message: result.message || result.msg || i18nReactive('requestError'),
        type: 'error',
      });
      return Promise.reject(result);
    }
    return result;
  },
  async (error) => {
    if (error.response) {
      const { data } = error.response;

      // token过期
      if (data.errorCode === -103 && !error.request.responseURL.includes('logout')) {
        try {
          await ElMessageBox.alert(t('loginStatusError'), t('tip'), {
            confirmButtonText: t('define'),
            type: 'error',
          });
        } finally {
          await router.replace('/login');
        }

        return Promise.reject(data);
      }

      ElMessage({
        message: data.message || data.msg || error.message || data.errorCode,
        type: 'error',
      });
      return Promise.reject(data);
    }
    if (error.code === 'ECONNABORTED') {
      ElMessage({
        message: `network timeout`,
        type: 'error',
      });
      return Promise.reject({ errorCode: 'ECONNABORTED' });
    }
    ElMessage({
      message: error.message || 'network error',
      type: 'error',
    });
    return Promise.reject({ errorCode: 'network error' });
  },
);

export default axiosInstance;
