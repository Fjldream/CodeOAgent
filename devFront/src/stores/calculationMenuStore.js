import { defineStore } from 'pinia';
import { useLangStore } from '@/stores/langStore.js';
import { getProjectScriptGroupServer } from '@/api/allRequest/calculationAPI.js';
import { enum_entity } from '@/utils/scriptEnumType.js';

export const useCalculationMenuStore = defineStore(
  'calculationMenuStore',
  () => {
    const { i18nReactive } = useLangStore();

    const calculationMenuList = ref([...originalCalculationMenuList()]);

    const currentCalculateEngineer = ref({});

    const currentCalculateRow = ref({});

    function originalCalculationMenuList() {
      return [
        {
          id: 'globalVars',
          name: i18nReactive('dataDictionary'),
          path: 'calculate-global-variable',
          icon: 'dataDictionary',
          groupId: -1,
          scriptType: 'globalVars',
        },
        {
          id: 'dataSource',
          name: i18nReactive('leftMenus.dataSourceEngineer'),
          path: 'calculate-data-source-management',
          groupId: -1,
          icon: 'dataSourceInner',
          scriptType: 'dataAccess',
        },
        {
          id: 'script',
          name: i18nReactive('script'),
          icon: 'scriptCommand',
          groupId: -1,
          children: [
            {
              id: 'system_scripts',
              name: i18nReactive('systemScript'),
              path: 'calculate-system-scripts',
              groupId: -1,
              icon: 'scriptChildNode',
            },
            {
              id: 'periods',
              name: i18nReactive('periodsScript'),
              path: 'calculate-period-script',
              scriptType: 'periods',
              icon: 'scriptChildNode',
              groupId: -1,
            },
            {
              id: 'dataChanges',
              name: i18nReactive('dataChangeScript'),
              path: 'calculate-datachange-script',
              scriptType: 'dataChanges',
              icon: 'scriptChildNode',
              groupId: -1,
            },
            {
              id: 'conditions',
              name: i18nReactive('conditionScript'),
              path: 'calculate-conditionalevent-script',
              scriptType: 'conditions',
              icon: 'scriptChildNode',
              groupId: -1,
            },
            {
              id: 'APIs',
              name: i18nReactive('requestScript'),
              path: 'calculate-askcalculate-script',
              scriptType: 'APIs',
              icon: 'scriptChildNode',
              groupId: -1,
            },
            {
              id: 'functions',
              name: i18nReactive('customFunction'),
              path: 'calculate-selfdefine-script',
              scriptType: 'functions',
              icon: 'scriptChildNode',
              groupId: -1,
            },
          ],
        },
        {
          id: 'action_bar',
          name: i18nReactive('scriptRequire'),
          icon: 'scriptRely',
          children: [
            {
              id: 'java_script',
              name: 'JavaScript',
              icon: 'commonChildNode',
              children: [
                {
                  id: 'npm_dependencies',
                  name: i18nReactive('npmRequire'),
                  icon: 'commonChildNode',
                  path: 'calculate-npm-dependencies',
                },
                {
                  id: 'calculate-normal-dependencies',
                  name: i18nReactive('normalRequire'),
                  icon: 'commonChildNode',
                  path: 'calculate-normal-dependencies',
                },
              ],
            },
            {
              id: 'py_dependencies',
              name: 'Python',
              icon: 'commonChildNode',
              path: 'calculate-py-dependencies',
            },
          ],
        },
      ];
    }

    const resetCalculationMenu = () => {
      currentCalculateEngineer.value = {};
      currentCalculateRow.value = {};
      calculationMenuList.value = originalCalculationMenuList();
    };
    const setCurrentCalculateEngineer = (row) => {
      currentCalculateEngineer.value = row;
    };
    const setCurrentCalculateRow = (row) => {
      currentCalculateRow.value = row;
    };

    const getCalculateMenuList = async () => {
      const result = await getProjectScriptGroupServer({ ...currentCalculateEngineer.value });

      const menuList = toRaw(calculationMenuList.value);
      for (const row of result) {
        addCalculateTree(row, menuList);
      }
      // 需要给calculationMenuList重新赋值 不然左树不渲染
      calculationMenuList.value = menuList.map((row) => {
        return row;
      });

      if (Object.keys(currentCalculateRow.value).length === 0) {
        currentCalculateRow.value = calculationMenuList.value[0];
      }
    };

    // 根据ID获取层级
    const getLevelById = (targentId) => {
      function findLevel(node, currentLevel) {
        if (node.id === targentId) {
          return currentLevel;
        }
        if (node.children && node.children.length > 0) {
          for (let i = 0; i < node.children.length; i++) {
            const level = findLevel(node.children[i], currentLevel + 1);
            if (level !== -1) return level;
          }
        }
        return -1;
      }

      for (let j = 0; j < calculationMenuList.value.length; j++) {
        const level = findLevel(calculationMenuList.value[j], 1);
        if (level !== -1) return level;
      }
      return -1;
    };

    function addCalculateTree(row, menuList = calculationMenuList.value) {
      const scriptType = enum_entity[row.scriptType]?.entityName || row.scriptType;
      for (const item of menuList) {
        if (item.scriptType === scriptType) {
          item.children = translateTree(row.children, item);
          return item;
        }
        if (item.children) {
          const isFound = addCalculateTree(row, item.children);
          if (isFound) {
            return isFound;
          }
        }
      }
      return null;
    }

    function getRowChildren() {}

    function translateTree(tree, row, level = 1) {
      for (const item of tree) {
        if (!item.level) {
          item.level = 0;
        }
        item.level = level;
        item.name = item.text;
        item.parentId = row.groupId;
        item.id = item.groupId;
        item.path = row.path;
        item.scriptType = row.scriptType;
        if (item.children) {
          translateTree(item.children, item, level + 1);
        }
      }
      return tree;
    }

    return {
      calculationMenuList,
      currentCalculateEngineer,
      currentCalculateRow,
      setCurrentCalculateEngineer,
      setCurrentCalculateRow,
      getCalculateMenuList,
      getLevelById,
      resetCalculationMenu,
    };
  },
  {
    persist: {
      enabled: true,
      storage: sessionStorage, // 使用 sessionStorage
      key: 'currentCalculateEngineer',
      pick: ['currentCalculateEngineer', 'currentCalculateRow'],
    },
  },
);
