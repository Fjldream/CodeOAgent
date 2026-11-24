<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useUserListStore } from '@/stores/userListStore.js';
import { useRolesStore } from '@/stores/rolesStore.js';
import {
  createUserServer,
  deleteUserServer,
  editUserServer,
  updateRolesServer,
  getUserInfoByIdServer,
  resetPasswordServer,
} from '@/api/allRequest/userManagerApi.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { isObjectString } from '@/utils/commonUtils.js';
import RoleAllocation from '@/views/Main/UserManagerView/UserManagerDialogView/RoleAllocation.vue';
import ChangePasswordDialog from '@/components/ChangePasswordDialog/ChangePasswordDialog.vue';
import AddEditorUser from '@/views/Main/UserManagerView/UserManagerDialogView/AddEditorUser.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const props = defineProps({
  selectGroup: Object,
});

const emit = defineEmits(['deleteUser']);

const userStore = useLoginUserStore();
const userListStore = useUserListStore();
const rolesStore = useRolesStore();

const { userInfo } = storeToRefs(userStore);
const { getUserList } = userListStore;
const { getRoleList } = rolesStore;
const tableClass = ref('');
const selectRows = ref([]);
const searchKeyword = ref('');
const title = ref(t('createUser'));
const dialogVisible = ref(false);
const addEditDialogVisible = ref(false);
const changePasswordDialogVisible = ref(false);
const userRow = ref({});
const dialogCom = shallowRef(AddEditorUser);
const tableColumns = computed(() => [
  {
    label: t('userName'),
    props: 'userName',
    minWidth: '12%',
  },
  {
    label: t('description'),
    props: 'description',
    minWidth: '16%',
  },
  {
    label: t('role'),
    props: 'roles',
    minWidth: '16%',
    formatter: (row) => {
      if (!row.roles) {
        return '';
      }
      const roleIds = JSON.parse(row.roles);
      const roleData = roleIds.map((item) => {
        const roles = rolesStore.roleList.find((data) => data.roleId === item);
        return roles?.roleName || '';
      });

      return roleData.join(',');
    },
  },

  {
    label: t('passwordEffectTime'),
    props: 'passwordValidTime',
    minWidth: '16%',
  },
  {
    label: t('userLoseEffectTime'),
    props: 'invalidDate',
    minWidth: '16%',
  },
  {
    label: t('createTime'),
    props: 'createdTime',
    minWidth: '20%',
  },
  {
    label: t('modifyTime'),
    props: 'lastEditTime',
    minWidth: '20%',
  },
]);

const tableData = computed(() => {
  if (!searchKeyword.value) {
    return userListStore.userList;
  }
  return userListStore.userList.filter((item) =>
    item.userName?.toLowerCase()?.includes(searchKeyword.value?.toLowerCase()),
  );
});

nextTick(async () => {
  if (userInfo.value.userType === '01') {
    return;
  }
  await getRoleList();
});

watchEffect(() => {
  const group = props.selectGroup;
  tableClass.value = group?.id === -1 ? '' : 'table-max-52';
  nextTick(async () => {
    await getTableData();
  });
});

const getTableData = async () => {
  const groupIds =
    props.selectGroup && props.selectGroup.groupId !== -1 ? [...getGroupIds([props.selectGroup])] : void 0;
  await getUserList({ groupIds });
};

const getGroupIds = (selectGroup = [], ids = []) => {
  for (const row of selectGroup) {
    ids.push(row.groupId);
    if (row.children) {
      return getGroupIds(row.children, ids);
    }
  }
  return ids;
};
const createUser = () => {
  title.value = t('createUser');
  userRow.value = {
    userTypeStr: getUserType(userInfo.value.userType),
  };
  addEditDialogVisible.value = true;
};

