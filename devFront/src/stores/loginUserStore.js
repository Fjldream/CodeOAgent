import { defineStore } from 'pinia';
import { addMainRoutes } from '@/router/asyncRoutes.js';

export const useLoginUserStore = defineStore(
  'loginUserStore',
  () => {
    const publicKey = ref('');
    const userInfo = ref({});

    const isRouteAdded = ref(false);
    const removeMainRouteFn = ref(null);

    const loginInfo = ref({
      access_token: '',
      expires_in: '',
      isFirstLogin: '',
      refresh_token: '',
      token_type: '',
      userId: '',
    });

    const accessToken = computed(() => loginInfo.value.access_token);
    const refreshToken = computed(() => loginInfo.value.refresh_token);
    const tenantId = computed(() => userInfo.value.tenantId);

    // 设置用户的登录信息
    function setLoginInfo(info) {
      loginInfo.value = info;
    }

    // 设置用户的登录信息
    function setUserInfo(info) {
      userInfo.value = info;
    }

    function setPublicKey(info) {
      publicKey.value = info;
    }

    async function setRoles() {
      removeMainRouteFn.value = addMainRoutes();
      isRouteAdded.value = true;
    }

    const reset = () => {
      publicKey.value = '';
      userInfo.value = {};
      isRouteAdded.value = false;
      loginInfo.value = {
        access_token: '',
        expires_in: '',
        isFirstLogin: '',
        refresh_token: '',
        token_type: '',
        userId: '',
      };
      if (removeMainRouteFn.value) {
        removeMainRouteFn.value();
        removeMainRouteFn.value = null;
      }
    };
    return {
      isRouteAdded,
      userInfo,
      loginInfo,
      publicKey,
      accessToken,
      refreshToken,
      tenantId,
      setLoginInfo,
      setUserInfo,
      setPublicKey,
      setRoles,
      reset,
    };
  },
  {
    persist: {
      enabled: true,
      storage: sessionStorage, // 使用 sessionStorage
      key: 'userStore',
      pick: ['publicKey', 'userInfo', 'roles', 'loginInfo'],
    },
  },
);
