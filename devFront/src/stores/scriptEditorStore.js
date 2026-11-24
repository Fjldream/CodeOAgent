import { defineStore } from 'pinia';
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { useI18n } from 'vue-i18n';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
// end
import { editProjectJSONDataServer } from '@/api/allRequest/calculationAPI.js';
import { isPlainObject } from '@/utils/commonUtils.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { setGlobalScriptServer } from '@/api/allRequest/clientAPI.js';
import { editCustomScriptServer } from '@/api/allRequest/alarmAPI.js';
export const useScriptEditorStore = defineStore(
  'scriptEditoring',
  () => {
    const { t } = useI18n();

    const mainLeftMenusStore = useMainLeftMenusStore();
    // 已经打开的脚本管理
    const scriptEditorList = ref([]);
    // 是否最小化
    const isMinimized = ref(false);
    // 脚本所在脚本信息
    const leftClickName = ref('');
    // 脚本编译器显隐
    const editorVisible = ref(false);
    // 脚本loading
    const loading = ref(false);
    // 所有修改过的脚本管理
    const changeEditorList = ref([]);
    // 脚本左树
    const scriptTree = shallowRef([]);
    // 脚本左树loading
    const scriptTreeLoading = ref(false);
    // 关键字
    const keyWordList = ref([]);

    const unSaveEditorList = computed(() => {
      const unSaveList = [];
      getUnSaveEditorList(scriptEditorList.value, unSaveList);
      return unSaveList;
    });

    const setScriptTree = (tree) => {
      setTreeId(tree);
      scriptTree.value = tree;
    };
    const setScriptTreeLoading = (isLoading) => {
      scriptTreeLoading.value = isLoading;
    };
    const setLoading = (isLoading) => {
      loading.value = isLoading;
    };

    const setKeyWordList = (value) => {
      keyWordList.value = value;
    };
    const addScriptEditorList = (context) => {
      const isExist = scriptEditorList.value.some((scriptEditor) => scriptEditor.id === context.id);
      if (!isExist) {
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
        // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
        // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
        // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
        if (['periods','APIs','dataChanges','conditions','functions','systemScripts'].includes(context.fileType)) {
// end
        // end
        // end
        // end
          context.assistantProjectId = useCalculationMenuStore().currentCalculateEngineer?.guid;
        }
        scriptEditorList.value.push(context);
// end
      }
    };
    const deleteScriptEditorList = (row) => {
      scriptEditorList.value = scriptEditorList.value.filter((scriptEditor) => scriptEditor.id !== row.id);
    };

    const resetScriptEditorList = () => {
      scriptEditorList.value = [];
      isMinimized.value = false;
      leftClickName.value = '';
      editorVisible.value = false;
      changeEditorList.value = [];
      scriptTree.value = [];
    };

    const setMinimized = (mini) => {
      isMinimized.value = mini;
    };

    const setLeftClickName = (name) => {
      leftClickName.value = name;
    };

    const setVisible = (visible = true) => {
      editorVisible.value = visible;
      isMinimized.value = !visible;
    };

    const setChangeEditorList = (row) => {
      const currentChangeEditor = getCurrentChangeEditor(row);
      if (!currentChangeEditor) {
        changeEditorList.value.push(row);
      } else {
        Object.assign(currentChangeEditor, { ...row });
      }
    };

    const resetEditor = () => {
      scriptEditorList.value = [];
      isMinimized.value = false;
      editorVisible.value = false;
    };

    // 递归寻找当前需要修改的项
    const getCurrentChangeEditor = (row) => {
      for (const item of changeEditorList.value) {
        if (item.id === row.id) {
          return item;
        }
        if (item.tabsList) {
          return getCurrentChangeEditor(item.tabsList);
        }
      }
      return null;
    };

    /**
     *  保存事件
     *  需要做监听
     scriptEditoringStore.$onAction(({ name, args }) => {
     if (name === 'saveEditorList') {
     }
     });
     */
    const saveEditorList = async (row) => {
      let saveList = row;
      if (isPlainObject(row)) {
        saveList = [row];
      }
      let promiseList = [];
      if (mainLeftMenusStore.leftRowSelect.path === 'client') {
        promiseList = saveList.map((item) => {
          return new Promise(async (resolve) => {
            const regs = /^([a-zA-Z_]\w*)\s*(\((.*)\))$/;
            const names = item.name.match(regs);
            switch (item.type) {
              case 'custom':
                if (names && names.length > 2) {
                  item.name = names[1];
                  item.params = names[2];
                }
                break;
              case 'dataChange':
                item.variable = item.clientDataChangeHeaderForm.variable;
                break;
              case 'hotKey':
                item.hotkey = item.ClientHotkeyHeaderForm.hotkey;
                item.keyBinding = item.ClientHotkeyHeaderForm.keyBinding;
                break;
              case 'system':
                item.name = item.id;
                break;
              default:
            }
            const { errorCode } = await setGlobalScriptServer(
              { type: item.type, operation: item.operation },
              {
                name: item.name,
                code: item.code,
                ID: item.ID,
                encrypt: item.encrypt,
                interval: item.interval,
                comment: item.comment || item.description,
                variable: item.variable,
                priority: item.priority,
                key: item.key,
                params: item.params,
                hotkey: item.hotkey,
                keyBinding: item.keyBinding,
              },
            );
            if (errorCode === 0) {
              resolve(item.name);
            }
          });
        });
      } else if (mainLeftMenusStore.leftRowSelect.path === 'alarm') {
        promiseList = saveList.map((item) => {
          return new Promise(async (resolve) => {
            const { errorCode } = await editCustomScriptServer({ script: item.code, alarmItemId: item.id });
            if (errorCode === 0) {
              resolve(item.name);
            }
          });
        });
      } else {
        const fileTypes = ['dataChanges', 'conditions'];
        promiseList = saveList.map(async (item) => {
          return new Promise(async (resolve, reject) => {
            const expression = fileTypes.includes(item.fileType) ? item.headerForm.expression : void 0;
            let inCode;
            let outCode;
            let existCode;
            let interval;
            let unit;
            if (item.fileType === 'conditions') {
              interval = item.treeHeader?.interval;
              unit = item.treeHeader?.unit;
              for (const data of item.tabsList) {
                if (data.id === 'in') {
                  inCode = data.code;
                } else if (data.id === 'exist') {
                  existCode = data.code;
                } else if (data.id === 'out') {
                  outCode = data.code;
                }
              }
            }
            const result = await editProjectJSONDataServer({
              type: item.fileType,
              expression: expression,
              scriptId: item.id,
              text: item.code,
              in: inCode,
              out: outCode,
              exist: existCode,
              interval: interval,
              unit: unit,
            });
            if (result === 0) {
              resolve(item.name);
            } else {
              reject(item.name);
            }
          });
        });
      }

      const names = await Promise.all(promiseList);
      ElMessage.success(t(`scriptTips`, { name: names.join(',') }));
    };
    function setTreeId(tree) {
      for (const treeElement of tree) {
        if (!treeElement.id) {
          treeElement.id = treeElement.text;
        }
        if (treeElement.children?.length > 0) {
          setTreeId(treeElement.children);
        }
      }
    }
    return {
      scriptEditorList,
      loading,
      keyWordList,
      isMinimized,
      leftClickName,
      editorVisible,
      changeEditorList,
      scriptTree,
      scriptTreeLoading,
      unSaveEditorList,
      setScriptTree,
      addScriptEditorList,
      resetScriptEditorList,
      setMinimized,
      setLeftClickName,
      setVisible,
      setChangeEditorList,
      resetEditor,
      getCurrentChangeEditor,
      saveEditorList,
      setKeyWordList,
      setLoading,
      setScriptTreeLoading,
      deleteScriptEditorList,
    };
  },
  {
    persist: {
      enabled: true,
      key: 'scriptStore',
      storage: sessionStorage,
      pick: ['leftClickName', 'changeEditorList'],
    },
  },
);

function getUnSaveEditorList(list = [], unSaveList = [], group = '') {
  for (const listEle of list) {
    if (!listEle.save) {
      listEle.path = listEle.group || group;
      unSaveList.push(listEle);
    }
  }
}
