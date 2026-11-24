import { defineStore } from 'pinia';
import { useLangStore } from '@/stores/langStore.js';
import { getDataDirectoryGroupServer, getCustomGroupServer, getSystemConfigServer } from '@/api/allRequest/alarmAPI.js';

export const useAlarmMenuStore = defineStore(
  'alarmMenuStore',
  () => {
    const { i18nReactive } = useLangStore();

    const alarmMenuList = ref([...originalAlarmMenuList()]);

    const currentAlarmEngineer = ref({});

    const currentAlarmRow = ref({});

    function originalAlarmMenuList() {
      return [
        {
          id: 'root',
          name: i18nReactive('dataDictionary'),
          path: 'alarm-data-dictionary',
          icon: 'dataDictionary',
        },
        {
          id: 'alarmRoot',
          name: i18nReactive('customAlarm'),
          path: 'alarm-custom',
          icon: 'scriptCommand',
        },
        {
          id: 'datasourceManage',
          name: i18nReactive('leftMenus.dataSourceEngineer'),
          path: 'alarm-data-source',
          icon: 'dataSourceInner',
        },
        {
          id: 'systemConfig',
          name: i18nReactive('systemConfig'),
          path: 'alarm-system-config',
          icon: 'systemConfig',
        },
      ];
    }

    const getAlarmMenuList = async () => {
      // 需要获取下系统配置接口，后台生成文件
      await getSystemConfigServer();
      const {
        data: { children: dataDictionaryChildren },
      } = await getDataDirectoryGroupServer();
      const dataDictionary = alarmMenuList.value.find((item) => item.id === 'root');
      // 需要递归转换一下children
      translateMenus(dataDictionaryChildren, dataDictionary, dataDictionary, 1);
      dataDictionary.children = dataDictionaryChildren;
      const {
        data: { children: customAlarmChildren },
      } = await getCustomGroupServer();
      const customAlarm = alarmMenuList.value.find((item) => item.id === 'alarmRoot');
      // 需要递归转换一下children
      translateMenus(customAlarmChildren, customAlarm, customAlarm, 1);
      customAlarm.children = customAlarmChildren;

      if (Object.keys(currentAlarmRow.value).length === 0) {
        currentAlarmRow.value = alarmMenuList.value[0];
      }
      return alarmMenuList.value[0];
    };

    const setCurrentAlarmEngineer = (newAlarmEngineer) => {
      currentAlarmEngineer.value = newAlarmEngineer;
    };

    const setCurrentAlarmRow = (newAlarmRow) => {
      currentAlarmRow.value = newAlarmRow;
    };

    function translateMenus(menus, root, parent, level = 1) {
      for (const menu of menus) {
        menu.name = menu.groupName || menu.name;
        menu.id = menu.groupId || menu.id;
        menu.path = root.path;
        menu.icon = root.icon;
        menu.level = level;
        if (level > 1) {
          const { id, name } = parent;
          menu.parent = { id, name, path: root.path };
        }
        if (menu.children && menu.children.length > 0) {
          translateMenus(menu.children, root, menu, level + 1);
        }
      }
    }

    const resetAlarmMenu = () => {
      currentAlarmEngineer.value = {};
      currentAlarmRow.value = {};
      alarmMenuList.value = originalAlarmMenuList();
    };
    return {
      alarmMenuList,
      currentAlarmEngineer,
      currentAlarmRow,
      setCurrentAlarmEngineer,
      setCurrentAlarmRow,
      getAlarmMenuList,
      resetAlarmMenu,
    };
  },
  {
    persist: {
      enabled: true,
      storage: sessionStorage, // 使用 sessionStorage
      key: 'currentAlarmEngineer',
      pick: ['currentAlarmEngineer', 'currentAlarmRow'],
    },
  },
);
