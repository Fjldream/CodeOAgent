<script setup>
import { getCurrentInstance } from 'vue';
import { useI18n } from 'vue-i18n';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import router from '@/router/index.js';
import { getGuid, getMenuGroups, getTagChildren } from '@/utils/commonUtils.js';
import { useConfirm } from '@/composables/useConfirm.js';
import {
  addVariableGroupServer,
  createGroupServer,
  deleteVariableGroup,
  delGroupByIdServer,
  saveProjectDataServer,
  setVariableFileServer,
  updateGroupServer,
  createReportGroupServer,
  updateReportGroupServer,
  deleteReportGroupServer,
  createScriptGroupServer,
  updateScriptGroupServer,
  deleteScriptGroupServer,
} from '@/api/allRequest/clientAPI.js';

import ScriptTools from '@/components/ScriptTools/ScriptTools.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import CustomLayoutContainer from '@/components/CustomLayout/CustomLayoutContainer.vue';
import ClientReleaseDialog from '@/views/Main/ClientView/ClientDialogView/ClientReleaseDialog.vue';

const { t } = useI18n();
const { proxy } = getCurrentInstance();
const clientMenuStore = useClientMenuStore();
const scriptEditoringStore = useScriptEditorStore();

const releaseVisible = ref(false);
const { setLeftClickName } = scriptEditoringStore;

const { getClientMenuList, setCurrentClientRow, resetClientMenu, setCurrentClientTitle, getGraphicModeFile } =
  clientMenuStore;

const selectNode = ref();
const cssVars = reactive({
  '--script-mini-height': '100px',
});
const releaseData = ref([]);
// 是否可编辑
const isEditingStatus = ref(false);

nextTick(async () => {
  await getClientMenuList();
  proxy.$crossTab.onMessage(handleMessage);
});

const asideClass = computed(() => {
  let asides = 'client-main-layout-left mr-6 layout-card';

  if (scriptEditoringStore.isMinimized) {
    asides += ' minimized';
  }
  return asides;
});

cssVars['--script-mini-height'] = computed(() => {
  let scriptMiniHeight;
  if (scriptEditoringStore.isMinimized && scriptEditoringStore.editorVisible) {
    scriptMiniHeight = '120px';
  } else {
    scriptMiniHeight = '100px';
  }
  return scriptMiniHeight;
});

const backProList = async () => {
  scriptEditoringStore.resetScriptEditorList();
  resetClientMenu();
  await router.push({ name: 'client' });
};

/**
 * 处理菜单点击事件
 *
 * @param {object} row - 被点击的行数据
 */
const menuClickHandle = async (row) => {
  if (selectNode.value?.name === row.name) {
    return;
  }
  setBlackHandle();
  setCurrentClientRow(row);
  const group = getMenuGroups(clientMenuStore.clientMenuList, row.id);
  setLeftClickName(group.join('/'));
  if (!(row.name === t('commandLanguage') || row.name === t('internationlTranslation'))) {
    setCurrentClientTitle(group);
  }
  await router.push({ name: row.path });
};

const setBlackHandle = () => {
  if (selectNode.value) {
    getTagChildren(clientMenuStore.clientMenuList, clientMenuStore.clientMenuList[0]);
    selectNode.value = '';
  }
};
const treeMouseEnterHandle = (data) => {
  // root树不能删除/修改
  const parentIds = [
    'client-page-management',
    'client-variables-engineer',
    'client-graphic-model-library',
    'client-report-library',
  ];
  const scriptEnum = [
    'client-timer-script',
    'client-data-change-script',
    'client-custom-script',
    'client-hotkey-script',
  ];
  if ((parentIds.includes(data.path) && data.level === 1) || scriptEnum.includes(data.id)) {
    data.addIcon = true;
    data.editIcon = false;
    data.deleteIcon = false;
    return;
  }

  if (
    data.path === 'client-page-management' ||
    (data.level > 1 && data.level < 4 && data.path !== 'client-report-library')
  ) {
    data.addIcon = true;
    data.editIcon = true;
    data.deleteIcon = true;
    return;
  }
  if (data.id === 'default_reportGroup') {
    data.addIcon = false;
    data.editIcon = false;
    data.deleteIcon = false;
    return;
  }
  if (
    data.level > 3 ||
    (data.path === 'client-graphic-model-library' && data.level > 1) ||
    (data.path === 'client-report-library' && data.level > 1)
  ) {
    data.addIcon = false;
    data.editIcon = true;
    data.deleteIcon = true;
  }
};

