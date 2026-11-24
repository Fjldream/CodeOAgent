<script setup>
import { useI18n } from 'vue-i18n';
import _ from 'lodash-es';
import { Search } from '@element-plus/icons-vue';
import { useConfirm } from '@/composables/useConfirm.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { recursiveSearch } from '@/utils/commonUtils.js';

import AceEditor from '@/components/AceEditor/AceEditor.vue';
import TreeHeader from '@/components/ScriptEditorDialog/treeHeader/TreeHeader.vue';
import CalculateHeaderForm from '@/components/ScriptEditorDialog/HeaderForm/CalculateHeaderForm.vue';
import UnSaveDialog from '@/components/ScriptEditorDialog/UnSaveDialog/UnSaveDialog.vue';
import ClientDataChangeHeaderForm from '@/components/ScriptEditorDialog/HeaderForm/ClientDataChangeHeaderForm.vue';
import ClientSystemHeaderForm from '@/components/ScriptEditorDialog/HeaderForm/ClientSystemHeaderForm.vue';
import ClientTimerHeaderForm from '@/components/ScriptEditorDialog/HeaderForm/ClientTimerHeaderForm.vue';
import ClientCustomHeaderForm from '@/components/ScriptEditorDialog/HeaderForm/ClientCustomHeaderForm.vue';
import ClientHotkeyHeaderForm from '@/components/ScriptEditorDialog/HeaderForm/ClientHotkeyHeaderForm.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import CustomDebugging from '@/views/Main/CalculateView/CalculateDialogView/CustomDebugging.vue';
import { nextTick } from 'vue';

const { t } = useI18n();

const emit = defineEmits(['update:scriptEditorVisible']);

const scriptEditoringStore = useScriptEditorStore();
const mainLeftMenusStore = useMainLeftMenusStore();

const { deleteScriptEditorList, setMinimized, setChangeEditorList, resetEditor, saveEditorList, setScriptTree } =
  scriptEditoringStore;

const { isMinimized, editorVisible, scriptEditorList, unSaveEditorList, scriptTree, scriptTreeLoading } =
  storeToRefs(scriptEditoringStore);

const cssVars = {
  '--header-height': '250px',
  '--ace-height': '460px',
};
const scriptEditorWidth = ref(1600);
const code = ref('');
const aceEditorRef = ref({});
const activeTab = ref('');
const activeChildTab = ref('');
// modified by jinlong.feng at 2026-11-20 KF开发助手M1
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
import { assistantState, scriptEntry } from '@/assistant/entry.js';
// end
import { assistantEnabled } from '@/assistant/api.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { createEditorSession } from '@/assistant/editor-context.js';
const calculationStore = useCalculationMenuStore();
const scriptSession = createEditorSession();
watchEffect(() => {
  const item = scriptEditorList.value.find(row => row.id === activeTab.value);
  const project = calculationStore.currentCalculateEngineer;
  // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
  // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
  // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
  const configEntry={systemScripts:['calculate-system-scripts','系统脚本'],conditions:['calculate-conditionalevent-script','条件事件'],dataChanges:['calculate-datachange-script','数据变化脚本'],functions:['calculate-selfdefine-script','自定义函数']}[item?.fileType];
// end
  if (configEntry && project?.guid && item.assistantProjectId === project.guid) {
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
    const tab=item.tabsList?.find(tab=>tab.name===activeChildTab.value);
    scriptEntry.value = {kind:'calculation', projectId:project.guid, object:item.id,
      ...(tab && {scriptPhase:tab.id}),scriptText:tab ? tab.code : item.code,
      editor:{session:scriptSession.session,sequence:++scriptSession.sequence},
// end
      calcMenu:configEntry[0],label:configEntry[1]+' / '+item.name,
  // end
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
      dirty:tab ? tab.save===false : item.save===false,group:String(item.groupId ?? '-1')};
// end
    return;
  }
  // end
  const kind = { periods: 'period', APIs: 'request' }[item?.fileType];
  // end
  scriptEntry.value = kind && project?.guid && item.assistantProjectId === project.guid ? {
    kind, projectId:project.guid, object:item.id,
    label:(kind === 'period' ? '周期脚本 / ' : '请求式脚本 / ') + item.name,
    dirty:item.save === false, scriptText:item.code,
    editor:{session:scriptSession.session,sequence:++scriptSession.sequence},
  } : null;
});
// end
onBeforeUnmount(()=>{scriptEntry.value=null;});
// end
const fullScreen = ref(false);
const clickTreeNode = ref(null);
const dialogShow = ref(false);
const debugVisible = ref(false);
const searchValue = ref('');
let treeData = {};
nextTick(() => {
  treeData = _.cloneDeep(scriptTree.value);
});
const treeRef = ref({});
const expandedKeys = ref([]);
const defaultProps = {
  children: 'children',
  label: 'text',
};

