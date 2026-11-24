<script setup>
import { useI18n } from 'vue-i18n';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import router from '@/router/index.js';
import { getMenuGroups, getGuid, getTagChildren } from '@/utils/commonUtils.js';
import { useConfirm } from '@/composables/useConfirm.js';
import {
  createDeviceGroupServer,
  createVarGroupServer,
  deleteDeviceGroupServer,
  delVarGroupServer,
  editDeviceGroupServer,
  editVarGroupServer,
} from '@/api/allRequest/collectionAPI.js';

import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import CustomLayoutContainer from '@/components/CustomLayout/CustomLayoutContainer.vue';

const { t } = useI18n();
const collectionMenuStore = useCollectionMenuStore();
const releaseVisible = ref(false);
const { collectionMenuList, currentCollectionEngineer, currentCollectionRow } = storeToRefs(collectionMenuStore);

const { getCollectionMenuList, setCurrentCollectionRow, resetCollectionMenu, setCurrentCollectionTitle } =
  collectionMenuStore;

const selectNode = ref();
const cssVars = reactive({
  '--script-mini-height': '80px',
});
// 是否可编辑
const isEditingStatus = ref(false);

nextTick(async () => {
  await getCollectionMenuList();
});

const asideClass = computed(() => {
  return 'collection-main-layout-left mr-6 layout-card ';
});

cssVars['--script-mini-height'] = computed(() => {
  return '80px';
});

const backProList = async () => {
  resetCollectionMenu();
  await router.push({ name: 'collection' });
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
  setCurrentCollectionRow(row);
  const group = getMenuGroups(collectionMenuStore.collectionMenuList, row.id);
  setCurrentCollectionTitle(group);
  await router.push({ name: row.path });
};

const setBlackHandle = () => {
  if (selectNode.value) {
    getTagChildren(collectionMenuStore.collectionMenuList, collectionMenuStore.collectionMenuList[0]);
    selectNode.value = '';
  }
};
const treeMouseEnterHandle = (data) => {
  // root树不能删除/修改
  const parentIds = ['collection-daq-equipment', 'collection-daq-variables'];
  if (parentIds.includes(data.path)) {
    data.addIcon = true;
    data.editIcon = false;
    data.deleteIcon = false;
  }
  if (data.level > 0 && data.level < 8) {
    data.addIcon = true;
    data.editIcon = true;
    data.deleteIcon = true;
  }
  if (data.level > 7) {
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
  selectNode.value = '';
  await useConfirm(t('sureForDeleteCollectionName', { name: row.name }), t('tip'));
  if (row.parent.path === 'collection-daq-equipment') {
    const { errorCode } = await deleteDeviceGroupServer({
      groupId: row.actualId,
    });
    if (errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
  } else {
    const { errorCode } = await delVarGroupServer({
      groupId: row.actualId,
    });
    if (errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
  }
  await getCollectionMenuList();
};

const editClickHandle = async (row) => {
  selectNode.value = row;
};

// 重命名保存
const saveEdit = async (row, inputType) => {
  selectNode.value = '';
  if (!row.name) {
    return false;
  }
  if (inputType === 'create') {
    if (row.parent.path === 'collection-daq-equipment') {
      const groupId = row.parent.id === 'deviceRoot' ? '-1' : row.parent.actualId;
      const { errorCode } = await createDeviceGroupServer({
        groupName: row.name,
        groupId: groupId,
      });
      if (errorCode === 0) {
        ElMessage.success(t('createSuccess'));
      }
    } else {
      const groupId = row.parent.id === 'variablesRoot' ? '-1' : row.parent.actualId;
      const { errorCode } = await createVarGroupServer({
        groupName: row.name,
        groupId: groupId,
      });
      if (errorCode === 0) {
        ElMessage.success(t('createSuccess'));
      }
    }
  } else {
    if (row.parent.path === 'collection-daq-equipment') {
      const { errorCode } = await editDeviceGroupServer({
        groupName: row.name,
        groupId: row.actualId,
      });
      if (errorCode === 0) {
        ElMessage.success(t('editSuccess'));
      }
    } else {
      const { errorCode } = await editVarGroupServer({
        groupName: row.name,
        groupId: row.actualId,
      });
      if (errorCode === 0) {
        ElMessage.success(t('editSuccess'));
      }
    }
  }
  await getCollectionMenuList();
};
</script>

<template>
  <CustomLayoutContainer
    :asideClass="asideClass"
    :defaultExpandAll="false"
    :is-editing-status="isEditingStatus"
    :left-menus="collectionMenuList"
    :nodeClickKey="currentCollectionRow?.id"
    :selectNode="selectNode"
    :style="cssVars"
    asideWidth="220px"
    content-card-class="collection-content-card"
    content-class="collection-center"
    customLayoutClass="collection-content"
    node-key="id"
    treeClass="collection-tree"
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
        <div class="df mb-8">
          <CustomIcon class="icon-engineer" name="collectionEngineerInner" />
          <el-text class="text-engineer" truncated>
            {{ currentCollectionEngineer.name }}
          </el-text>
          <CustomIcon class="common-icon pointer" name="release" @click="releaseVisible = true" />
        </div>
      </div>
    </template>
  </CustomLayoutContainer>
</template>

<style lang="scss" scoped>
.collection-content {
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

  .collection-center {
    width: 100%;

    .collection-content-card {
      width: 100%;

      .main-content-notheader {
        padding: 20px 12px;
        height: 100%;
      }
    }
  }
}

.collection-main-layout-left {
  margin-right: 6px;
}
</style>

<style lang="scss">
.collection-content {
  .collection-tree {
    height: calc(100% - var(--script-mini-height));
    overflow: auto;
  }

  .collection-tree {
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

.collection-content-card {
  width: 100%;

  .main-center {
    padding: 0 0 0 16px;
  }
}

.collection-main-layout-left {
  .tree-icon {
    width: 2em;
    height: 2em;
  }
}
</style>
