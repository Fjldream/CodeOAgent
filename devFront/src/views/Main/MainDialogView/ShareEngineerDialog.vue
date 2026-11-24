<script setup>
import { useI18n } from 'vue-i18n';
import { useRolesStore } from '@/stores/rolesStore.js';
import { getRoleUserListServer, getUserListServer } from '@/api/allRequest/userManagerApi.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useUserListStore } from '@/stores/userListStore.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

import { Search } from '@element-plus/icons-vue';
import { debounce } from '@/utils/commonUtils.js';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  title: String,
  projectInfo: Object,
});

const rolesStore = useRolesStore();
const mainLeftMenusStore = useMainLeftMenusStore();
const userStore = useLoginUserStore();
const userListStore = useUserListStore();
const { getRoleList } = rolesStore;
const emit = defineEmits(['update:dialogVisible', 'shareConfirm', 'confirm']);

const tableData = ref([]);
const filterTableData = ref([]);
const selectRow = ref([]);
const defaultSelect = ref([]);
const searchKeyword = ref('');

const tableColumns = computed(() => {
  return [
    {
      label: t('userName'),
      props: 'userName',
    },
    {
      label: t('role'),
      props: 'roles',
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
      label: t('description'),
      props: 'description',
    },
  ];
});

watch(
  searchKeyword,
  debounce((newKey) => {
    filterTableData.value = newKey
      ? tableData.value.filter((item) => item.userName.indexOf(newKey) !== -1)
      : tableData.value;
  }, 300),
);

nextTick(async () => {
  await getRoleList();
  if (mainLeftMenusStore.defaultIds.includes(mainLeftMenusStore.leftRowSelect.id)) {
    const { data } = await getUserListServer();
    tableData.value = data.filter((value) => {
      return value.userId !== userStore.loginInfo.userId;
    });
  } else {
    const { data } = await getRoleUserListServer({ roleIds: mainLeftMenusStore.leftRowSelect.roleIds });
    const isAdminUsers = userListStore.userList.filter((item) => item.userType === '02');
    data.unshift(...isAdminUsers);
    tableData.value = data.filter((value) => {
      return value.userId !== userStore.loginInfo.userId;
    });
  }
  filterTableData.value = tableData.value;
  defaultSelect.value = props.projectInfo.shareUserIds;
});

const selectHandle = (row) => {
  selectRow.value = row;
};

const confirmHandle = async () => {
  if (selectRow.value.length === 0) {
    return emit('shareConfirm', { operate: 'deleteShareAllUser', data: { guid: props.projectInfo.guid } });
  }
  const selectRowIds = selectRow.value.map((row) => row.userId);
  const { shareUserIds } = props.projectInfo;
  const addUsersIds = selectRowIds.filter((item) => !shareUserIds.includes(item));
  if (addUsersIds.length) {
    emit('shareConfirm', {
      operate: 'addShareUser',
      data: {
        userIds: addUsersIds,
        guid: props.projectInfo.guid,
      },
    });
  }
  const deleteUserIds = shareUserIds.filter((item) => !selectRowIds.includes(item));
  if (deleteUserIds.length) {
    emit('shareConfirm', {
      operate: 'deleteShareUser',
      data: {
        userIds: deleteUserIds,
        guid: props.projectInfo.guid,
      },
    });
  }
  if (!addUsersIds.length && !deleteUserIds.length) {
    emit('update:dialogVisible', false);
  }
};
</script>

<template>
  <CustomDialog
    :dialog-visible="dialogVisible"
    :title="title || t('sharedProject')"
    :width="1200"
    @confirm="confirmHandle"
    @update:dialog-visible="emit('update:dialogVisible', $event)"
  >
    <template #header>
      <div class="shareEngineer-dialog-header">
        <span class="el-dialog__title">{{ props.title || t('sharedProject') }}</span>
        <el-input
          v-model="searchKeyword"
          :placeholder="t('plsInputKeywordSearch')"
          :suffix-icon="Search"
          class="search-input"
          clearable
          size="default"
        />
      </div>
    </template>
    <CustomStyleTable
      ref="tableRef"
      :table-data="filterTableData"
      max-height="40vh"
      rowKey="userId"
      :default-select="defaultSelect"
      @selectionChange="selectHandle"
    >
      <el-table-column align="center" type="selection" width="55" />
      <el-table-column
        v-for="row of tableColumns"
        :formatter="row.formatter"
        :label="row.label"
        :min-width="row.minWidth"
        :prop="row.props"
        align="center"
        show-overflow-tooltip
      />
    </CustomStyleTable>
  </CustomDialog>
</template>

<style lang="scss" scoped>
.shareEngineer-dialog-header {
  display: flex;
  gap: 20px;
  align-items: center;
  .search-input {
    width: 260px;
  }
}
</style>
