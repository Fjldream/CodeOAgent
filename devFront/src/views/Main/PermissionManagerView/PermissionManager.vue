<script setup>
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import {
  createRoleServer,
  deleteRoleServer,
  deleteRoleToGroupServer,
  editRoleServer,
  getRoleListServer,
  setRoleToGroupServer,
} from '@/api/allRequest/rolesAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CreateEditPermissionDialog from '@/views/Main/PermissionManagerView/PermissionDialogView/CreateEditPermissionDialog.vue';

const defaultProps = {
  label: 'name',
  children: 'children',
};
const { t } = useI18n();
const mainLeftMenusStore = useMainLeftMenusStore();
const { setLeftMenus } = mainLeftMenusStore;
const selectRows = ref([]);
const currentRows = ref({});
const editRows = ref({});
const searchKeyword = ref('');
const dialogVisible = ref(false);
const title = ref('');
const tableData = ref([]);
const isInit = ref(false);
const tableRef = useTemplateRef('tableRef');

const treeData = computed(() => {
  return mainLeftMenusStore.mainLeftMenus
    .filter((item) => mainLeftMenusStore.projectTypeArr.includes(item.projectType))
    .map((item) => {
      item.children = item.children.map((row) => {
        if (mainLeftMenusStore.defaultIds.includes(row.id)) {
          return {
            ...row,
            disabled: true,
          };
        }
        return row;
      });
      return item;
    });
});

const collapses = ref(treeData.value.map((item) => item.name));

const mainSpan = computed(() => {
  return Object.keys(currentRows.value).length ? 20 : 24;
});
const filterData = computed(() => {
  if (!searchKeyword.value) {
    return tableData.value;
  }
  return tableData.value.filter((item) => item.roleName?.toLowerCase()?.includes(searchKeyword.value?.toLowerCase()));
});
nextTick(async () => {
  await getTableData();
});

const tableColumns = computed(() => {
  return [
    {
      label: t('roleName'),
      props: 'roleName',
    },
    {
      label: t('description'),
      props: 'description',
    },
    {
      label: t('createTime'),
      props: 'createdTime',
    },
    {
      label: t('modifyTime'),
      props: 'lastEditTime',
    },
  ];
});

const getTableData = async () => {
  const { data } = await getRoleListServer();
  tableData.value = data;
};

const createPermission = () => {
  editRows.value = null;
  title.value = t('createRole');
  dialogVisible.value = true;
};

const editPermission = (row) => {
  title.value = t('editRole');
  dialogVisible.value = true;
  editRows.value = row;
};

const deletePermission = async (row) => {
  await useConfirm(t('sureForDeleteRoles'), t('tip'));
  await deleteRoleServer({ roleId: row.map((item) => item.roleId) });
  await getTableData();

  ElMessage.success(t('deleteRoleSuccess'));
};

const selectHandle = async (row) => {
  selectRows.value = row;
};

const setCheckKeys = (keys) => {
  if (!Array.isArray(tableRef.value) || !Array.isArray(keys)) {
    return;
  }
  for (const valueElement of tableRef.value) {
    valueElement.setCheckedKeys(keys);
  }
};

const confirmHandle = async (row) => {
  if (!row.roleId) {
    const { errorCode } = await createRoleServer({ ...row });
    if (errorCode === 0) {
      ElMessage.success(t('createRoleSuccess'));
    }
  } else {
    const { errorCode } = await editRoleServer({ ...row });
    if (errorCode === 0) {
      ElMessage.success(t('editRoleSuccess'));
    }
  }

  await getTableData();

  dialogVisible.value = false;
};

const treeCheckChangeHandle = async (row, isCheck) => {
  if (isInit.value) {
    return;
  }
  if (isCheck) {
    await setRoleToGroupServer({
      projectType: row.projectType,
      guid: row.guid,
      roleIds: [String(currentRows.value.roleId)],
    });
    ElMessage.success(t('roleConifgAddSuccess'));
  } else {
    await deleteRoleToGroupServer({
      projectType: row.projectType,
      guid: row.guid,
      roleIds: [String(currentRows.value.roleId)],
    });

    ElMessage.success(t('roleConifgDeleteSuccess'));
  }
  isInit.value = true;
  await setLeftMenus(row.projectType);
  await tableRowClick(currentRows.value);
};

function findCheckNode(nodes, row) {
  const nodeCheckIds = [];
  for (const node of nodes) {
    const isNodeCheck = row.some((data) => node.roleIds.includes(String(data.roleId)));
    if (isNodeCheck) {
      nodeCheckIds.push(node.id);
    }

    if (node.children?.length > 0) {
      nodeCheckIds.push(...findCheckNode(node.children, row));
    }
  }
  return nodeCheckIds;
}

