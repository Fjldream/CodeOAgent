import { defineStore } from 'pinia';
import { getProjectConfigureTreeServer, getProjectFileServer } from '@/api/allRequest/clientAPI';
import { useLangStore } from '@/stores/langStore.js';

export const useClientMenuStore = defineStore(
  'clientMenuStore',
  () => {
    const { i18nReactive } = useLangStore();
    const clientMenuList = ref(resetClientMenuList());

    const currentClientEngineer = ref({});
    const currentClientRow = ref({});
    const currentClientTitle = ref([]);

    function resetClientMenuList() {
      return [
        {
          id: 'client-page-management',
          name: i18nReactive('pageManage'),
          path: 'client-page-management',
          icon: 'pageManage',
          children: [],
        },
        {
          id: 'client-data-source-management',
          name: i18nReactive('leftMenus.dataSourceEngineer'),
          path: 'client-data-source-management',
          icon: 'dataSourceInner',
          children: [],
        },
        {
          id: 'client-variables-engineer',
          name: i18nReactive('projectVariables'),
          icon: 'dataDictionary',
          path: 'client-variables-engineer',
          children: [],
        },
        {
          id: 'client-safe-object',
          name: i18nReactive('safeObject'),
          icon: 'safeObject',
          path: 'client-safe-object',
          children: [],
        },
        {
          id: 'client-graphic-model-library',
          name: i18nReactive('graphicModelLibrary'),
          icon: 'graphicModelLibrary',
          path: 'client-graphic-model-library',
          children: [],
        },
        {
          id: 'client-report-library',
          name: i18nReactive('reportLibiary'),
          icon: 'reportLibiary',
          path: 'client-report-library',
          children: [],
        },
        {
          id: 'client-system',
          name: i18nReactive('commandLanguage'),
          icon: 'scriptCommand',
          children: [
            {
              id: 'client-system-script',
              name: i18nReactive('systemScript'),
              icon: 'scriptChildNode',
              path: 'client-system-script',
            },
            {
              id: 'client-timer-script',
              name: i18nReactive('intervalScript'),
              icon: 'scriptChildNode',
              path: 'client-timer-script',
            },
            {
              id: 'client-data-change-script',
              name: i18nReactive('dataChangeScript'),
              icon: 'scriptChildNode',
              path: 'client-data-change-script',
            },
            {
              id: 'client-custom-script',
              name: i18nReactive('customScript'),
              icon: 'scriptChildNode',
              path: 'client-custom-script',
            },
            {
              id: 'client-hotkey-script',
              name: i18nReactive('hotkeyScript'),
              icon: 'scriptChildNode',
              path: 'client-hotkey-script',
            },
          ],
        },
        {
          id: 'client-3d-resource-management',
          name: i18nReactive('resourceManagefor3D'),
          icon: 'resourceManagefor3D',
          path: 'client-3d-resource-management',
        },
        {
          id: 'internationl-translation',
          name: i18nReactive('internationlTranslation'),
          icon: 'internationlTranslation',
          children: [
            {
              id: 'component-translator',
              name: i18nReactive('componentTranslator'),
              icon: 'commonChildNode',
              path: 'client-translation-resource',
            },
            {
              id: 'client-custom-translator',
              name: i18nReactive('customTranslator'),
              icon: 'commonChildNode',
              path: 'client-custom-translator',
            },
          ],
        },
      ];
    }

    const resetClientMenu = () => {
      currentClientEngineer.value = {};
      currentClientRow.value = {};
      currentClientTitle.value = [];
      clientMenuList.value = resetClientMenuList();
    };

    const setCurrentClientEngineer = (row) => {
      currentClientEngineer.value = row;
    };
    const setCurrentClientRow = (row) => {
      currentClientRow.value = row;
    };
    const setCurrentClientTitle = (row) => {
      currentClientTitle.value = row;
    };

    const getClientMenuList = async () => {
      const { guid: projectId } = currentClientEngineer.value;
      const result = await getProjectConfigureTreeServer({ projectId });
      const treeObjs = result.data.message;
      const keys = Object.keys(treeObjs);
      const clientMenus = resetClientMenuList();
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        const treeObj = treeObjs[key];
        switch (key) {
          case 'pageTree':
            if (treeObj.name === '页面管理') {
              treeObj.name = i18nReactive('pageManage');
            }
            break;
          case 'variableTree':
            if (treeObj?.Groups?.name === '工程变量') {
              treeObj.Groups.name = i18nReactive('projectVariables');
            }
            break;
          case 'reportTree':
            if (treeObj[0].name === '默认报表组') {
              treeObj[0].name = i18nReactive('defaultReportGroup');
            }
            break;
          default:
            break;
        }
        addClientTree(key, treeObj, clientMenus);
      }
      clientMenuList.value = clientMenus;
      if (Object.keys(currentClientRow.value).length === 0) {
        currentClientRow.value = clientMenuList.value[0];
      }
    };

    const getGraphicModeFile = async () => {
      const { guid } = currentClientEngineer.value;
      const type = 7;
      const name = 'GraphicModelManager';
      const graphicRestful = await getProjectFileServer({ type, name, guid });
      if (!graphicRestful || graphicRestful.errorCode !== 0) {
        return null;
      }
      return graphicRestful.data;
    };
    const getDiffusionManager = async () => {
      const { guid } = currentClientEngineer.value;
      const type = 14;
      const name = 'diffusionManager';
      const graphicRestful = await getProjectFileServer({ type, name, guid });
      if (!graphicRestful || graphicRestful.errorCode !== 0) {
        return null;
      }
      return graphicRestful.data;
    };
    //获取语言类型
    const getCustomeLangguageFile = async () => {
      const { guid } = currentClientEngineer.value;
      const type = 20;
      const name = 'customelangguage';
      const restful = await getProjectFileServer({ type, name, guid });
      if (!restful || restful.errorCode !== 0) {
        return null;
      }
      return restful.data;
    };

    //获取语言资源信息
    const getUserSourceFile = async () => {
      const { guid } = currentClientEngineer.value;
      const type = 20;
      const name = 'userSource';
      const restful = await getProjectFileServer({ type, name, guid });
      if (!restful || restful.errorCode !== 0) {
        return null;
      }
      return restful.data;
    };

    function conversionFormat(value) {
      const enum_client = [
        {
          value: 'pageTree',
          label: 'client-page-management',
        },
        {
          value: 'variableTree',
          label: 'client-variables-engineer',
        },
        {
          value: 'graphicTree',
          label: 'client-graphic-model-library',
        },
        {
          value: 'reportTree',
          label: 'client-report-library',
        },
      ];
      return enum_client.find((item) => item.value === value)?.label || null;
    }

    function addClientTree(treeName, treeObj, clientMenus) {
      const path = conversionFormat(treeName);
      if (treeName === 'scriptGroup') {
        translateScriptGroup(clientMenus, treeObj);
        return clientMenus;
      }
      const item = clientMenus.find((row) => row.path === path);
      switch (path) {
        case 'client-page-management':
          const tree = translateTree([treeObj], path);
          Object.assign(item, tree[0]);
          return clientMenus;
        case 'client-variables-engineer':
          if (treeObj.Groups) {
            const treeData = translateTree([treeObj.Groups], path);
            Object.assign(item, treeData[0]);
          }
          return clientMenus;
        case 'client-graphic-model-library':
          item.children = translateGraphicTree(treeObj, path, { ...item });
          item.level = 1;
          return clientMenus;
        case 'client-report-library':
          item.children = translateReportTree(treeObj, path, { ...item });
          item.level = 1;
          return clientMenus;
        default:
      }
      return clientMenus;
    }

    function translateTree(tree, path, level = 1, parent) {
      return tree.map((node) => {
        const newNode = {
          id: node.id,
          path: path,
          name: node.name,
          level: level,
        };
        if (level > 1) {
          newNode.icon = 'commonChildNode';
          const { id, name } = parent;
          newNode.parent = { id, name, path };
          newNode.groupName = node.name;
        } else {
          newNode.parent = null;
        }
        const subNodes = node.groups || node.children;
        if (Array.isArray(subNodes)) {
          newNode.children = translateTree(subNodes, path, level + 1, newNode);
        }
        return newNode;
      });
    }

    function translateGraphicTree(data, path, parent) {
      const result = [];
      for (const groupName in data['图形模型库']) {
        result.push({
          id: groupName,
          path: path,
          parent: parent,
          name: groupName,
          level: 2,
          groupName,
          icon: 'commonChildNode',
        });
      }
      return result;
    }

    function translateReportTree(data, path, parent) {
      const result = [];
      for (let index = 0; index < data.length; index++) {
        result.push({
          id: data[index].id,
          path: path,
          parent: parent,
          name: data[index].name,
          level: 2,
          groupName: data[index].name,
          icon: 'commonChildNode',
        });
      }
      return result;
    }

    function translateScriptGroup(clientMenus, treeObj) {
      const scriptMenu = clientMenus.find((row) => row.id === 'client-system');
      for (const child of scriptMenu.children) {
        child.children = treeObj
          .filter((row) => row.parentId === child.id)
          .map((row) => {
            return {
              ...row,
              path: child.path,
              parent: { id: child.id, name: child.name, path: child.path },
              level: 4,
              groupName: row.name,
              icon: 'commonChildNode',
            };
          });
      }
    }

    return {
      clientMenuList,
      currentClientEngineer,
      currentClientRow,
      currentClientTitle,
      setCurrentClientTitle,
      setCurrentClientEngineer,
      setCurrentClientRow,
      getClientMenuList,
      resetClientMenu,
      getGraphicModeFile,
      getCustomeLangguageFile,
      getUserSourceFile,
      getDiffusionManager,
    };
  },
  {
    persist: {
      enabled: true,
      storage: sessionStorage, // 使用 sessionStorage
      key: 'currentClientEngineer',
      pick: ['currentClientEngineer', 'currentClientRow', 'currentClientTitle'],
    },
  },
);
