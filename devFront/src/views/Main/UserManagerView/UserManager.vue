<script setup>
import { useI18n } from 'vue-i18n';
import {
  createUserGroupServer,
  deleteUserGroupServer,
  editUserGroupServer,
  getGroupListServer,
} from '@/api/allRequest/userManagerApi.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { getTagChildren, getGuid } from '@/utils/commonUtils.js';
import CustomLayoutContainer from '@/components/CustomLayout/CustomLayoutContainer.vue';
import UserSafeSet from '@/views/Main/UserManagerView/UserSafeSetView/UserSafeSet.vue';
import UserList from '@/views/Main/UserManagerView/UserListView/UserList.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';

const { t } = useI18n();
const userStore = useLoginUserStore();

const userCom = shallowRef(UserList);
const userMenus = ref([
  {
    id: -1,
    groupId: -1,
    name: t('userSystem'),
    icon: 'userSystem',
    children: [],
  },
  {
    id: 'safeSetting',
    groupId: 'safeSetting',
    name: t('userSafeConfig'),
    icon: 'peopleSafe',
  },
]);
const selectNode = ref();
const selectGroup = ref({ ...userMenus.value[0] });

const cssVars = reactive({
  '--script-mini-height': '48px',
});

nextTick(async () => {
  if (userStore.userInfo.userType === '01') {
    userMenus.value = [userMenus.value[0]];
    return;
  }
  await getUserGroup();
});

const getUserGroup = async () => {
  const { data = {} } = await getGroupListServer();
  if (data.children) {
    userMenus.value[0].children = translateName(data.children);
  } else {
    userMenus.value[0].children = [];
  }
};

const nodeClickHandle = async (row) => {
  if (selectNode.value?.name === row.name) {
    return;
  }
  selectGroup.value = row;
  if (row.name === t('userSafeConfig')) {
    userCom.value = UserSafeSet;
  } else {
    userCom.value = UserList;
    setBlackHandle();
  }
};

const addClickHandle = async (row) => {
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

const setBlackHandle = () => {
  if (selectNode.value) {
    getTagChildren(userMenus.value[0].children, userMenus.value[0]);
    selectNode.value = '';
  }
};

const deleteClickHandle = async (row) => {
  await useConfirm(t('sureForDeleteUserGroup', { name: row.groupName }), t('tip'));
  if (row.users?.length > 0 || row.children?.length > 0) {
    ElMessage.warning(t('deleteUserGroupError'));
    return;
  }
  const { errorCode } = await deleteUserGroupServer({
    ...row,
  });

  if (errorCode === 0) {
    await getUserGroup();
    ElMessage.success(t('userGroupDeleteSuccess'));
  }
};
const editClickHandle = async (row) => {
  selectNode.value = row;
};
const saveEditHandle = async (row, inputType) => {
  selectNode.value = '';
  if (!row.name) {
    if (inputType != 'editor') {
      getTagChildren(userMenus.value[0].children, userMenus.value[0]);
    } else {
      ElMessage.error(t('groupNameNotNull'));
      row.name = row.groupName;
    }
    return row;
  }
  if (inputType === 'create') {
    const { errorCode } = await createUserGroupServer({
      groupName: row.name,
      description: '',
      parentGroupId: row.parent.id,
    });
    if (errorCode === 0) {
      ElMessage.success(t('userGroupCreateSuccess'));
    }
  } else {
    const { errorCode } = await editUserGroupServer({
      groupName: row.name,
      groupId: row.groupId,
    });
    if (errorCode === 0) {
      ElMessage.success(t('userGroupEditSuccess'));
    }
  }
  await getUserGroup();
};
const treeMouseEnterHandle = async (row) => {
  if (userStore.userInfo.userType === '01') {
    return;
  }
  const unmouseList = ['safeSetting'];
  if (unmouseList.includes(row.groupId)) {
    return;
  }
  if (row.id === -1) {
    row.addIcon = true;
    row.editIcon = false;
    row.deleteIcon = false;
    return;
  }
  row.addIcon = true;
  row.editIcon = true;
  row.deleteIcon = true;
};

function translateName(list) {
  for (const listElement of list) {
    listElement.name = listElement.groupName;
    listElement.id = listElement.groupId;
    listElement.icon = 'commonChildNode';
    if (listElement.children) {
      translateName(listElement.children);
    }
  }
  return list;
}
</script>

<template>
  <CustomLayoutContainer
    :left-menus="userMenus"
    :selectNode="selectNode"
    :style="cssVars"
    aside-class="layout-card p-8"
    asideWidth="220px"
    content-card-class="user-content-card"
    content-class="user-center layout-card"
    customLayoutClass="user-content"
    mainContainClass="user-content-main"
    node-key="groupId"
    treeClass="user-tree"
    svgClass="user-icon"
    :expand-on-click-node="false"
    @addClick="addClickHandle"
    @clickBlack="setBlackHandle"
    @deleteClick="deleteClickHandle"
    @editClick="editClickHandle"
    @menuClick="nodeClickHandle"
    @saveEdit="saveEditHandle"
    @treeMouseEnter="treeMouseEnterHandle"
  >
    <template #left>
      <div class="df user-title">
        <CustomIcon class="icon-usermodules" name="userManager" />
        <el-text class="text-usermodules"> {{ t('userManager') }} </el-text>
      </div>
    </template>
    <template #main-content>
      <component :is="userCom" :selectGroup="selectGroup" @deleteUser="getUserGroup" />
    </template>
  </CustomLayoutContainer>
</template>

<style lang="scss" scoped>
.user-title {
  background: #ffffff;
  padding: 12px 8px;
  font-size: 16px;
  font-weight: 500;
  color: var(--custom-1f2937-color);

  .icon-usermodules {
    width: 1.45em;
    height: 1.45em;
    margin-right: 7px;
  }
  .text-usermodules {
    font-size: 16px;
    width: 150px;
  }
}
</style>

<style lang="scss">
.user-content {
  height: calc(100vh - 102px);

  .user-icon {
    min-width: 1.2em;
    color: #0348dd;
  }
  .user-tree {
    height: calc(100% - var(--script-mini-height));
    overflow: auto;
  }
  .layout-card {
    border-radius: 16px;
    padding: 0;
  }
}

.user-content-card {
  width: 100%;
}
</style>
