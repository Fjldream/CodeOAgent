import { defineStore } from 'pinia';
import { getProjectGroupServer } from '@/api/allRequest/mainAPI.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useLangStore } from '@/stores/langStore.js';
import { useSystemConfigStore } from '@/stores/systemConfigStore.js';

export const useMainLeftMenusStore = defineStore(
  'mainLeftMenus',
  () => {
    const { i18nReactive } = useLangStore();
    const systemConfigStore = useSystemConfigStore();

    const mainLeftMenus = ref(resetMainLeftMenus());
    const leftRowSelect = ref({});
    const expand = ref(false);
    const projectTypeArr = readonly([0, 1, 2, 3, 4]);
    const defaultIds = readonly([
      'default_kdbmanager',
      'default_kingclient',
      'default_kingcalculation',
      'default_kingalarm',
      'default_kingioserver',
    ]);

    function resetMainLeftMenus() {
      return [
        {
          id: 'systemOverview',
          name: i18nReactive('leftMenus.systemOverview'),
          icon: 'systemIcon',
          showPath: 'system-overview',
          path: 'system-overview',
          userType: ['01', '02', '03', '05'],
        },
        {
          id: 'clientEngineer',
          name: i18nReactive('leftMenus.clientEngineer'),
          icon: 'clientEngineer',
          showPath: 'client',
          projectType: 1,
          children: [],
          userType: ['02', '03', '05'],
        },
        {
          id: 'dataSourceEngineer',
          name: i18nReactive('leftMenus.dataSourceEngineer'),
          icon: 'dataSourceEngineer',
          showPath: 'datasource',
          projectType: 3,
          children: [],
          userType: ['02', '03', '05'],
        },
        {
          id: 'calculationEngineer',
          name: i18nReactive('leftMenus.calculationEngineer'),
          icon: 'calculationEngineer',
          showPath: 'calculate',
          projectType: 0,
          children: [],
          userType: ['02', '03', '05'],
        },
        {
          id: 'alarmEngineer',
          name: i18nReactive('leftMenus.alarmEngineer'),
          icon: 'alarmEngineer',
          showPath: 'alarm',
          projectType: 4,
          children: [],
          userType: ['02', '03', '05'],
        },
        {
          id: 'collectionEngineer',
          name: i18nReactive('leftMenus.collectionEngineer'),
          icon: 'collectionEngineer',
          showPath: 'collection',
          projectType: 2,
          children: [],
          userType: ['02', '03', '05'],
        },
        {
          id: 'userEngineer',
          name: i18nReactive('userManager'),
          icon: 'userManager',
          showPath: 'user_manager',
          path: 'user_manager',
          userType: ['02', '01'],
        },
        {
          id: 'roleEngineer',
          name: i18nReactive('roleManager'),
          icon: 'roleEngineer',
          showPath: 'permission_manager',
          path: 'permission_manager',
          userType: ['02'],
        },
        {
          id: 'logEngineer',
          name: i18nReactive('systemLog'),
          icon: 'logEngineer',
          showPath: 'gatewayLog_manager',
          path: 'gatewayLog_manager',
          userType: ['02', '03', '05'],
        },
      ];
    }

    // 更新左树
    const getLeftMenu = async () => {
      const userStore = useLoginUserStore();
      mainLeftMenus.value = mainLeftMenus.value.filter(
        (item) =>
          systemConfigStore.mainRoutesConfig.some((row) => item.showPath.search(row) !== -1) &&
          item.userType.includes(userStore.userInfo.userType),
      );

      if (userStore.userInfo.userType === '01') {
        return;
      }
      for (const projectType of projectTypeArr) {
        try {
          // 被屏蔽的不需要获取组信息
          if (!mainLeftMenus.value.some((item) => item.projectType === projectType)) {
            continue;
          }
          await setLeftMenus(projectType);
        } catch (e) {}
      }
      // 默认左树选择第一个,并显示第一个路由
      if (Object.keys(leftRowSelect.value).length === 0) {
        leftRowSelect.value = mainLeftMenus.value[0];
      }
    };

    // 根据ProjectType添加左树
    const setLeftMenus = async (projectType) => {
      const { data } = await getProjectGroupServer(projectType);
      if (!data) {
        return;
      }
      const treeRow = getLeftMenuByProjectType(projectType);

      treeRow.children = translateTree(data, projectType, treeRow);
    };
    const setLeftRowSelect = (row) => {
      leftRowSelect.value = row;
    };

    const getLeftMenuByProjectType = (projectType) => {
      return mainLeftMenus.value.find((menu) => menu.projectType === projectType);
    };

    const resetMenus = () => {
      mainLeftMenus.value = resetMainLeftMenus();
      leftRowSelect.value = {};
    };
    //点击展开
    const handleToggle = () => {
      expand.value = !expand.value;
    };
    return {
      projectTypeArr,
      defaultIds,
      mainLeftMenus,
      leftRowSelect,
      expand,
      setLeftRowSelect,
      getLeftMenuByProjectType,
      getLeftMenu,
      setLeftMenus,
      resetMenus,
      handleToggle,
    };
  },
  {
    persist: {
      enabled: true,
      storage: sessionStorage, // 使用 sessionStorage
      key: 'leftRowSelect',
      pick: ['leftRowSelect'],
    },
  },
);

function translateTree(tree, projectType, parent) {
  const { i18nReactive } = useLangStore();
  let path;
  switch (projectType) {
    case 0:
      path = 'calculate';
      break;
    case 1:
      path = 'client';
      break;
    case 2:
      path = 'collection';
      break;
    case 3:
      path = 'datasource';
      break;
    case 4:
      path = 'alarm';
      break;
    default:
      path = '';
      break;
  }
  for (const row of tree) {
    row.name = row.name === '默认工程组' ? i18nReactive('defaultProgroupName') : row.name;
    row.path = path;
    row.parent = { ...parent };
    row.projectType = projectType;
    row.id = row.id || row.guid || row.GUID;
  }
  return tree;
}
