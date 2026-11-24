<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import {
  addTransConfigServer,
  deleteTransConfigServer,
  editTransConfigServer,
  getTransDBConfigServer,
} from '@/api/allRequest/collectionAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import AddOrEditForwardDialog from '@/views/Main/CollectionView/CollectionDialogView/AddOrEditForwardDialog.vue';

const { t } = useI18n();

const collectionMenuStore = useCollectionMenuStore();
const maxHeight = ref('calc(100vh - 190px)');
const tableData = ref([]);
// 响应式列表及选中行
const dialogVisible = ref(false);
const dialogType = ref('');
// 搜索数据
const searchKeyword = ref('');
// 复选框选中行
const selectRows = ref([]);
const editRows = ref({});
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const loading = ref(false);
//检索
const filterData = computed(() =>
  tableData.value.filter((item) => item.TransType.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);
watchEffect(async () => {
  const { id } = collectionMenuStore.currentCollectionRow;
  await nextTick(async () => {
    if (collectionMenuStore.currentCollectionRow.path === 'collection-forwarding-configuration') {
      await getTableData();
    }
  });
});
//创建
const createDialog = async () => {
  dialogType.value = 'create';
  editRows.value = {};
  activeDialogComponent.value = AddOrEditForwardDialog;
  dialogVisible.value = true;
};
//编辑
const editDialog = async (row) => {
  dialogType.value = 'edit';
  editRows.value = row;
  activeDialogComponent.value = AddOrEditForwardDialog;
  dialogVisible.value = true;
};
// 确认及取消
const handleConfirm = async (data) => {
  if (dialogType.value === 'create') {
    const restful = await addTransConfigServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      await getTableData();
    }
  } else {
    const restful = await editTransConfigServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
      await getTableData();
    }
  }
  dialogVisible.value = false;
};

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};
//删除
const handleDelete = async (delRow) => {
  await useConfirm(`${t(`sureForSelectRow`, { length: delRow.length })}`, t('sureForDelete'));
  const storageIds = delRow.map((row) => row.ID);
  const restful = await deleteTransConfigServer({ storageIds });
  if (restful?.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableData();
  }
};

const getTableData = async () => {
  const data = await getTransDBConfigServer();
  if (data) {
    tableData.value = data;
  }
};
</script>

<template>
  <header class="header-inline">
    <template v-for="(item, index) in collectionMenuStore.currentCollectionTitle" :key="index">
      <div v-if="index < collectionMenuStore.currentCollectionTitle.length - 1">
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
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('create') }}
      </el-button>
      <el-button :disabled="!selectRows.length" type="danger" @click="handleDelete(selectRows)">
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
        :suffix-icon="Search"
        class="search-input"
        clearable
        size="default"
      />
      <el-button style="width: 36px" @click="refreshData">
        <el-icon class="mr-5">
          <IEpRefresh />
        </el-icon>
      </el-button>
    </div>
  </div>
  <CustomStyleTable
    :max-height="maxHeight"
    :tableData="filterData"
    class="table-custom"
    rowKey="ID"
    @selectionChange="handleSelectionChange"
    @tableRowDBClick="tableRowDBClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('forwardName')" align="left" prop="TransType" show-overflow-tooltip />
    <el-table-column :label="t('forwardAddress')" align="left" prop="BrokerAddr" show-overflow-tooltip sortable />
    <el-table-column :label="t('heartbeatIntervalS')" align="left" prop="KeepAlive" show-overflow-tooltip sortable />
    <el-table-column :label="t('reconnectIntervalS')" align="left" prop="ReConnect" show-overflow-tooltip sortable />
    <el-table-column :label="t('qualityService')" align="left" prop="Qos" show-overflow-tooltip sortable />
    <el-table-column :label="t('operate')" align="center" width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link type="primary" @click="editDialog(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="handleDelete([row])">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
          </el-link>
        </div>
      </template>
    </el-table-column>
  </CustomStyleTable>

  <component
    :is="activeDialogComponent"
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :rowData="{ ...editRows, dialogType }"
    @confirm="handleConfirm"
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

.page-name {
  .el-button {
    padding: 5px;
  }

  .el-button + .el-button {
    margin: 0;
  }
}

.userPerson-icon {
  width: 2em;
  height: 2em;
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
    width: 48px;
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
</style>
