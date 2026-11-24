<script setup>
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import router from '@/router/index.js';
import { getMenuGroups, getGuid, getTagChildren } from '@/utils/commonUtils.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import {
  addScriptGroupServer,
  deleteScripteGroupServer,
  modifyScriptGroupServer,
  unlockScriptServer,
} from '@/api/allRequest/calculationAPI.js';
import { useScriptPlaceholderWS } from '@/composables/CalculateMng/useScriptPlaceholderWS';

import CustomLayoutContainer from '@/components/CustomLayout/CustomLayoutContainer.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import ScriptTools from '@/components/ScriptTools/ScriptTools.vue';
import ReleasePosition from '@/views/Main/CalculateView/CalculateDialogView/ReleasePosition.vue';

import ScriptsGlobalSearch from '@/views/Main/CalculateView/CalculateDialogView/ScriptsGlobalSearch.vue';

const { t } = useI18n();
const calculationMenuStore = useCalculationMenuStore();
const scriptEditorStore = useScriptEditorStore();
const { setLeftClickName } = scriptEditorStore;

const { getCalculateMenuList, setCurrentCalculateRow, resetCalculationMenu } = calculationMenuStore;
const { calculationMenuList, currentCalculateEngineer, currentCalculateRow } = storeToRefs(calculationMenuStore);

const selectNode = ref();
const cssVars = reactive({
  '--script-mini-height': '80px',
});

const globalSearchVisible = ref(false);

const globalScriptsGlobalSearch = ref(false);

// 是否可编辑
const isEditingStatus = ref(false);

// 启动脚本占位通知ws连接
const useScriptPlaceholderWSRef = useScriptPlaceholderWS();
// 释放脚本占位
watch(
  () => scriptEditorStore.scriptEditorList,
  async (newValue, oldValue) => {
    // 移除了脚本,需要释放占位
    if (oldValue.length > newValue.length) {
      const unlockScriptIds = oldValue
        .filter((row) => {
          return !newValue.some((item) => item.id === row.id);
        })
        .map((row) => row.id);

      await unlockScriptServer(unlockScriptIds);
    }
  },
  { deep: true },
);

const asideClass = computed(() => {
  let asides = 'calculate-main-layout-left layout-card';

  if (scriptEditorStore.isMinimized) {
    asides += ' minimized';
  }
  return asides;
});

cssVars['--script-mini-height'] = computed(() => {
  let scriptMiniHeight;
  if (scriptEditorStore.isMinimized && scriptEditorStore.editorVisible) {
    scriptMiniHeight = '128px';
  } else {
    scriptMiniHeight = '80px';
  }
  return scriptMiniHeight;
});

nextTick(async () => {
  await getCalculateMenuList();
});
const backProList = async () => {
  scriptEditorStore.resetScriptEditorList();
  // 关闭脚本占位通知ws连接
  useScriptPlaceholderWSRef.client.value.cleanupSocket();
  setTimeout(() => {
    resetCalculationMenu();
  }, 200);
  await router.push({ name: 'calculate' });
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
  setCurrentCalculateRow(row);
  const group = getMenuGroups(calculationMenuStore.calculationMenuList, row.id);
  setLeftClickName(group.join('/'));
  await router.push({ name: row.path });
};