const addClickHandle = (row) => {
  selectNode.value = {
    id: getGuid(),
    name: '',
    parent: { ...row },
  };
  if (!row.children || !Array.isArray(row.children)) {
    row.children = [];
  }
  row.children.push(selectNode);
};

const deleteClickHandle = async (row) => {
  await menuClickHandle(row);
  selectNode.value = '';
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  await useConfirm(t('sureForDeleteName', { name: row.name }), t('tip'));
  let restful;
  switch (row.parent.path) {
    case 'client-page-management':
      restful = await delGroupByIdServer({
        ...row,
        projectId,
      });
      break;
    case 'client-variables-engineer':
      restful = await setVariableFileServer({ ...row, projectId }, 'delete');
      if (restful?.errorCode === 0) {
        const handleDeleteGroups = getAllChildGroup(row);
        await deleteVariableGroup([restful.data.data.id, ...handleDeleteGroups], projectId);
      }
      break;
    case 'client-report-library':
      restful = await deleteReportGroupServer({ ...row, projectId });
      break;
    case 'client-graphic-model-library':
      const paramData = await getGraphicModeFile();
      if (!paramData) {
        ElMessage.error(t('deleteError'));
        return;
      }
      if (!paramData['图形模型库'].hasOwnProperty(row.id)) {
        ElMessage.error(t('deleteError'));
        return;
      }
      if (paramData['图形模型库'][row.id].mode.length) {
        ElMessage.error(t('deleteGraphicModelGroup'));
        return;
      }
      delete paramData['图形模型库'][row.id];
      const type = 7;
      const name = 'GraphicModelManager';
      await saveProjectDataServer({ name, paramData, projectId, type });
      break;
    case 'client-timer-script':
    case 'client-data-change-script':
    case 'client-custom-script':
    case 'client-hotkey-script':
      restful = await deleteScriptGroupServer(row);
      break;
    default:
  }
  if (restful?.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
  }
  await getClientMenuList();
  setCurrentClientRow(clientMenuStore.currentClientRow.parent);
};

const editClickHandle = async (row) => {
  selectNode.value = row;
};

// 重命名保存
const saveEdit = async (row, inputType) => {
  if (!row.name) {
    row.name = row.groupName;
    return row;
  }
  selectNode.value = '';
  const { guid: projectId } = clientMenuStore.currentClientEngineer;

  let restful;
  const data = { ...row, parentId: String(row.parent.id), projectId };
  if (inputType === 'create') {
    switch (row.parent.path) {
      case 'client-page-management':
        restful = await createGroupServer(data);
        break;
      case 'client-variables-engineer':
        restful = await setVariableFileServer(data, 'add');
        if (restful && restful.errorCode === 0) {
          restful = await addVariableGroupServer(restful.data.data.id, data);
        }
        break;
      case 'client-report-library':
        restful = await createReportGroupServer(data);
        break;
      case 'client-graphic-model-library':
        const paramData = await getGraphicModeFile();
        if (!paramData) {
          ElMessage.error(t('createError'));
          await getClientMenuList();
          return;
        }
        if (Object.hasOwn(paramData['图形模型库'], row.name)) {
          ElMessage.error(t('checkReplace'));
          await getClientMenuList();
          return;
        }
        paramData['图形模型库'][row.name] = {
          flag: true,
          mode: [],
        };
        restful = await saveProjectDataServer({ name: 'GraphicModelManager', paramData, projectId, type: 7 });
        break;
      case 'client-timer-script':
      case 'client-data-change-script':
      case 'client-custom-script':
      case 'client-hotkey-script':
        restful = await createScriptGroupServer(data);
        break;
      default:
    }
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
    }
  } else {
    switch (row.parent.path) {
      case 'client-page-management':
        restful = await updateGroupServer(data);
        break;
      case 'client-variables-engineer':
        restful = await setVariableFileServer(data, 'edit');
        break;
      case 'client-report-library':
        restful = await updateReportGroupServer(data);
        break;
      case 'client-graphic-model-library':
        const paramData = await getGraphicModeFile();
        if (!paramData) {
          ElMessage.error(t('editError'));
          return;
        }
        if (Object.hasOwn(paramData['图形模型库'], row.name)) {
          ElMessage.error(t('varNameRuleTip6'));
        } else {
          if (row.id !== row.name && paramData['图形模型库'].hasOwnProperty(row.id)) {
            paramData['图形模型库'][row.name] = paramData['图形模型库'][row.id];
            delete paramData['图形模型库'][row.id];
          } else {
            ElMessage.error(t('editError'));
            return;
          }
          restful = await saveProjectDataServer({ name: 'GraphicModelManager', paramData, projectId, type: 7 });
        }
        break;
      case 'client-timer-script':
      case 'client-data-change-script':
      case 'client-custom-script':
      case 'client-hotkey-script':
        restful = await updateScriptGroupServer(data);
        break;
      default:
    }
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
    }
  }
  await getClientMenuList();
};

