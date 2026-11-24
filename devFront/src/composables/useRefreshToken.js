import { getCurrentInstance } from 'vue';

import { useMultiLoginStore } from '@/stores/multiLoginStore.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';

import { refreshTokenServer } from '@/api/allRequest/userManagerApi.js';

export const useRefreshToken = () => {
  const { proxy } = getCurrentInstance();
  const userStore = useLoginUserStore();
  const { setLoginInfo } = userStore;
  const polling = ref(true); //是否继续轮询
  const pollingInterval = 30 * 60 * 1000; //间隔时间 ms
  let timer = null;
  let controller = null;
  const refreshKey = 'last_token_refresh_time';
  // refreshToken最小间隔时间
  const minInterval = 60 * 1000;

  // ws多端登录检测
  const { initMultipleLogin, wsClose } = useMultiLoginStore();

  const pollHandle = async () => {
    if (!polling.value) {
      return;
    }

    try {
      await refreshToken();
    } catch (e) {
    } finally {
      start();
    }
  };

  const refreshToken = async () => {
    if (!shouldRefresh()) {
      return;
    }
    if (controller) {
      controller.abort();
    }
    controller = new AbortController();
    const { data } = await refreshTokenServer(
      {
        refresh_token: userStore.refreshToken,
      },
      {
        signal: controller.signal,
      },
    );
    const tokenInfo = { ...userStore.loginInfo, ...data };
    setLoginInfo(tokenInfo);
    proxy.$crossTab.postMessage({ key: 'refreshToken', data: tokenInfo });
  };

  const shouldRefresh = () => {
    const lastTime = Number(sessionStorage.getItem(refreshKey) || 0);

    const now = Date.now();

    if (now - lastTime > minInterval) {
      sessionStorage.setItem(refreshKey, now.toString());
      return true;
    }
    return false;
  };
  const start = () => {
    timer = setTimeout(pollHandle, pollingInterval);
  };

  const stop = () => {
    polling.value = false;
    clearTimeout(timer);
    controller?.abort();
  };

  onMounted(async () => {
    await refreshToken();
    // 开启多端登录检测
    initMultipleLogin();
    start();
  });

  onUnmounted(() => {
    stop();
    wsClose();
  });

  return {
    start,
    stop,
    polling,
  };
};
