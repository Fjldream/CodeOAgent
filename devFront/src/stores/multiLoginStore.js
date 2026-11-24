import { getCurrentInstance } from 'vue';
import { defineStore } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useWebSocketClient } from '@/composables/useWebSocketClient.js';
import router from '@/router/index.js';
import { setMultiChoiceServer } from '@/api/allRequest/userManagerApi.js';

const loginUserStore = useLoginUserStore();
export const useMultiLoginStore = defineStore('multiLoginStore', () => {
  const { t } = useI18n();
  const { proxy } = getCurrentInstance();
  const client = ref();
  const initMultipleLogin = () => {
    const wsUrl = `${location.protocol.replace('http', 'ws')}//${location.host}/ws`;
    client.value = useWebSocketClient({ url: wsUrl });
    let hasCicked = false;
    client.value.onMessage(async (message) => {
      try {
        if (message === 'pang') {
          return;
        }
        // 如果后端发起重连 则发送token给后端
        if (message === 'reconnect') {
          return client.value.send(
            JSON.stringify({ token: loginUserStore.accessToken, tenantId: loginUserStore.tenantId }),
          );
        }
        let result;
        const data = JSON.parse(message);
        switch (data.errorCode) {
          case -1001:
            if (!hasCicked) {
              hasCicked = true;
              result = await ElMessageBox.confirm(t('userLoginFromOtheClient'), t('tip'), {
                type: 'warning',
                confirmButtonText: t('reLoad'),
                cancelButtonText: t('loginBack'),
                showClose: false,
                closeOnClickModel: false,
                closeOnPressEscape: false,
              }).catch(() => {
                proxy.$crossTab.postMessage({
                  key: 'logout',
                  data,
                });
                router.replace('/login');
              });
              if (result === 'confirm') {
                await setMultiChoiceServer();
                hasCicked = false;
              }
            }
            break;
          case -1009:
            if (!hasCicked) {
              hasCicked = true;
              await closePages(t('notFindLoginInfoRelogin'));
              proxy.$crossTab.postMessage({
                key: 'logout',
                data,
              });
            }
            break;
          case -1002:
            if (!hasCicked) {
              hasCicked = true;
              await closePages(t('notFindClientInfoRelogin'));
              proxy.$crossTab.postMessage({
                key: 'logout',
                data,
              });
            }
            break;
          default:
            break;
        }
      } catch (error) {}
    });
    client.value.connect((isConnectSuccess) => {
      if (isConnectSuccess) {
        client.value.send(JSON.stringify({ token: loginUserStore.accessToken, tenantId: loginUserStore.tenantId }));
      }
    });
  };

  const wsClose = () => {
    client.value?.cleanupSocket();
  };

  const closePages = async (message) => {
    await ElMessageBox.alert(message, t('tip'), {
      type: 'warning',
      cancelButtonText: t('loginBack'),
      showClose: false,
      closeOnClickModel: false,
      closeOnPressEscape: false,
    });

    await router.replace('/login');
  };
  return {
    initMultipleLogin,
    wsClose,
  };
});
