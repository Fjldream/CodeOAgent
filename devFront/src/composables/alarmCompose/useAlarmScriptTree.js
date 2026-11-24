import { useBaseTreeKeys } from '@/composables/useBaseTreeKeys.js';
import { getAllTagsServer } from '@/api/allRequest/alarmAPI.js';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';

const alarmMenuStore = useAlarmMenuStore();

export function useAlarmScriptTree({ t, scriptEditorStore }) {
  const { setScriptTree } = scriptEditorStore;
  const { baseTreeKeys } = useBaseTreeKeys({ t });

  const alarmScriptTree = computed(() => [
    { ...baseTreeKeys.value },
    {
      id: 'globalVariable',
      text: t('globalVariable'),
      iconCls: 'scriptEditor',
      children: [],
    },
  ]);

  const setAlarmScriptTree = async () => {
    const { data } = await getAllTagsServer();

    // 获取报警数据词典菜单
    const alarmVariableList = await alarmMenuStore.getAlarmMenuList();

    const alarmVariableTree = getAlarmVariableTree(alarmVariableList, data);

    const globalVariable = alarmScriptTree.value.find((row) => row.id === 'globalVariable');
    globalVariable.children = alarmVariableTree;
    setScriptTree(alarmScriptTree.value);
  };
  return {
    setAlarmScriptTree,
  };
}
// 将词典菜单格式改为全局变量格式并在data找到词典对应的变量值
function getAlarmVariableTree(dictionary, data = []) {
  if (!dictionary?.children?.length) {
    if (dictionary.id === 'root') {
      return data.map((dataItem) => {
        return {
          text: dataItem.Name,
          iconCls: 'script',
          type: dataItem.Type,
          funcbody: `$Alarm.${dataItem.Name}`,
        };
      });
    } else {
      return [];
    }
  }

  return dictionary.children.map((item) => {
    const alarmVariable = data
      .filter((dataItem) => {
        return dataItem.groupId === item.groupId;
      })
      .map((dataItem) => {
        return {
          text: dataItem.Name,
          iconCls: 'script',
          type: dataItem.Type,
          funcbody: `$Alarm.${dataItem.Name}`,
        };
      });

    return {
      text: item.name,
      iconCls: 'scriptEditor',
      type: item.level,
      children: getAlarmVariableTree(item, data).concat(alarmVariable),
    };
  });
}
