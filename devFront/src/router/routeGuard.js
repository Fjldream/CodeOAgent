import router from '@/router/index.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useLoginHandle } from '@/composables/useLoginHandle.js';
import { logoutServer } from '@/api/allRequest/loginAPI.js';
import { useLangStore } from '@/stores/langStore.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
router.beforeEach(async (to, from) => {
  try {
    const userStore = useLoginUserStore();
    const mainLeftMenusStore = useMainLeftMenusStore();
    const clientMenuStore = useClientMenuStore();
    const calculationMenuStore = useCalculationMenuStore();
    const alarmMenuStore = useAlarmMenuStore();
    const scriptEditoring = useScriptEditorStore();

    const { i18nReactive } = useLangStore();
    const { validUserToken } = useLoginHandle();
    // 添加标签的title
    const titleKey = to.meta.title || 'devCenter';

    // 添加标签的title
    watchEffect(() => {
      document.title = i18nReactive(titleKey).value;
    });

    if (to.path === import.meta.env.VITE_ROUTE_DEFAULT) {
      try {
        if (userStore.accessToken) {
          await logoutServer({
            access_token: userStore.accessToken,
            refresh_token: userStore.refreshToken,
            username: userStore.userInfo.userName,
          });
        }
      } finally {
        userStore.reset();
        userStore.reset();
        mainLeftMenusStore.resetMenus();
        clientMenuStore.resetClientMenu();
        calculationMenuStore.resetCalculationMenu();
        alarmMenuStore.resetAlarmMenu();
        scriptEditoring.resetScriptEditorList();
      }
      return true;
    }
    if (!userStore.loginInfo.access_token && to.path !== import.meta.env.VITE_ROUTE_DEFAULT) {
      return import.meta.env.VITE_ROUTE_DEFAULT;
    }

    if (userStore.loginInfo.access_token && !userStore.isRouteAdded) {
      const { errorCode } = await validUserToken();

      if (errorCode === void 0 || errorCode !== 0) {
        return import.meta.env.VITE_ROUTE_DEFAULT;
      }
      try {
        await userStore.setRoles();

        return to.fullPath;
      } catch (e) {
        userStore.reset();
        return import.meta.env.VITE_ROUTE_DEFAULT;
      }
    }

    return true;
  } catch (e) {
    return import.meta.env.VITE_ROUTE_DEFAULT;
  }
});
