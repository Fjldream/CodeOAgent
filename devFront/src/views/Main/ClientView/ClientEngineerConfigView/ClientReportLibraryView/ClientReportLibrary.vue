<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { exportScriptJsonHandle, importScriptJsonHandle } from '@/utils/importExportUtils.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import {
  createReportManagerServer,
  delReportManagerServer,
  editReportManagerServer,
  getReportManagerServer,
  batchGetReportServer,
  getMultiSeatServer,
} from '@/api/allRequest/clientAPI.js';
import { useReportEditorStore } from '@/stores/reportEditorStore.js';
import { useConfirm } from '@/composables/useConfirm.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import ReportEditorDialog from '@/views/Main/ClientView/ClientDialogView/ReportEditorDialogView/ReportEditorDialog.vue';
import AddOrEditProjectDialog from '@/components/AddOrEditProjectDialog/AddOrEditProjectDialog.vue';
import reportImportDialog from '@/views/Main/ClientView/ClientDialogView/ReportImportDialog.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();
const reportEditorStore = useReportEditorStore();
const userStore = useLoginUserStore();
const { addReportEditorList } = reportEditorStore;
const loading = ref(false);
const editorVisible = ref(false);
const selectRows = ref([]);
const searchKeyword = ref('');
const tableData = ref([]);
const formData = ref({});
const addDialogVisible = ref(false);
const title = ref(t('createReport'));
const importDialogVisible = ref(false);
const changeTimer = ref(null);
const importData = ref([]);
const uploadRef = useTemplateRef('uploadRef');
const limit = ref(50);
const filterData = computed(() => {
  if (!searchKeyword.value) {
    return tableData.value;
  }
  return tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()));
});

const isRootGroup = computed(() => {
  return clientMenuStore.currentClientRow.id === 'client-report-library';
});

nextTick(() => {
  getTableData();
});
watch(
  () => clientMenuStore.currentClientRow.id,
  () => {
    if (clientMenuStore.currentClientRow.path === 'client-report-library') {
      getTableData();
    }
  },
);
const getTableData = async () => {
  const { data } = await getReportManagerServer();
  if (isRootGroup.value) {
    tableData.value = data;
    return;
  }
  tableData.value = data.filter((item) => item.groupId === clientMenuStore.currentClientRow.id);
};
const createDialog = () => {
  formData.value = {};
  addDialogVisible.value = true;
};
const handleDelete = async (row) => {
  const params = row.map((item) => {
    return { id: item.id, name: item.name };
  });
  await useConfirm(`${t(`sureForSelectRow`, { length: params.length })}`, t('sureForDelete'));
  const result = await delReportManagerServer(params);
  if (result.errorCode === 0 && Array.isArray(result.data.message)) {
    ElMessage.error(t('pageQuote', { pageName: result.data.message.join(' ') }));
  } else {
    ElMessage.success(t('deleteSuccess'));
  }
  await getTableData();
};
const editDialog = (row) => {
  formData.value = row;
  addDialogVisible.value = true;
};
// 文件上传
const fileChange = async (file, fileList) => {
  if (!loading.value) {
    loading.value = true;
  }
  clearTimeout(changeTimer.value);
  changeTimer.value = setTimeout(() => {
    importReportHandle(fileList);
  }, 100);
};

const exceedHandle = async (files, uploadFiles) => {
  if (!loading.value) {
    loading.value = true;
  }
  const allFiles = [...uploadFiles, ...files].splice(0, limit.value).map((file) => {
    return {
      raw: file,
    };
  });
  await importReportHandle(allFiles);
};

const importReportHandle = async (fileList) => {
  try {
    const pageList = [];
    for (const element of fileList) {
      const data = await importScriptJsonHandle(element.raw);
      if (!data?.pageProperty?.name) {
        return ElMessage.error(t('importPageTips'));
      }
      pageList.push({
        data,
        name: data?.pageProperty?.name,
      });
    }
    importData.value = pageList;
    importDialogVisible.value = true;
    uploadRef.value?.clearFiles();
  } catch (e) {
    ElMessage.error(t('importPageTips'));
  } finally {
    loading.value = false;
  }
};