watchEffect(() => {
  if (!editorVisible.value) {
    nextTick(() => {
      handleClose();
    });
    return;
  }
  if (!isMinimized.value) {
    nextTick(() => {
      open();
    });

    return;
  }
  hideDialogMask();
});

watch(
  () => activeTab.value,
  (activeValue) => {
    const activeRow = scriptEditorList.value.find((row) => row.id === activeValue);
    if (activeRow?.tabsList) {
      activeChildTab.value = activeRow.tabsList[0].name;
    }
  },
  { immediate: true },
);

const hideDialogMask = () => {
  const mask = document.getElementsByClassName('system-custom-dialog')[0]?.parentNode?.parentElement;
  if (mask) {
    mask.style.pointerEvents = 'none';
    mask.style.background = 'transparent';
  }
};

const open = () => {
  showDialogMask();
  restoreHandle();
  activeTab.value = scriptEditorList.value[scriptEditorList.value.length - 1]?.id;
};

const handleClose = () => {
  if (unSaveEditorList.value.length > 0) {
    dialogShow.value = true;
    return;
  }
  resetEditor();
};

const miniHandle = () => {
  setMinimized(true);
};

const restoreHandle = () => {
  setMinimized(false);
};

const fullScreenHandle = (row) => {
  fullScreen.value = !fullScreen.value;
  for (const rowKey in aceEditorRef.value) {
    aceEditorRef.value[rowKey]?.toggleFullscreen?.();
  }
};

const showDialogMask = () => {
  const mask = document.getElementsByClassName('system-custom-dialog')[0]?.parentNode?.parentElement;
  if (mask) {
    mask.style.pointerEvents = '';
    mask.style.background = '';
  }
};

const handleCloseClick = async (row) => {
  try {
    if (!row.save) {
      await useConfirm(t(`saveNowTip`, { scriptName: row.name }), t('tip'), 'warning', t('save'), t('notSave'));
      await saveEditorList(row);
    }
    cancelHandle(row);
  } catch (e) {
    if (e === 'cancel') {
      cancelHandle(row);
    }
  }
};

const cancelHandle = (row) => {
  deleteScriptEditorList(row);
  const scriptEditorListLength = scriptEditorList.value.length;
  if (scriptEditorListLength === 0) {
    unSaveHandle();
  }
  activeTab.value = scriptEditorList.value[scriptEditorListLength - 1]?.id;
};
const handleCodeChange = (row) => {
  row.save = false;
};
const aceEditorSaveHandle = (row) => {
  saveEditorList({ ...row });
  row.save = true;
};

const tabMouseOut = (row) => {
  if (activeTab.value === row.id) {
    row.isHover = true;
  }
};

const tabMouseEnter = (row) => {
  if (activeTab.value === row.id) {
    row.isHover = false;
  }
};