const editUser = async () => {
  title.value = t('editUser');

  const editorUser = await getUserInfoByIdServer({ userId: userRow.value.userId });
  userRow.value = {
    ...selectRows.value[0],
    userTypeStr: editorUser.data.userType === '02' ? t('managerUser') : t('ordinaryUser'),
    ...editorUser.data,
  };
  addEditDialogVisible.value = true;
};

const getUserType = (userType) => {
  switch (userType) {
    case '01':
      return t('userManager');
    case '02':
      return t('ordinaryUser');

    default:
      return t('illegalUser');
  }
};

const deleteUser = async () => {
  const isConfirm = await useConfirm(t('sureForDeleteSelectUser'), t('tip'), 'warning');
  if (isConfirm === 'confirm') {
    const { errorCode, noDelete } = await deleteUserServer({ userId: selectRows.value[0].userId });
    if (noDelete) {
      ElMessage.warning(t('userDeleteTips'));
      return;
    }
    if (errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
    await getTableData();

    emit('deleteUser');
  }
};

const allocateRoleHandle = () => {
  dialogCom.value = RoleAllocation;
  dialogVisible.value = true;
};

const selectHandle = (row) => {
  selectRows.value = row;
  userRow.value = selectRows.value[0];
};

const userConfirmHandle = async (form) => {
  if (!form) {
    return;
  }
  if (!userRow.value.userId) {
    const { errorCode } = await createUserServer({ ...form, groupId: props.selectGroup.id });
    if (errorCode === 0) {
      ElMessage({
        type: 'success',
        message: t('createSuccess'),
      });
    }
  } else {
    const { errorCode } = await editUserServer({ ...form });
    if (errorCode === 0) {
      ElMessage({
        type: 'success',
        message: t('editSuccess'),
      });
    }
  }
  await getTableData();

  addEditDialogVisible.value = false;
};

const roleConfirmHandle = async (form) => {
  const roleIds = form.map((item) => item.roleId);
  const userInfos = selectRows.value.map((item) => {
    return {
      userId: item.userId,
      userName: item.userName,
    };
  });
  const { errorCode } = await updateRolesServer({ roleIds, userInfos });
  if (errorCode === 0) {
    ElMessage({
      type: 'success',
      message: t('roleConfigSucess'),
    });
  }

  await getTableData();

  dialogVisible.value = false;
};

const resetPassword = async (row) => {
  await useConfirm(t(`userConfirmTips`, { userName: row.userName }), t('tip'), 'warning');

  const { errorCode, data } = await resetPasswordServer(row);

  if (errorCode === 0) {
    await ElMessageBox.alert(t(`passwordTips`, { password: data.password }), t('tip'));

    ElMessage({
      type: 'success',
      message: t(`resetPasswordSuccess`, { userName: row.userName }),
    });
  }
};

const userBanChangeHandle = async (row) => {
  if (row.userName.includes('admin')) {
    return false;
  }
  const isUserBan = row.userBan === 0;
  const titles = isUserBan ? t('enable') : t('disable');
  const result = await useConfirm(
    t('ConfirmTips', {
      titles,
      userName: row.userName,
    }),
    t('tip'),
    'warning',
  ).catch(async (e) => {
    await getTableData();
  });

  if (!result) {
    return;
  }
  row.extendField = JSON.parse(row.extendField);
  await editUserServer({
    ...row,
    userBan: !isUserBan,
    isMultiLogin: row.isMultiLogin === 1,
    isSSO: row.isSSO === 1,
  });
  ElMessage.success(t('successTips', { titles, userName: row.userName }));
  await getTableData();
};

const changePassword = async (row) => {
  userRow.value = row;
  changePasswordDialogVisible.value = true;
  title.value = t('changPassword');
};
</script>

<template>
  <header class="header-inline">
    <div>
      <span class="text-current">{{ t('userSystem') }}</span>
    </div>
  </header>
  <div class="operate-list mb-20">
    <div class="button">
      <el-button v-if="selectGroup.id !== -1 || userInfo.userType === '01'" type="primary" @click="createUser">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createUser') }}
      </el-button>
      <el-button
        v-if="selectRows[0]?.userType !== '01' && selectRows[0]?.userType !== '02'"
        :disabled="selectRows.length !== 1"
        type="primary"
        @click="editUser"
      >
        <el-icon class="mr-5">
          <IEpEdit />
        </el-icon>
        {{ t('editUser') }}
      </el-button>
      <el-button
        v-if="selectRows[0]?.userType !== '01' && selectRows[0]?.userType !== '02'"
        :disabled="selectRows.length !== 1"
        type="danger"
        @click="deleteUser"
      >
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-button
        v-if="selectRows[0]?.userType !== '01' && selectRows[0]?.userType !== '02'"
        @click="allocateRoleHandle"
      >
        <el-icon class="mr-5">
          <IEpUser />
        </el-icon>
        {{ t('roleAllocate') }}
      </el-button>
    </div>
    <div class="search-box">
      <el-input
        v-model="searchKeyword"
        :placeholder="t('plsInputKeywordSearch')"
        :prefix-icon="Search"
        class="search-input"
        clearable
        size="default"
      />
    </div>
  </div>
  <CustomStyleTable
    :tableData="tableData"
    class="table-custom"
    max-height="calc(100vh - 220px)"
    row-key="userId"
    @selectionChange="selectHandle"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column
      v-for="row of tableColumns"
      :key="row.label"
      :formatter="row.formatter"
      :label="row.label"
      :min-width="row.minWidth"
      :prop="row.props"
      align="center"
      show-overflow-tooltip
    />
    <el-table-column :label="t('operate')" align="center" width="220">
      <template #default="{ row }">
        <div v-if="row.userType !== '02'" class="df justify-every">
          <el-tooltip :content="t('resetPassword')" :show-after="500">
            <el-link
              v-if="userInfo.userType === '02' || userInfo.userType === '01'"
              class="ellipsis"
              type="primary"
              @click="resetPassword(row)"
            >
              {{ t('resetPassword') }}
            </el-link>
          </el-tooltip>
          <el-tooltip :content="t('changePassword')" :show-after="500">
            <el-link v-if="userInfo.userId !== row.userId" class="ellipsis" type="primary" @click="changePassword(row)">
              {{ t('changePassword') }}
            </el-link>
          </el-tooltip>
        </div>
      </template>
    </el-table-column>
    <el-table-column
      v-if="userInfo.userType === '02'"
      :label="t('enable')"
      align="center"
      min-width="12%"
      show-overflow-tooltip
    >
      <template #default="{ row, column }">
        <el-switch
          v-if="row.userType !== '02'"
          v-model="row.userBan"
          :active-value="0"
          :inactive-value="1"
          @change="userBanChangeHandle(row)"
        ></el-switch>
      </template>
    </el-table-column>
  </CustomStyleTable>

  <AddEditorUser
    v-if="addEditDialogVisible"
    v-model:dialogVisible="addEditDialogVisible"
    :editForm="{ ...userRow }"
    :title="title"
    @confirm="userConfirmHandle"
  />
  <RoleAllocation
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :editForm="{ ...userRow }"
    :title="title"
    :user-id="userRow?.userId"
    @confirm="userConfirmHandle"
    @roleConfirm="roleConfirmHandle"
  />

  <ChangePasswordDialog
    v-model:dialogVisible="changePasswordDialogVisible"
    :is-first-login="false"
    :title="title"
    :userId="userRow?.userId"
  />
</template>

<style lang="scss" scoped>
.header-inline {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  .diagonal-divider {
    background-color: #9ca3af;
    transform: rotate(35deg);
    margin: 0 8px;
    display: inline-block;
    width: 1px;
    height: 0.9em;
  }

  .text-current {
    font-size: 16px;
    color: #1f2937;
    white-space: nowrap;
  }
}
.operate-list {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
</style>