const handleMessage = (event) => {
  switch (event?.key) {
    case 'client-graphic-mode':
      clientMenuStore.currentClientRow.updateGraphic = !clientMenuStore.currentClientRow.updateGraphic;
      break;
    case 'client-get3d-Resource':
      clientMenuStore.currentClientRow.update3dResource = !clientMenuStore.currentClientRow.update3dResource;
      break;
    default:
  }
};

const getAllChildGroup = (row) => {
  let groupIds = [];
  if (Array.isArray(row?.children) && row?.children?.length > 0) {
    const childGroup = row.children;
    for (const item of childGroup) {
      groupIds.push(item.id);
      groupIds = groupIds.concat(getAllChildGroup(item));
    }
  }
  return groupIds;
};
</script>

<template>
  <CustomLayoutContainer
    :asideClass="asideClass"
    :defaultExpandAll="false"
    :is-editing-status="isEditingStatus"
    :left-menus="clientMenuStore.clientMenuList"
    :nodeClickKey="clientMenuStore.currentClientRow?.id"
    :selectNode="selectNode"
    :style="cssVars"
    asideWidth="220px"
    content-card-class="client-content-card"
    content-class="client-center"
    customLayoutClass="client-content"
    node-key="id"
    treeClass="client-tree"
    svgClass="client-icon"
    :expand-on-click-node="false"
    @addClick="addClickHandle"
    @clickBlack="setBlackHandle"
    @deleteClick="deleteClickHandle"
    @editClick="editClickHandle"
    @menuClick="menuClickHandle"
    @saveEdit="saveEdit"
    @treeMouseEnter="treeMouseEnterHandle"
  >
    <template #left>
      <div>
        <div class="header-back" @click="backProList">
          <CustomIcon class="icon" name="back" />
          <el-link type="primary">{{ t('backProjectList') }}</el-link>
        </div>
        <div class="df mb-8 space-between">
          <CustomIcon class="icon-engineer flex-1" name="clientEngineer" />
          <el-text class="text-engineer flex-10" truncated>
            {{ clientMenuStore.currentClientEngineer.name }}
          </el-text>
          <CustomIcon class="common-icon pointer flex-1" name="release" @click="releaseVisible = true" />
        </div>
      </div>
    </template>
    <template #left-bottom>
      <ScriptTools v-if="scriptEditoringStore.isMinimized && scriptEditoringStore.editorVisible" />
    </template>
  </CustomLayoutContainer>
  <ClientReleaseDialog
    v-if="releaseVisible"
    v-model:dialogVisible="releaseVisible"
    :releaseData="releaseData"
  ></ClientReleaseDialog>
</template>

<style lang="scss" scoped>
.client-content {
  height: calc(100vh - 100px);
  overflow: hidden;

  .icon-engineer {
    width: 1.45em;
    height: 1.45em;
    margin-right: 7px;
  }

  .common-icon {
    width: 1em;
    height: 1em;
  }

  .text-engineer {
    font-size: 16px;
    width: 150px;
  }

  .client-center {
    width: 100%;

    .client-content-card {
      width: 100%;

      .main-content-notheader {
        padding: 20px 12px;
        height: 100%;
      }
    }
  }
}

.client-main-layout-left {
  margin-right: 6px;
}

.flex-1 {
  flex: 1;
}

.flex-10 {
  flex: 10;
}
</style>

<style lang="scss">
.client-content {
  .client-tree {
    height: calc(100% - var(--script-mini-height));
    overflow: auto;
  }

  .client-tree {
    .ml-12 {
      margin-left: 8px;
    }
  }

  .client-icon {
    width: 32px;
    color: #0348dd;
  }

  .layout-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 0 10px;
    overflow: hidden;

    .header-back {
      padding: 6px 10px;
      justify-content: center;
      align-items: center;
      align-self: stretch;
      margin: 20px 0 12px 0;
      border: 1px dashed #0348dd;
      border-radius: 4px;
      background: #f8fafc;
    }
  }
}

.client-content-card {
  width: 100%;

  .main-center {
    padding: 0 0 0 16px;
  }
}

.client-main-layout-left {
  .tree-icon {
    width: 2em;
    height: 2em;
  }
}
</style>