const setAceEditorRefs = (el, row) => {
  aceEditorRef.value[row.id] = el;
};
const setTreeRefs = (el, row) => {
  treeRef.value[row.id] = el;
};
const nodeClickHandle = (row) => {
  if ('type' in row) {
    clickTreeNode.value = row;
  } else {
    clickTreeNode.value = null;
  }
};
const treeDblClickHandle = (row) => {
  //如果有children则不能文本填充
  if (clickTreeNode?.value?.hasOwnProperty('children')) {
    return;
  }
  aceEditorRef.value[row.id]?.insertTextAtCursor(clickTreeNode.value?.funcbody || clickTreeNode.value?.text);
};

const indent = (row) => {
  aceEditorRef.value[row.id]?.indent();
};
const outdent = (row) => {
  aceEditorRef.value[row.id]?.outdent();
};
const addComment = (row) => {
  aceEditorRef.value[row.id]?.addComment();
};
const formatCode = (row) => {
  aceEditorRef.value[row.id]?.formatCode();
};
const findHandle = (row) => {
  aceEditorRef.value[row.id]?.findHandle();
};

const unSaveHandle = () => {
  dialogShow.value = false;
  resetEditor();
};
const saveHandle = (saveData) => {
  saveEditorList(saveData);
  setChangeEditorList(saveData);
  unSaveHandle();
};

const searchTree = () => {
  const filterResult = recursiveSearch(treeData, searchValue.value);
  setScriptTree(filterResult.tree);
  nextTick(() => {
    expandedKeys.value = [...new Set(filterResult.expandKeys)];
  });
};
</script>

<template>
  <!-- 编辑器弹窗 -->
  <el-dialog
    v-model="editorVisible"
    :append-to-body="true"
    :before-close="handleClose"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :destroy-on-close="false"
    :draggable="true"
    :fullscreen="fullScreen"
    :show-close="false"
    :style="isMinimized ? 'visibility: hidden; pointer-events: none;' : ''"
    :width="scriptEditorWidth"
    class="system-custom-dialog"
    top="10vh"
  >
    <template #header>
      <div class="df w-100 space-between">
        <div>{{ t('scriptEditor') }}</div>
        <div class="df w40 space-between">
          <el-icon class="pointer" @click="miniHandle">
            <IEpMinus />
          </el-icon>
          <el-icon class="pointer" @click="fullScreenHandle">
            <IEpFullScreen />
          </el-icon>
          <el-icon class="pointer" @click="handleClose">
            <IEpClose />
          </el-icon>
        </div>
      </div>
    </template>
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane v-for="item of scriptEditorList" :key="item.id" :name="item.id" :style="item.cssVars || cssVars">
        <template #label>
          <div class="df custom-tab-label" @mouseout.stop="tabMouseOut(item)">
            <el-tooltip :content="`${item.group}/${item.name}`" :show-after="500" effect="light" placement="top">
              <div class="mr-20">{{ item.name }}</div>
            </el-tooltip>
            <div class="w-16">
              <div v-if="!item.save && item.isHover" class="red-dot" @mouseenter.stop="tabMouseEnter(item)"></div>
              <el-icon v-else-if="activeTab === item.id" class="pointer" @click.stop="handleCloseClick(item)">
                <IEpCloseBold />
              </el-icon>
            </div>
          </div>
        </template>
        <!-- 工具栏 -->
        <div class="mb-2">
          <!-- 编译器的头部 -->
          <div>
            <CalculateHeaderForm v-if="item.headerForm" :header-form="item.headerForm" />
            <ClientSystemHeaderForm v-if="item.clientSystemHeaderForm" :header-form="item.clientSystemHeaderForm" />
            <ClientTimerHeaderForm v-if="item.clientTimerHeaderForm" :header-form="item.clientTimerHeaderForm" />
            <ClientDataChangeHeaderForm
              v-if="item.clientDataChangeHeaderForm"
              v-model:header-form="item.clientDataChangeHeaderForm"
            />
            <ClientCustomHeaderForm v-if="item.clientCustomHeaderForm" :header-form="item.clientCustomHeaderForm" />
            <ClientHotkeyHeaderForm v-if="item.ClientHotkeyHeaderForm" :header-form="item.ClientHotkeyHeaderForm" />
          </div>
          <header class="toolbar-left mb-5">