const tableRowClick = async (row) => {
  isInit.value = true;
  currentRows.value = row;
  let checkKeys = [];
  if (Object.keys(currentRows.value).length) {
    checkKeys = treeData.value.flatMap((item) => findCheckNode([...item.children], [row]));
  }
  await nextTick(() => {
    setCheckKeys(checkKeys);
  });
  setTimeout(() => {
    isInit.value = false;
  }, 10);
};
</script>

<template>
  <el-row class="layout-card" style="height: 100%">
    <el-col :span="mainSpan" class="main-wrapper">
      <header class="header-inline">
        <div>
          <span class="text-current">{{ t('roleManager') }}</span>
        </div>
      </header>
      <div class="operate-list mb-20">
        <div class="button">
          <el-button type="primary" @click="createPermission">
            <el-icon class="mr-5">
              <IEpCirclePlus />
            </el-icon>
            {{ t('create') }}
          </el-button>
          <el-button :disabled="!selectRows.length" type="danger" @click="deletePermission(selectRows)">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
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
        :tableData="filterData"
        class="table-custom"
        max-height="calc(100vh - 200px)"
        row-key="roleId"
        @selectionChange="selectHandle"
        @tableRowClick="tableRowClick"
      >
        <el-table-column align="center" type="selection" width="55" />
        <el-table-column
          v-for="row of tableColumns"
          :key="row.label"
          :label="row.label"
          :prop="row.props"
          align="center"
          show-overflow-tooltip
        >
        </el-table-column>
        <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="160">
          <template #default="{ row }">
            <div class="df justify-every">
              <el-link type="primary" @click="editPermission(row)">
                <el-icon class="mr-5">
                  <IEpEditPen />
                </el-icon>
                {{ t('edit') }}
              </el-link>
              <el-link type="danger" @click="deletePermission([row])">
                <el-icon class="mr-5">
                  <IEpDelete />
                </el-icon>
                {{ t('delete') }}
              </el-link>
            </div>
          </template>
        </el-table-column>
      </CustomStyleTable>
    </el-col>
    <el-col v-if="Object.keys(currentRows).length" :span="4" class="role-right el-scrollbar">
      <div class="role-right-content">
        <div class="mb-12 pt-12">{{ t('permissionRange') }}</div>
        <el-collapse v-model="collapses" class="collapse-content">
          <el-collapse-item v-for="row of treeData" :key="row.id" :name="row.name" class="layout-card permission-card">
            <template #title>
              <header class="df space-between p6 card-header pl-10">
                {{ row.name }}
              </header>
            </template>
            <template #icon>
              <div class="icon-content">
                <el-icon class="header-icon">
                  <IEpDArrowRight />
                </el-icon>
              </div>
            </template>
            <el-tree
              ref="tableRef"
              :data="row.children"
              :props="defaultProps"
              class="tree-node el-scrollbar__wrap el-scrollbar__wrap--hidden-default"
              node-key="id"
              show-checkbox
              @checkChange="treeCheckChangeHandle"
            ></el-tree>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-col>
  </el-row>
  <CreateEditPermissionDialog
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :edit-form="{ ...editRows }"
    :title="title"
    @confirm="confirmHandle"
  />
</template>

<style lang="scss" scoped>
.role-right {
  display: flex;
  border-left: 1px solid #d1d1d1;
  overflow: hidden auto;

  &::before {
    content: '';
    display: block;
    height: 100%;
    width: 1px;
    margin-right: 4px;
    background: #eee;
  }

  .role-right-content {
    height: 100%;
    width: calc(100% - 6px);
    padding: 0 4px;
  }

  .collapse-content {
    height: calc(100vh - 150px);
    overflow: auto;
  }

  .card-header {
    background: #f1f4f9;
    font-size: 14px;
  }

  .pl-10 {
    padding-left: 10px;
  }

  .icon-content {
    flex: auto;
    text-align: right;

    .header-icon {
      transform: rotate(90deg);
      color: #4f9bf7;
      font-size: 18px;
      font-weight: 900;
      margin-right: 10px;
    }
  }

  .permission-card {
    border: 1px solid #d1d5db;

    &:not(:last-child) {
      margin-bottom: 16px;
    }
  }

  .tree-node {
    height: 190px;
  }
}
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

<style lang="scss">
.permission-card {
  .el-collapse-item__header {
    padding-right: 0;
    background: #f1f1f1;
  }

  .el-collapse-item__content {
    padding-bottom: 0;
  }
}
</style>