const exportHandle = async (rows) => {
  const reportIds = rows.map((item) => {
    return item.id;
  });
  const reportJsons = await batchGetReportServer(reportIds);
  if (reportJsons?.errorCode === 0) {
    for (const valueElement of reportJsons.data) {
      await exportScriptJsonHandle(valueElement, `${valueElement.pageProperty.name}.json`);
    }
  }
};
const refreshData = () => {};
const handleSelectionChange = (row) => {
  selectRows.value = row;
};
const tableRowDBClick = async (row) => {
  const { guid } = clientMenuStore.currentClientEngineer;
  const multiParams = [
    {
      handSeatFlag: false,
      itemId: row.id,
      projectId: guid,
      token: userStore.userInfo.userName,
      type: 10,
    },
  ];
  const result = await getMultiSeatServer(multiParams);
  if (result.errorCode === 0 && !result.data.message[0]) {
    addReportEditorList(row);
    editorVisible.value = true;
  } else {
    await ElMessageBox.alert(t('reportSeatTip'), t('tip'), {
      type: 'error',
    });
  }
};

const handleConfirm = async (row) => {
  if (!row.id) {
    row.groupId = clientMenuStore.currentClientRow.id;
    const { errorCode } = await createReportManagerServer(row);
    if (errorCode === 0) {
      ElMessage.success(t('createSuccess'));
    }
  } else {
    const { errorCode } = await editReportManagerServer(row);
    if (errorCode === 0) {
      ElMessage.success(t('editSuccess'));
    }
  }

  await getTableData();
  addDialogVisible.value = false;
};
</script>

<template>
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
      <el-button type="primary" @click="createDialog" v-if="!isRootGroup">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createReport') }}
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
        :on-change="fileChange"
        :on-exceed="exceedHandle"
        :show-file-list="false"
        accept=".json, .xlsx, xls"
        class="ml-10"
        v-if="!isRootGroup"
      >
        <el-button>
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('import') }}
        </el-button>
      </el-upload>
      <el-button :disabled="!selectRows.length" @click="exportHandle(selectRows)">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
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
    max-height="calc(100vh - 190px)"
    :tableData="filterData"
    class="table-custom"
    rowKey="id"
    @selectionChange="handleSelectionChange"
    @tableRowDBClick="tableRowDBClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('reportName')" align="left" min-width="25%" prop="name" show-overflow-tooltip>
      <template #default="{ row }">
        <el-link type="primary" underline="never" @click="tableRowDBClick(row)">
          {{ row.name }}
        </el-link>
      </template>
    </el-table-column>
    <el-table-column :label="t('description')" align="left" min-width="25%" prop="description" show-overflow-tooltip />
    <el-table-column :label="t('createInfo')" align="left" min-width="25%" show-overflow-tooltip sortable>
      <template #default="{ row }">
        <el-row :gutter="16" align="middle">
          <el-col :span="4">
            <CustomIcon name="userPerson" svgClass="userPerson-icon" />
          </el-col>
          <el-col :span="19">
            <span class="name-class">
              {{ row.createBy }}
            </span>
            <br />
            <span class="time-class">{{ row.createtime }}</span>
          </el-col>
        </el-row>
      </template>
    </el-table-column>
    <el-table-column :label="t('modifyInfo')" align="left" min-width="25%" show-overflow-tooltip sortable>
      <template #default="{ row }">
        <el-row :gutter="16" align="middle">
          <el-col :span="4">
            <CustomIcon name="userPerson" svgClass="userPerson-icon" />
          </el-col>
          <el-col :span="19">
            <span class="name-class">
              {{ row.modifyBy }}
            </span>
            <br />
            <span class="time-class">{{ row.modifytime }}</span>
          </el-col>
        </el-row>
      </template>
    </el-table-column>
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

  <LoadingComponent v-if="loading" :loading="loading" :loading-text="t('fileReading')" />

  <AddOrEditProjectDialog
    v-if="addDialogVisible"
    v-model:dialog-visible="addDialogVisible"
    :rowData="formData"
    :title="title"
    @confirm="handleConfirm"
  />
  <reportImportDialog
    v-if="importDialogVisible"
    v-model:dialogVisible="importDialogVisible"
    :table-data="importData"
    @confirm="getTableData"
  />
  <ReportEditorDialog v-model:editorVisible="editorVisible" v-if="editorVisible" @saveHandle="getTableData" />
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