const setBlackHandle = () => {
  if (selectNode.value) {
    getTagChildren(calculationMenuStore.calculationMenuList);
    selectNode.value = '';
  }
};
const treeMouseEnterHandle = (data) => {
  // root树不能删除/修改
  const parentIds = ['globalVars', 'periods', 'dataChanges', 'conditions', 'APIs', 'functions'];
  // 默认组不能新增/修改/删除
  const defaultIds = [
    'dataSource',
    'script',
    'system_scripts',
    'action_bar',
    'java_script',
    'npm_dependencies',
    'common_dependencies',
  ];
  if (parentIds.includes(data.id)) {
    data.addIcon = true;
    data.editIcon = false;
    data.deleteIcon = false;
    return;
  }
  if (defaultIds.includes(data.id)) {
    data.addIcon = false;
    data.editIcon = false;
    data.deleteIcon = false;
    return;
  }
  if (data.level >= 1) {
    data.addIcon = true;
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
  await useConfirm(t('sureForDeleteName', { name: row.name }), t('tip'));
  const errorCode = await deleteScripteGroupServer(row);
  if (errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getCalculateMenuList();
    // 子组删除成功后自动选择到父组
    if (row?.scriptType) {
      const parentRow = calculationMenuStore.calculationMenuList.find((item) => item.id === row?.scriptType);
      if (parentRow) {
        await menuClickHandle(parentRow);
      }
    }
  }
};
const editClickHandle = async (row) => {
  selectNode.value = row;
};
const handleCancelGlobalSearch = (val) => {
  globalScriptsGlobalSearch.value = val;
};

// 重命名保存
const saveEdit = async (row, inputType) => {
  selectNode.value = '';
  if (!row.name) {
    return false;
  }
  if (inputType === 'create') {
    const result = await addScriptGroupServer({
      ...row,
      parentId: String(row.parent.groupId),
      scriptType: row.parent.scriptType,
    });
    if (result === 0) {
      ElMessage.success(t('createSuccess'));
    }
  } else {
    const resut = await modifyScriptGroupServer({
      ...row,
      scriptType: row.scriptType,
    });
    if (resut === 0) {
      ElMessage.success(t('editSuccess'));
    }
  }
  await getCalculateMenuList();
};
</script>

<template>
  <CustomLayoutContainer
    :asideClass="asideClass"
    :defaultExpandAll="false"
    :is-editing-status="isEditingStatus"
    :left-menus="calculationMenuList"
    :nodeClickKey="currentCalculateRow?.id"
    :selectNode="selectNode"
    :style="cssVars"
    asideWidth="220px"
    content-card-class="calculate-content-card"
    content-class="calculate-center layout-card"
    mainContainClass=" main-content-notheader"
    nodeKey="id"
    customLayoutClass="calculate-content"
    treeClass="calculate-tree"
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
        <div class="df space-between w94">
          <div class="df w94 mb-8">
            <CustomIcon class="icon-engineer" name="calculationEngineer" />
            <div :title="currentCalculateEngineer.name" class="ellipsis text-engineer">
              {{ currentCalculateEngineer.name }}
            </div>
          </div>
          <el-tooltip :content="t('scriptsGlobalSearch')" :show-after="500" effect="light" placement="top">
            <el-icon class="df pointer search-icon">
              <IEpSearch @click="globalScriptsGlobalSearch = true" />
            </el-icon>
          </el-tooltip>
          <el-tooltip :content="t('releasePosition')" :show-after="500" effect="light" placement="top">
            <div class="df pointer">
              <CustomIcon class="common-icon" name="release" @click="globalSearchVisible = true" />
            </div>
          </el-tooltip>
        </div>
      </div>
    </template>
    <template #left-bottom>
      <ScriptTools v-if="scriptEditorStore.isMinimized && scriptEditorStore.editorVisible" />
    </template>
  </CustomLayoutContainer>

  <ScriptsGlobalSearch
    v-if="globalScriptsGlobalSearch"
    @update:dialogVisible="handleCancelGlobalSearch"
  ></ScriptsGlobalSearch>

  <ReleasePosition
    v-if="globalSearchVisible"
    v-model:dialog-visible="globalSearchVisible"
    @noticeRelease="(row) => useScriptPlaceholderWSRef.handleNoticeRelease(row, currentCalculateEngineer.name)"
  ></ReleasePosition>
</template>

<style lang="scss">
.calculate-content {
  height: calc(100vh - 100px);
  .calculate-tree {
    height: calc(100% - var(--script-mini-height));
    overflow: auto;
  }

  .calculate-tree {
    .ml-12 {
      margin-left: 8px;
    }
  }
  .client-icon {
    width: 32px;
    color: #0348dd;
  }
  .layout-card {
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
section.calculate-center {
  height: calc(100vh - 64px);
  background: transparent;
  box-shadow: none;

  .calculate-content-card {
    .main-content-notheader {
      padding: 0;
      height: 100%;
    }
  }
}

.calculate-main-layout-left {
  margin-right: 12px;
  background-color: var(--custom-ffffff-color);

  .el-tree {
    height: calc(100% - var(--script-mini-height));
    overflow-y: auto;
    overflow-x: hidden;
  }

  .el-sub-menu__title,
  .el-menu-item {
    height: calc(3vh); // 每个菜单项占屏幕高度的 3%
    line-height: calc(3vh); // 保证垂直居中
    min-height: 18px;
    max-height: 30px;
  }

  .el-menu {
    border: none;
  }

  .menu-label {
    margin-left: 5px;
    font-size: 14px;
    color: #434343;
    font-weight: 500;
  }

  .el-sub-menu__title:hover {
    background-color: #e1e8f0 !important; // 移入背景色
  }

  .el-sub-menu,
  .el-menu-item {
    font-size: 14px;
    color: #6f6f6f;
    // background-color: rgb(241, 244, 249);
  }

  .el-menu-item:hover {
    color: #000000 !important; // 移入文字颜色
    background-color: #f5f7fa !important; // 移入背景色
  }

  .el-menu-item.is-active {
    color: #000000 !important; // 选中文字颜色
    background-color: #e8ecf2 !important; // 选中背景色
  }

  .el-menu-layout {
    overflow: auto;
    height: calc(100% - 41px);
  }
}

.minimized {
  .el-menu-layout {
    height: calc(100% - 90px);
  }
}

.calculate-content-card {
  width: 100%;
  height: 100%;
}

.icon-engineer {
  margin-right: 4px;
  margin-left: 8px;
}

.minimized-float-btn {
  border-top: 1px solid;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.search-icon {
  margin-right: 8px;
}
.custom-title-notification .el-notification__title {
  color: #403f64;
  font-weight: normal;
  font-size: 12px;
}
.custom-title-notification .el-notification__icon {
  color: #368ceb;
}
.text-engineer {
  font-size: 16px;
  width: 125px;
}
</style>