<!-- modified by jinlong.feng at 2026-11-20 KF开发助手M1 -->
<!-- modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗 -->
            <el-button v-if="assistantEnabled && scriptEntry && item.id===activeTab" size="small" @click="assistantState = 'open'">询问此脚本</el-button>
<!-- end -->
<!-- end -->
            <el-tooltip :content="t('save')" :show-after="500" effect="light" placement="bottom-end">
              <el-button size="small" @click="aceEditorSaveHandle(item)">
                <el-icon>
                  <IEpCollection />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="t('addIndent')" :show-after="500" effect="light" placement="bottom-end">
              <el-button size="small" @click="indent(item)">
                <el-icon>
                  <IEpExpand />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="t('decreaseIndent')" :show-after="500" effect="light" placement="bottom-end">
              <el-button size="small" @click="outdent(item)">
                <el-icon>
                  <IEpFold />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="t('note')" :show-after="500" effect="light" placement="bottom-end">
              <el-button size="small" @click="addComment(item)">
                <el-icon>
                  <IEpOperation />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="t('format')" :show-after="500" effect="light" placement="bottom-end">
              <el-button size="small" @click="formatCode(item)">
                <el-icon>
                  <IEpCrop />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="t('find')" :show-after="500" effect="light" placement="bottom-end">
              <el-button size="small" @click="findHandle(item)">
                <el-icon>
                  <IEpSearch />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip
              v-if="mainLeftMenusStore.leftRowSelect.path === 'calculate'"
              :content="t('debug')"
              :show-after="500"
              effect="light"
              placement="bottom-end"
            >
              <el-button size="small" @click="debugVisible = true">
                <CustomIcon name="debugIcon" svgStyle="width:1em;height:1em" />
              </el-button>
            </el-tooltip>
          </header>
        </div>

        <main v-if="item.tabsList && item.tabsList.length" class="w-100 tabs-custom">
          <el-tabs v-model="activeChildTab" class="flex-6" type="border-card">
            <el-tab-pane
              v-for="tabs of item.tabsList"
              :key="tabs.name"
              :label="tabs.name"
              :name="tabs.name"
              class="df align-start"
            >
              <AceEditor
                :key="tabs.id"
                :ref="(el) => setAceEditorRefs(el, tabs)"
                v-model:modelValue="tabs.code"
                :fullScreen="fullScreen"
                :onSave="
                  () => {
                    aceEditorSaveHandle(item);
                  }
                "
                class="flex-6"
                @update:modelValue="() => handleCodeChange(item)"
              />
              <div class="flex-1">
                <TreeHeader v-if="item.treeHeader && tabs.id === 'exist'" v-model:tree-form="item.treeHeader" />
                <el-input v-model="searchValue" :suffix-icon="Search" @change="searchTree" clearable />
                <el-tree-v2
                  :ref="(el) => setTreeRefs(el, tabs)"
                  node-key="id"
                  :class="['tree', { fullScreen }]"
                  :data="scriptTree"
                  :props="defaultProps"
                  :default-expanded-keys="expandedKeys"
                  :expand-on-click-node="false"
                  :height="460"
                  @dblclick="treeDblClickHandle(tabs)"
                  @node-click="nodeClickHandle"
                >
                  <template #default="{ node, data }">
                    <CustomIcon v-if="data.iconCls" :name="data.iconCls" class="common-icon" />
                    <el-tooltip :content="node.label" :show-after="500" effect="light" placement="right-start">
                      <div class="node-label ellipsis">{{ node.label }}</div>
                    </el-tooltip>
                  </template>
                </el-tree-v2>
              </div>
            </el-tab-pane>
          </el-tabs>
        </main>
        <main v-else class="df w-100 align-start tabs-custom">
          <AceEditor
            :key="item.id"
            :ref="(el) => setAceEditorRefs(el, item)"
            v-model:modelValue="item.code"
            :fullScreen="fullScreen"
            :onSave="
              () => {
                aceEditorSaveHandle(item);
              }
            "
            class="flex-6"
            @update:modelValue="() => handleCodeChange(item)"
          />
          <div class="flex-1">
            <TreeHeader v-if="item.treeHeader" :tree-form="item.treeHeader" />
            <el-input v-model="searchValue" :suffix-icon="Search" @change="searchTree" />
            <el-tree-v2
              :ref="(el) => setTreeRefs(el, item)"
              node-key="id"
              v-loading="scriptTreeLoading"
              element-loading-text="loading.."
              :class="['tree', { fullScreen }]"
              :data="scriptTree"
              :props="defaultProps"
              :expand-on-click-node="false"
              :default-expanded-keys="expandedKeys"
              :height="460"
              @dblclick="treeDblClickHandle(item)"
              @node-click="nodeClickHandle"
            >
              <template #default="{ node, data }">
                <CustomIcon v-if="data.iconCls" :name="data.iconCls" class="common-icon mr-5" />
                <el-tooltip :content="node.label" :show-after="500" effect="light" placement="right-start">
                  <div class="node-label ellipsis">{{ node.label }}</div>
                </el-tooltip>
              </template>
            </el-tree-v2>
          </div>
        </main>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
  <!-- 调试弹窗 -->
  <CustomDebugging v-if="debugVisible" v-model:dialogVisible="debugVisible"></CustomDebugging>
  <UnSaveDialog
    v-if="dialogShow"
    v-model:dialogShow="dialogShow"
    :tableData="unSaveEditorList"
    @saveHandle="saveHandle"
    @unSaveHandle="unSaveHandle"
  />
