<script setup>
import { useI18n } from 'vue-i18n';
import { loginSSOServer } from '@/api/allRequest/loginAPI';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { getUserInfoServer } from '@/api/allRequest/userManagerApi.js';
import router from '@/router/index.js';

const { t } = useI18n();
const userStore = useLoginUserStore();

const { setLoginInfo, setUserInfo } = userStore;
nextTick(async () => {
  getCookie();

  if (sessionStorage.getItem('username')) {
    const { data } = await loginSSOServer(sessionStorage.getItem('username'));

    // 设置登录信息
    setLoginInfo(data);

    const userInfo = await getUserInfoServer();

    setUserInfo(userInfo.data);

    // 登录成功
    ElMessage({
      message: t('loginSuccess'),
      type: 'success',
    });
    // 跳转到首页
    await router.replace({ path: '/main' });
    return;
  }
  location.href = location.origin + '/api/ssologin';
});

const getCookie = () => {
  for (const row of document.cookie.split(';')) {
    const [value, key] = row.split('=');

    sessionStorage.setItem([value], key);
  }
};
</script>

<template></template>
