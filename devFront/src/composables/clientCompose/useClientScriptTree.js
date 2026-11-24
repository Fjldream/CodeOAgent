import { useBaseTreeKeys } from '@/composables/useBaseTreeKeys.js';
import { getVariableListServer } from '@/api/allRequest/clientAPI.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';

export function useClientScriptTree({ t, scriptEditorStore }) {
  const { setScriptTree, setScriptTreeLoading } = scriptEditorStore;
  const { baseTreeKeys } = useBaseTreeKeys({ t });
  const clientScriptTree = computed(() => [
    { ...baseTreeKeys.value },
    {
      id: 'globalVariable',
      text: t('globalVariable'),
      iconCls: 'scriptEditor',
      children: [],
    },
  ]);

  const setClientScriptTree = async () => {
    setScriptTreeLoading(true);
    const {
      data: { message: variableData },
    } = await getVariableListServer();
    const clientMenuStore = useClientMenuStore();
    const globalVariable = clientScriptTree.value.find((row) => row.id === 'globalVariable');
    const variablesMenus = clientMenuStore.clientMenuList.filter((row) => row.path === 'client-variables-engineer');
    let children = [];
    for (const row of variableData) {
      const data = getVariableTree(variablesMenus, row);
      if (!data) {
        continue;
      }
      for (const rowKey in row) {
        data.children = row[rowKey].Variables.map((res) => {
          return {
            ...res,
            text: res.name,
            iconCls: 'script',
            type: res.dataType,
            desp: res.comment,
            funcbody: `$System.${res.name}`,
          };
        });
        children = [...children, data];
      }
    }
    globalVariable.children = children;
    setScriptTree(clientScriptTree.value);
    setScriptTreeLoading(false);
  };

  const getVariableTree = (variablesMenus, target) => {
    for (const row of variablesMenus) {
      if (target[row.id]) {
        return {
          ...row,
          text: row.name,
          children: [],
        };
      }
      if (row.children?.length) {
        const flag = getVariableTree(row.children, target);
        if (flag) {
          return flag;
        }
      }
    }
    return null;
  };
  return {
    setClientScriptTree,
  };
}
