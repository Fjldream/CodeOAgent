<script setup>
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';

import {
  createRoleServer,
  deleteRoleServer,
  editRoleServer,
  getResourceServer,
  getRoleListServer,
} from '@/api/allRequest/clientAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { getGroupListServer } from '@/api/allRequest/userManagerApi.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import UpsertSafeObjectDialog from '@/views/Main/ClientView/ClientDialogView/UpsertSafeObjectDialog.vue';
import UpsertAssociatedUsersDialog from '@/views/Main/ClientView/ClientDialogView/UpsertAssociatedUsersDialog.vue';

const clientMenuStore = useClientMenuStore();
const { t } = useI18n();

const maxHeight = ref('calc(100vh - 190px)');
const userList = ref({});
const resourceList = ref({});
// 编辑数据
const editRows = ref([]);
const tableData = ref([]);
// 响应式列表及选中行
const dialogVisible = ref(false);
const dialogType = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
// 搜索数据
const searchKeyword = ref('');
// 复选框选中行
const selectRows = ref([]);
//检索
const filterData = computed(() =>
  tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);

nextTick(async () => {
  await getTableData();
});

//创建
const createDialog = async () => {
  dialogType.value = 'create';
  editRows.value = [];
  activeDialogComponent.value = UpsertSafeObjectDialog;
  dialogVisible.value = true;
};
//编辑
const editDialog = async (row) => {
  dialogType.value = 'edit';
  editRows.value = row;
  activeDialogComponent.value = UpsertSafeObjectDialog;
  dialogVisible.value = true;
};
//关联用户
const associatDialog = async (row) => {
  dialogType.value = 'associat';
  editRows.value = row;
  activeDialogComponent.value = UpsertAssociatedUsersDialog;
  dialogVisible.value = true;
};
// 确认及取消
const handleConfirm = async (data) => {
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  if (dialogType.value === 'create') {
    const params = {
      ...data,
      createBy: '',
      showOrder: '',
      operate: t('edit'),
      linkUser: t('associatedUser'),
      user: [],
      userGroup: [],
      userGroupMsg: [],
      statusMsg: data.status ? t('enable') : t('disable'),
      projectId,
    };
    const restful = await createRoleServer(params);
    if (restful?.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
    }
  } else {
    const params = { ...data, projectId };
    const restful = await editRoleServer(params);
    if (restful?.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
    }
  }
  dialogVisible.value = false;
  await getTableData();
};

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};
//删除
const handleDelete = async (delRow) => {
  const toDeleteRows = delRow;
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));
  const ids = toDeleteRows.map((row) => row.id);
  const restful = await deleteRoleServer({ projectId, ids });
  if (restful && restful.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableData();
  }
};

const getTableData = async () => {
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  const roleListResult = await getRoleListServer({ projectId });
  if (roleListResult && roleListResult.errorCode === 0) {
    tableData.value = roleListResult.data.message.roleResourceList;
  }
  const resourceResult = await getResourceServer({ projectId });
  if (resourceResult && resourceResult.errorCode === 0) {
    resourceList.value = resourceResult.data.message;
  }
  const userGroupListResult = await getGroupListServer({ projectId });
  if (userGroupListResult && userGroupListResult.errorCode === 0) {
    userList.value = userGroupListResult.data.children;
  }
};

const refreshData = async () => {};
</script>

<template>
  <div class="content">
    <header class="header-inline">
      <template v-for="(item, index) in clientMenuStore.currentClientTitle" :key="index">
        <div v-if="index < clientMenuStore.currentClientTitle.length - 1">
          <span class="text">{{ item }}</span>
          <span class="diagonal-divider"></span>
        </div>
        <div v-else>
          <span class="text-current">{{ item }}</span>
        </div>
      </template>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="createDialog">
          <el-icon class="mr-5"> <IEpCirclePlus /> </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="!selectRows.length" type="danger" @click="handleDelete(selectRows)">
          <el-icon class="mr-5"> <IEpDelete /> </el-icon>
          {{ t('delete') }}
        </el-button>
      </div>
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('plsInputKeywordSearch')"
          :suffix-icon="Search"
          class="search-input"
          clearable
          size="default"
        />
        <el-button @click="refreshData" style="width: 36px">
          <el-icon class="mr-5"> <IEpRefresh /> </el-icon>
        </el-button>
      </div>
    </div>
    <CustomStyleTable
      :tableData="filterData"
      :max-height="maxHeight"
      @selectionChange="handleSelectionChange"
      class="table-custom"
      rowKey="id"
    >
      <el-table-column align="center" min-width="5%" type="selection" width="55" />
      <el-table-column :label="t('name')" align="center" min-width="25%" prop="name" />
      <el-table-column :label="t('description')" align="center" min-width="25%" prop="comment" />
      <el-table-column :label="t('status')" align="center" min-width="25%" prop="status">
        <template #default="{ row }">
          <el-switch
            v-model="row.status"
            active-color="#13ce66"
            inactive-color="#ff4949"
            @Change="
              () => {
                dialogType = 'edit';
                handleConfirm(row);
              }
            "
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('operate')" align="center" min-width="20%" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="operate-button">
            <el-button link type="primary" @click="associatDialog(row)">
              <el-icon class="mr-5">
                <IEpConnection />
              </el-icon>
              {{ t('associatedUser') }}
            </el-button>
            <el-button link type="primary" @click="editDialog(row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-button>
            <el-button link type="danger" @click="handleDelete([row])">
              <el-icon class="mr-5">
                <IEpDelete />
              </el-icon>
              {{ t('delete') }}
            </el-button>
          </div>
        </template>
      </el-table-column>
    </CustomStyleTable>
    <div class="dialog">
      <component
        :is="activeDialogComponent"
        v-if="dialogVisible"
        v-model:dialogVisible="dialogVisible"
        :rowData="{ ...editRows, dialogType }"
        :userList="userList"
        :resourceList="resourceList"
        @confirm="handleConfirm"
      />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.content {
  width: 100%;
  height: 100%;
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
    .icon {
      margin-right: 6px;
      font-size: 18px;
    }
    .text {
      font-size: 16px;
      color: #9ca3af;
      white-space: nowrap;
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

    .button-list-con {
      display: flex;
      flex-wrap: wrap; // 按钮自动换行
      gap: 0px; // 按钮之间的间距
      .el-button {
        border-radius: 4px;
      }
    }
    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }
  .search-box {
    min-width: 260px;
    margin-top: 8px;
    @media screen and (min-width: 768px) {
      margin-top: 0;
    }
    .search-input {
      width: 260px;
    }
    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }
  .operate-button {
    .el-button {
      height: 21px;
      padding: 0; // 去掉内边距以保持设定高度
      font-size: 14px;
      line-height: 48px; // 垂直居中
      text-align: center;
      white-space: nowrap; // 防止文字换行
      overflow: hidden;
      text-overflow: ellipsis; // 超出隐藏（可选）
    }
  }
  :deep(.el-table__body-wrapper) {
    .el-table__cell {
      height: 46px;
    }
  }
}
</style>