</template>

<style lang="scss" scoped>
.tree {
  height: 460px;
  width: 220px;
  overflow: auto;
}

.node-label {
  width: 86%;
}

.fullScreen {
  height: calc(100vh - var(--header-height)); /* 减去工具栏高度 */
}

/* 固定大小和颜色的红色圆点 */
.red-dot {
  width: 10px;
  height: 10px;
  background-color: #b4b3b3;
  border-radius: 50%;
}

.flex-1 {
  flex: 1;
}

.flex-6 {
  flex: 6;
}

.w40 {
  width: 80px;
}

.align-start {
  align-items: start;
}

.system-custom-dialog {
  padding: 20px;

  .el-button--small {
    padding: 4px;
  }

  .el-dialog__body {
    flex: 1;
    overflow: hidden;

    .el-form-item {
      margin-bottom: 15px;
    }

    .el-form-item__label {
      font-size: 14px;
      margin: 0 0 0 15px;
    }

    .el-input__wrapper {
      font-size: 13px;
      min-height: 32px !important;
    }

    .el-textarea__inner {
      font-size: 13px;
      min-height: 72px !important;
    }

    .el-table__header th,
    .el-table__body tr {
      font-size: 13px;
    }

    .el-table__body .el-table__row:hover {
      background-color: #fff !important;
    }
  }

  .el-dialog__footer {
    padding-top: 35px;

    .el-button {
      font-size: 14px;
      width: 78px;
      height: 34px;
    }

    .el-button--primary {
      margin-left: 15px;
    }
  }

  .el-dialog__title {
    font-size: 16px;
    font-weight: bold;
  }
}

::v-deep(div.el-tabs__header) div.el-tabs__item {
  border-right-color: var(--el-border-color);
  border-left-color: var(--el-border-color);
}
.common-icon {
  width: 1rem;
  height: 1rem;
}
</style>
