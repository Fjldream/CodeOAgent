import router from '@/router/index.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useSystemConfigStore } from '@/stores/systemConfigStore.js';

const asyncRoutes = [
  {
    path: 'system-overview',
    name: 'system-overview',
    component: () => import('@/views/Main/SystemOverView/SystemOverview.vue'),
    meta: { title: 'title.systemOverview' },
    userType: ['01', '02', '03', '05'],
  },
  {
    path: 'client',
    name: 'client',
    component: () => import('@/views/Main/ClientView/ClientEngineer.vue'),
    userType: ['02', '03', '05'],
    meta: { title: 'title.client' },
  },
  {
    path: 'client-engineer-config',
    name: 'client-engineer-config',
    component: () => import('@/views/Main/ClientView/ClientEngineerConfigView/ClientEngineerConfig.vue'),
    redirect: '/main/client-engineer-config/client-page-management',
    meta: { title: 'title.client' },
    userType: ['02', '03', '05'],
    children: [
      {
        path: 'client-page-management',
        name: 'client-page-management',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/ClientPageManageView/ClientPageManage.vue'),
      },
      {
        path: 'client-data-source-management',
        name: 'client-data-source-management',
        component: () =>
          import(
            '@/views/Main/ClientView/ClientEngineerConfigView/ClientDataSourceManagementView/ClientDataSourceManagement.vue'
          ),
      },
      {
        path: 'client-report-library',
        name: 'client-report-library',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/ClientReportLibraryView/ClientReportLibrary.vue'),
      },
      {
        path: 'client-system-script',
        name: 'client-system-script',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/ClientSystemScriptView/ClientSystemScript.vue'),
      },
      {
        path: 'client-timer-script',
        name: 'client-timer-script',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/ClientTimerScriptView/ClientTimerScript.vue'),
      },
      {
        path: 'client-data-change-script',
        name: 'client-data-change-script',
        component: () =>
          import(
            '@/views/Main/ClientView/ClientEngineerConfigView/ClientDataChangeScriptView/ClientDataChangeScript.vue'
          ),
      },
      {
        path: 'client-custom-script',
        name: 'client-custom-script',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/ClientCustomScriptView/ClientCustomScript.vue'),
      },
      {
        path: 'client-hotkey-script',
        name: 'client-hotkey-script',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/ClientHotkeyScriptView/ClientHotkeyScriptView.vue'),
      },
      {
        path: 'client-graphic-model-library',
        name: 'client-graphic-model-library',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/GraphicModelLibraryView/GraphicModelLibrary.vue'),
      },
      {
        path: 'client-variables-engineer',
        name: 'client-variables-engineer',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/VariableEngineerView/VariableEngineer.vue'),
      },
      {
        path: 'client-safe-object',
        name: 'client-safe-object',
        component: () => import('@/views/Main/ClientView/ClientEngineerConfigView/SafeObjectView/SafeObject.vue'),
      },
      {
        path: 'client-3d-resource-management',
        name: 'client-3d-resource-management',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/3dResourceNanagementView/3dResourceNanagement.vue'),
      },
      {
        path: 'client-translation-resource',
        name: 'client-translation-resource',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/TranslationResourceView/TranslationResource.vue'),
      },
      {
        path: 'client-custom-translator',
        name: 'client-custom-translator',
        component: () =>
          import('@/views/Main/ClientView/ClientEngineerConfigView/CustomTranslatorView/CustomTranslator.vue'),
      },
    ],
  },
  {
    path: 'datasource',
    name: 'datasource',
    component: () => import('@/views/Main/DataSourceView/DataSource.vue'),
    meta: { title: 'title.datasource' },
    userType: ['02', '03', '05'],
  },
  {
    path: 'calculate',
    name: 'calculate',
    component: () => import('@/views/Main/CalculateView/CalculateEngineer.vue'),
    meta: { title: 'title.calculate' },
    userType: ['02', '03', '05'],
  },
  {
    path: 'calculate-engineer-config',
    name: 'calculate-engineer-config',
    component: () => import('@/views/Main/CalculateView/CalculateEngineerConfigView/CalculateEngineerConfig.vue'),
    meta: { title: 'title.calculate' },
    userType: ['02', '03', '05'],
    redirect: '/main/calculate-engineer-config/calculate-global-variable',
    children: [
      {
        path: 'calculate-global-variable',
        name: 'calculate-global-variable',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/DataDictionaryView/DataDictionary.vue'),
      },
      {
        path: 'calculate-data-source-management',
        name: 'calculate-data-source-management',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/DataSourceManageView/DataSourceManage.vue'),
      },

      {
        path: 'calculate-system-scripts',
        name: 'calculate-system-scripts',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/SystemScriptsViews/SystemScripts.vue'),
      },

      {
        path: 'calculate-askcalculate-script',
        name: 'calculate-askcalculate-script',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/RequestScriptsViews/RequestScripts.vue'),
      },
      {
        path: 'calculate-datachange-script',
        name: 'calculate-datachange-script',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/DataChangeScriptsView/DataChangeScripts.vue'),
      },
      {
        path: 'calculate-conditionalevent-script',
        name: 'calculate-conditionalevent-script',
        component: () =>
          import(
            '@/views/Main/CalculateView/CalculateEngineerConfigView/ConditionalScriptsView/ConditionalScripts.vue'
          ),
      },
      {
        path: 'calculate-period-script',
        name: 'calculate-period-script',
        component: () =>
          import(
            '@/views/Main/CalculateView/CalculateEngineerConfigView/PeriodicScriptsViews/PeriodicScriptsViews.vue'
          ),
      },
      {
        path: 'calculate-selfdefine-script',
        name: 'calculate-selfdefine-script',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/CustomFunctionsView/CustomFunctions.vue'),
      },
      {
        path: 'calculate-npm-dependencies',
        name: 'calculate-npm-dependencies',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/NpmDependViews/NpmDependViews.vue'),
      },
      {
        path: 'calculate-normal-dependencies',
        name: 'calculate-normal-dependencies',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/NpmDependViews/NpmDependViews.vue'),
      },
      {
        path: 'calculate-py-dependencies',
        name: 'calculate-py-dependencies',
        component: () =>
          import('@/views/Main/CalculateView/CalculateEngineerConfigView/NpmDependViews/NpmDependViews.vue'),
      },
    ],
  },
  {
    path: 'alarm',
    name: 'alarm',
    component: () => import('@/views/Main/AlarmView/AlarmEngineer.vue'),
    meta: { title: 'title.alarm' },
    userType: ['02', '03', '05'],
  },
  {
    path: 'alarm-engineer-config',
    name: 'alarm-engineer-config',
    component: () => import('@/views/Main/AlarmView/AlarmEngineerConfigView/AlarmEngineerConfig.vue'),
    meta: { title: 'title.alarm' },
    userType: ['02', '03', '05'],
    redirect: '/main/alarm-engineer-config/alarm-data-dictionary',
    children: [
      {
        path: 'alarm-data-dictionary',
        name: 'alarm-data-dictionary',
        component: () =>
          import('@/views/Main/AlarmView/AlarmEngineerConfigView/AlarmDictionaryView/AlarmDictionary.vue'),
      },
      {
        path: 'alarm-data-source',
        name: 'alarm-data-source',
        component: () =>
          import('@/views/Main/AlarmView/AlarmEngineerConfigView/AlarmDataSourceManageView/AlarmDataSourceManage.vue'),
      },
      {
        path: 'alarm-custom',
        name: 'alarm-custom',
        component: () => import('@/views/Main/AlarmView/AlarmEngineerConfigView/AlarmCustomView/AlarmCustom.vue'),
      },
      {
        path: 'alarm-system-config',
        name: 'alarm-system-config',
        component: () =>
          import('@/views/Main/AlarmView/AlarmEngineerConfigView/AlarmSystemConfigView/AlarmSystemConfig.vue'),
      },
    ],
  },
  {
    path: 'collection',
    name: 'collection',
    component: () => import('@/views/Main/CollectionView/CollectionEngineer.vue'),
    userType: ['02', '03', '05'],
    meta: { title: 'title.collection' },
  },
  {
    path: 'collection-engineer-config',
    name: 'collection-engineer-config',
    component: () => import('@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionEngineerConfig.vue'),
    redirect: '/main/collection-engineer-config/collection-daq-equipment',
    meta: { title: 'title.collection' },
    userType: ['02', '03', '05'],
    children: [
      {
        path: 'collection-daq-equipment',
        name: 'collection-daq-equipment',
        component: () =>
          import(
            '@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionDaqEquipmentView/CollectionDaqEquipment.vue'
          ),
      },
      {
        path: 'collection-daq-variables',
        name: 'collection-daq-variables',
        component: () =>
          import(
            '@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionDaqVariablesView/CollectionDaqVariables.vue'
          ),
      },
      {
        path: 'collection-network-configuration',
        name: 'collection-network-configuration',
        component: () =>
          import(
            '@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionNetworkConfigView/CollectionNetworkConfig.vue'
          ),
      },
      {
        path: 'collection-storage-configuration',
        name: 'collection-storage-configuration',
        component: () =>
          import(
            '@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionStorageConfigView/CollectionStorageConfig.vue'
          ),
      },
      {
        path: 'collection-forwarding-configuration',
        name: 'collection-forwarding-configuration',
        component: () =>
          import(
            '@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionForwardConfigView/CollectionForwardConfig.vue'
          ),
      },
      {
        path: 'collection-opc-ua',
        name: 'collection-opc-ua',
        component: () =>
          import('@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionOpcuaView/CollectionOpcua.vue'),
      },
      {
        path: 'collection-opc-da',
        name: 'collection-opc-da',
        component: () =>
          import('@/views/Main/CollectionView/CollectionEngineerConfigView/CollectionOpcdaView/CollectionOpcda.vue'),
      },
    ],
  },
  {
    path: 'gatewayLog_manager',
    name: 'gatewayLog_manager',
    component: () => import('@/views/Main/MaintenanceLogView/MaintenanceLog.vue'),
    meta: { title: 'title.systemLog' },
    userType: ['02', '03', '05'],
  },
  {
    path: 'user_manager',
    name: 'user_manager',
    component: () => import('@/views/Main/UserManagerView/UserManager.vue'),
    meta: { title: 'title.user' },
    userType: ['02', '01'],
  },
  {
    path: 'permission_manager',
    name: 'permission_manager',
    component: () => import('@/views/Main/PermissionManagerView/PermissionManager.vue'),
    meta: { title: 'title.permission' },
    userType: ['02'],
  },
];

export const addMainRoutes = () => {
  const userStore = useLoginUserStore();
  const routerList = generateRoutes(userStore.userInfo.userType);
  const mainRoutes = {
    path: '/main',
    name: 'main',
    component: () => import('@/views/Main/MainIndex.vue'),
    redirect: `/main/${routerList[0].path}`,
    children: routerList,
  };

  return router.addRoute(mainRoutes);
};

function generateRoutes(userType) {
  const systemConfigStore = useSystemConfigStore();
  return asyncRoutes.filter((items) => {
    return (
      systemConfigStore.mainRoutesConfig.some((row) => items.path.search(row) !== -1) &&
      items.userType.includes(userType)
    );
  });
}
