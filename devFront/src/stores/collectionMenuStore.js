import { defineStore } from 'pinia';
import { getDeviceGroupServer } from '@/api/allRequest/collectionAPI.js';
import { useLangStore } from '@/stores/langStore.js';

export const useCollectionMenuStore = defineStore(
  'collectionMenuStore',
  () => {
    const { i18nReactive } = useLangStore();
    const collectionMenuList = ref(resetCollectionMenuList());

    const currentCollectionEngineer = ref({});
    const currentCollectionRow = ref({});
    const currentCollectionTitle = ref([]);

    function resetCollectionMenuList() {
      return [
        {
          id: 'deviceRoot',
          name: i18nReactive('daqDevice'),
          path: 'collection-daq-equipment',
          icon: 'daqEquipment',
          children: [],
        },
        {
          id: 'variablesRoot',
          name: i18nReactive('daqVariables'),
          path: 'collection-daq-variables',
          icon: 'daqVariables',
          children: [],
        },
        {
          id: 'collection-network-configuration',
          name: i18nReactive('networkConfiguration'),
          path: 'collection-network-configuration',
          icon: 'networkConfiguration',
          children: [],
        },
        {
          id: 'collection-storage-configuration',
          name: i18nReactive('storageConfiguration'),
          path: 'collection-storage-configuration',
          icon: 'storageConfiguration',
          children: [],
        },
        {
          id: 'collection-forwarding-configuration',
          name: i18nReactive('forwardConfiguration'),
          path: 'collection-forwarding-configuration',
          icon: 'forwardingConfiguration',
          children: [],
        },
        {
          id: 'collection-opc-ua',
          name: 'OPCUA',
          path: 'collection-opc-ua',
          icon: 'daqOPCUA',
        },
        {
          id: 'collection-opc-da',
          name: 'OPCDA',
          path: 'collection-opc-da',
          icon: 'daqOPCDA',
        },
      ];
    }

    const resetCollectionMenu = () => {
      currentCollectionEngineer.value = {};
      currentCollectionRow.value = {};
      currentCollectionTitle.value = [];
      collectionMenuList.value = resetCollectionMenuList();
    };

    const setCurrentCollectionEngineer = (row) => {
      currentCollectionEngineer.value = row;
    };
    const setCurrentCollectionRow = (row) => {
      currentCollectionRow.value = row;
    };
    const setCurrentCollectionTitle = (row) => {
      currentCollectionTitle.value = row;
    };

    const getCollectionMenuList = async () => {
      const [{ children: deviceGroupChildren }] = await getDeviceGroupServer({ groupType: 1 });
      const deviceGroup = collectionMenuList.value.find((item) => item.id === 'deviceRoot');
      // 需要递归转换一下children
      translateMenus(deviceGroupChildren, deviceGroup, 1, deviceGroup);
      deviceGroup.children = deviceGroupChildren;

      const [{ children: variableGroupChildren }] = await getDeviceGroupServer({ groupType: 2 });
      const variableGroup = collectionMenuList.value.find((item) => item.id === 'variablesRoot');
      // 需要递归转换一下children
      translateMenus(variableGroupChildren, variableGroup, 1, variableGroup);
      variableGroup.children = variableGroupChildren;

      if (Object.keys(currentCollectionRow.value).length === 0) {
        currentCollectionRow.value = collectionMenuList.value[0];
      }
    };

    function translateMenus(menus, root, level = 1, parent) {
      for (const menu of menus) {
        menu.name = menu.text;
        menu.actualId = String(menu.id);
        menu.id = `${root.id}_${menu.id}`;
        menu.path = root.path;
        menu.icon = root.icon;
        menu.level = level;
        if (level > 0) {
          const { id, name } = parent;
          menu.parent = { id, name, path: root.path };
        }
        if (menu.children && menu.children.length > 0) {
          translateMenus(menu.children, root, level + 1, menu);
        }
      }
    }

    return {
      collectionMenuList,
      currentCollectionEngineer,
      currentCollectionRow,
      currentCollectionTitle,
      setCurrentCollectionTitle,
      setCurrentCollectionEngineer,
      setCurrentCollectionRow,
      getCollectionMenuList,
      resetCollectionMenu,
    };
  },
  {
    persist: {
      enabled: true,
      storage: sessionStorage, // 使用 sessionStorage
      key: 'currentCollectionEngineer',
      pick: ['currentCollectionEngineer', 'currentCollectionRow', 'currentCollectionTitle'],
    },
  },
);
