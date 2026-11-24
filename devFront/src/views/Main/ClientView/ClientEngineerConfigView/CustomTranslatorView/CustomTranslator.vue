<script setup>
import { ElMessage } from 'element-plus';
import { CaretBottom, CaretTop, Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useClientTranslationResourcey } from '@/composables/clientCompose/useClientTranslationResourcey.js';
import { saveProjectDataServer } from '@/api/allRequest/clientAPI.js';

import UpsertResourcesDialog from '@/views/Main/ClientView/ClientDialogView/UpsertResourcesDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import ResourcesManagerDialog from '@/views/Main/ClientView/ClientDialogView/ResourcesManagerDialog.vue';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();

const {
  selectRows,
  uploadRef,
  resouresNameData,
  tableColumns,
  tableData,
  getTableData,
  handleSelectionChange,
  fileChangeFun,
  exportHandle,
  allExportHandle,
  startEditing,
  stopEditing,
  isEditing,
  handleDelete,
  setSort,
} = useClientTranslationResourcey({ t, clientMenuStore, types: [2] });

// 响应式列表及选中行
const dialogVisible = ref(false);
const dialogType = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
// 搜索数据
const searchKeyword = ref('');
const commonTableRef = ref();
// 复选框选中行
//检索
const filterData = computed(() =>
  tableData.value.filter(
    (item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) && item.type === 2,
  ),
);

nextTick(async () => {
  await getTableData();
});

//提取资源
const createDialog = async () => {
  dialogType.value = 'create';
  activeDialogComponent.value = UpsertResourcesDialog;
  dialogVisible.value = true;
};
//语言管理
const managerDialog = async () => {
  dialogType.value = 'manager';
  activeDialogComponent.value = ResourcesManagerDialog;
  dialogVisible.value = true;
};
// 确认及取消
const handleConfirm = async (data) => {
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  if (dialogType.value === 'create') {
    const paramData = {
      type: 'add',
      tranlateArray: [
        {
          name: data.name,
        },
      ],
      resourceType: 2,
    };
    const type = 20;
    const name = 'userSource';
    const restful = await saveProjectDataServer({ name, paramData, projectId, type });
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      await getTableData();
    } else {
      ElMessage.error(restful.message);
    }
  } else {
    const paramData = {
      languageArray: data.map((item) => ({ customeLanguage: item.customeLanguage, languageId: item.languageId })),
    };
    const type = 20;
    const name = 'customelangguage';
    const restful = await saveProjectDataServer({ name, paramData, projectId, type });
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
      await getTableData();
    } else {
      ElMessage.error(restful.message);
    }
  }
  dialogVisible.value = false;
};

const refreshData = async () => {};

// 导入
const fileChange = async (file) => {
  await fileChangeFun(file, 2);
};
</script>

<template>
  <div class="content" @click.self="stopEditing">
    <header class="header-inline">
      <div v-for="(item, index) in clientMenuStore.currentClientTitle" :key="index">
        <span class="text">{{ item }}</span>
        <span v-if="index < clientMenuStore.currentClientTitle.length - 1" class="diagonal-divider"></span>
      </div>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="createDialog">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('addResource') }}
        </el-button>
        <el-button type="primary" @click="managerDialog">
          <el-icon class="mr-5">
            <IEpCollection />
          </el-icon>
          {{ t('languageManage') }}
        </el-button>
        <el-button :disabled="!selectRows.length" type="danger" @click="handleDelete(selectRows)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          :on-change="fileChange"
          :show-file-list="false"
          accept=".xlsx, xls"
          class="ml-10"
        >
          <el-button>
            <el-icon class="mr-5">
              <IEpUpload />
            </el-icon>
            {{ t('import') }}
          </el-button>
        </el-upload>
        <el-button :disabled="!selectRows.length" @click="exportHandle">
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('export') }}
        </el-button>
        <el-button @click="allExportHandle">
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('allExport') }}
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
      ref="commonTableRef"
      :tableData="filterData"
      class="table-custom"
      max-height="calc(100vh - 198px)"
      rowKey="id"
      @selectionChange="handleSelectionChange"
    >
      <el-table-column align="center" type="selection" width="55" />
      <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
      <el-table-column
        v-for="col of tableColumns"
        :key="col.label"
        :label="col.label"
        :prop="col.props"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row, $index }">
          <div v-if="col.customeLanguage">
            <el-input
              v-if="isEditing($index, col.languageId)"
              v-model="row[col.languageId]"
              size="small"
              @blur="stopEditing(row, col.languageId)"
            />
            <span v-else class="edit-span" @click.stop="startEditing($index, col.languageId)">
              {{ row[col.props] }}
            </span>
          </div>
          <div v-else class="edit-span" @click.stop="startEditing($index, col.languageId)">
            {{ row[col.props] }}
          </div>
        </template>
        <template #header>
          <span style="display: inline-flex; align-items: center">
            {{ col.label }}
            <span class="arrow-box">
              <el-icon class="arrow up" @click.stop="setSort(commonTableRef, col.props, 'ascending')">
                <CaretTop />
              </el-icon>
              <el-icon class="arrow down" @click.stop="setSort(commonTableRef, col.props, 'descending')">
                <CaretBottom />
              </el-icon>
            </span>
          </span>
        </template>
      </el-table-column>
    </CustomStyleTable>
    <component
      :is="activeDialogComponent"
      v-if="dialogVisible"
      v-model:dialogVisible="dialogVisible"
      :tableColumns="[...resouresNameData]"
      :tableData="tableData.map((row) => row.name)"
      @confirm="handleConfirm"
    />
  </div>
</template>

<style lang="scss" scoped>
.content {
  width: 100%;
  height: 100%;

  .edit-span {
    cursor: pointer;
    display: inline-block;
    width: 100%;
    min-height: 16px;
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

  :deep(.el-table__body-wrapper) {
    .el-table__cell {
      height: 46px;
    }
  }
  .arrow-box {
    display: inline-flex;
    flex-direction: column;
    margin-left: 6px;
    cursor: pointer;
  }
  .arrow {
    font-size: 12px;
    color: #909399;
    line-height: 1;
  }
  .arrow:hover {
    color: #409eff;
  }
  .arrow.active {
    color: #409eff;
  }
}
</style>
