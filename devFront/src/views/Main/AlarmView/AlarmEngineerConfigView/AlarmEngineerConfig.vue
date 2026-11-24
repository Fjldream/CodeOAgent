<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import router from '@/router/index.js';
import { getTagChildren, getGuid } from '@/utils/commonUtils.js';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';
import {
  createDataDirectoryGroupServer,
  deleteDataDirectoryGroupServer,
  editDataDirectoryGroupServer,
  createCustomGroupServer,
  editCustomGroupServer,
  deleteCustomGroupServer,
} from '@/api/allRequest/alarmAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';

import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import CustomLayoutContainer from '@/components/CustomLayout/CustomLayoutContainer.vue';

const { t } = useI18n();
const alarmMenuStore = useAlarmMenuStore();
const { setCurrentAlarmRow, getAlarmMenuList, resetAlarmMenu } = alarmMenuStore;
const selectNode = ref({});
const cssVars = reactive({
  '--script-mini-height': '80px',
});

nextTick(() => {
  getAlarmMenuList();
});

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
  if (row?.path === 'alarm-data-dictionary' || row?.parent?.path === 'alarm-data-dictionary') {
    const { errorCode } = await deleteDataDirectoryGroupServer({
      groupIds: [row.id],
    });
    if (errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
  } else {
    const { errorCode } = await deleteCustomGroupServer({
      groupIds: [row.id],
    });
    if (errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
  }

  await getAlarmMenuList();
};
const editClickHandle = (row) => {
  selectNode.value = row;
};
const menuClickHandle = async (row) => {
  if (selectNode.value.name === row.name) {
    return;
  }
  setBlackHandle();
  setCurrentAlarmRow(row);
  await router.push({ name: row.path });
};

const saveEdit = async (row, inputType) => {
  selectNode.value = '';
  if (!row.name) {
    return false;
  }
  if (inputType === 'create') {
    if (row.parent.path === 'alarm-data-dictionary') {
      const { errorCode } = await createDataDirectoryGroupServer({
        ...row,
        parentGroupId: row.parent.id,
      });
      if (errorCode === 0) {
        ElMessage.success(t('createSuccess'));
      }
    } else if (row.parent.path === 'alarm-custom') {
      const { errorCode } = await createCustomGroupServer({
        ...row,
        parentGroupId: row.parent.id,
      });
      if (errorCode === 0) {
        ElMessage.success(t('createSuccess'));
      }
    }
  } else {
    if (row?.path === 'alarm-data-dictionary' || row?.parent?.path === 'alarm-data-dictionary') {
      const { errorCode } = await editDataDirectoryGroupServer({
        ...row,
        parentGroupId: row.parentGroupId,
      });
      if (errorCode === 0) {
        ElMessage.success(t('editSuccess'));
      }
    } else {
      const { errorCode } = await editCustomGroupServer({
        ...row,
        parentGroupId: row?.parent?.id || row?.parent,
      });
      if (errorCode === 0) {
        ElMessage.success(t('editSuccess'));
      }
    }
  }
  await getAlarmMenuList();
};
const treeMouseEnterHandle = (row) => {
  // root树不能删除/修改
  const parentIds = ['root', 'alarmRoot'];
  if (parentIds.includes(row.id)) {
    row.addIcon = true;
    row.editIcon = false;
    row.deleteIcon = false;
    return;
  }
  if (row.level === 1) {
    row.addIcon = true;
    row.editIcon = true;
    row.deleteIcon = true;
    return;
  }
  if (row.level === 2) {
    row.addIcon = false;
    row.editIcon = true;
    row.deleteIcon = true;
  }
};
const backProList = () => {
  setTimeout(() => {
    resetAlarmMenu();
  }, 200);
  router.push({ name: 'alarm' });
};

const setBlackHandle = () => {
  if (selectNode.value) {
    getTagChildren(alarmMenuStore.alarmMenuList, alarmMenuStore.alarmMenuList[0]);
    selectNode.value = '';
  }
};
</script>

<template>
  <CustomLayoutContainer
    :defaultExpandAll="false"
    :left-menus="alarmMenuStore.alarmMenuList"
    :nodeClickKey="alarmMenuStore.currentAlarmRow?.id"
    :selectNode="selectNode"
    :style="cssVars"
    asideClass="alarm-main-layout-left layout-card"
    asideWidth="220px"
    content-card-class="alarm-content-card"
    content-class="alarm-center layout-card"
    mainContainClass=" main-content-notheader"
    nodeKey="id"
    customLayoutClass="alarm-content"
    treeClass="alarm-tree"
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
          <div class="df mb-8">
            <CustomIcon class="icon-engineer" name="alarmEngineer" />
            <div>{{ alarmMenuStore.currentAlarmEngineer.name }}</div>
          </div>
        </div>
      </div>
    </template>
  </CustomLayoutContainer>
</template>

<style lang="scss">
.alarm-content {
  height: calc(100vh - 100px);
  .alarm-tree {
    height: calc(100% - var(--script-mini-height));
    overflow: auto;
  }

  .alarm-tree {
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
section.alarm-center {
  height: calc(100vh - 64px);
  background: transparent;
  box-shadow: none;

  .alarm-content-card {
    .main-content-notheader {
      padding: 0;
      height: 100%;
    }
  }
}

.alarm-main-layout-left {
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

.alarm-content-card {
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
</style>
