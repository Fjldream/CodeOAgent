<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useProjectOperate } from '@/composables/useProjectOperate.js';
import {
  createProjectServer,
  deleteProjectServer,
  deleteShareAllUserServer,
  deleteShareUserServer,
  exportProjectServer,
  getProjectInfoServer,
  importProjectServer,
  modifyProjectServer,
  shareUserServer,
} from '@/api/allRequest/dataSourceAPI.js';
import { debounce } from '@/utils/commonUtils.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { getDateName } from '@/utils/dayjsUtil.js';
import { regexSafeTExt } from '@/utils/regexRules.js';

// 导入所有公共组件
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import ShareEngineerDialog from '@/views/Main/MainDialogView/ShareEngineerDialog.vue';
import UpsertProjectDialog from '@/views/Main/DataSourceView/DataSourceDialogView/UpsertProjectDialog.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';

const { t } = useI18n();
const mainLeftMenusStore = useMainLeftMenusStore();
const {
  isLoading,
  loadingText,
  publishProject,
  unPublishProject,
  updateProject,
  getTagType,
  hasPermission,
  isCreator,
  isDisableProjectName,
} = useProjectOperate({ t, mainLeftMenusStore });
const tableColumns = computed(() => {
  return [
    {
      label: t('description'),
      props: 'description',
      minWidth: '10%',
    },
    {
      label: 'ID',
      props: 'guid',
      minWidth: '8%',
    },
    {
      label: t('type'),
      props: 'type',
      minWidth: '8%',
    },
    {
      label: 'IP',
      props: 'ip',
      minWidth: '8%',
    },
    {
      label: t('port'),
      props: 'port',
      minWidth: '8%',
    },
  ];
});
const maxHeight = computed(() => {
  return !mainLeftMenusStore.expand ? 'calc(100vh - 420px)' : 'calc(100vh - 200px)';
});
const tableData = ref([]);
// 响应式列表及选中行
const dialogVisible = ref(false);
const dialogType = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
// 搜索数据
const searchKeyword = ref('');
// 复选框选中行
const selectRows = ref([]);
const uploadRef = useTemplateRef('uploadRef');
// 编辑数据
const editRows = ref([]);
const tableRow = ref({});
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
const disableProjectName = ref(false);
import { sourceEntry } from '@/assistant/entry.js';
watchEffect(() => {
  const group = mainLeftMenusStore.leftRowSelect.guid;
  const row = dialogVisible.value
    ? (dialogType.value === 'edit' && activeDialogComponent.value === UpsertProjectDialog ? editRows.value : null)
    : (selectRows.value.length === 1 ? selectRows.value[0] : null);
  sourceEntry.value = row?.guid && group && row.projectGroupId === group
    ? {kind:'datasource',projectId:row.guid,group,label:'数据源 / '+row.name} : null;
});
onBeforeUnmount(() => { sourceEntry.value = null; });
// end

watchEffect(() => {
  const { guid: projectGroupId, path } = mainLeftMenusStore.leftRowSelect;
  if (path !== 'datasource') {
    return;
  }
  nextTick(async () => {
    await getTableData({ projectGroupId });
  });
});
//检索
const filterData = computed(() =>
  tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);
//创建
const createDialog = async () => {
  dialogType.value = 'create';
  activeDialogComponent.value = UpsertProjectDialog;
  dialogVisible.value = true;
  disableProjectName.value = isDisableProjectName(false);
};
//编辑
const editDialog = async (row) => {
  if (!hasPermission(row)) {
    // 没有数据源工程权限的用户点击编辑数据源时，没有“没有工程操作权限”的提示
    ElMessage.warning(t('noPermise'));
    return;
  }
  dialogType.value = 'edit';
  editRows.value = row;
  activeDialogComponent.value = UpsertProjectDialog;
  dialogVisible.value = true;
  disableProjectName.value = isDisableProjectName(true, row.status);
};
// 确认及取消
const handleConfirm = async (data) => {
  const { guid: projectGroupId } = mainLeftMenusStore.leftRowSelect;
  if (dialogType.value === 'create') {
    const params = { ...data, ...{ projectGroupId } };
    params.dataType.forEach((value, index) => {
      if (value === '1') {
        params.dataType[index] = '实时';
      } else if (value === '2') {
        params.dataType[index] = '历史';
      } else {
        params.dataType[index] = '报警';
      }
    });
    const restful = await createProjectServer(params);
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      await getTableData();
    }
  } else {
    data.dataType.forEach((value, index) => {
      if (value === '1') {
        data.dataType[index] = '实时';
      } else if (value === '2') {
        data.dataType[index] = '历史';
      } else {
        data.dataType[index] = '报警';
      }
    });
    const restful = await modifyProjectServer(data);
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
const deleteDataSource = async (toDeleteRows) => {
  const deleteData = toDeleteRows.filter((row) => hasPermission(row));
  if (deleteData.length === 0) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  await useConfirm(t('sureForSelectRow', { length: deleteData.length }), t('sureForDelete'));
  const idsToDelete = deleteData.map((row) => row.guid);
  const deleteObj = {
    guid: idsToDelete,
  };
  const restful = await deleteProjectServer(deleteObj);
  if (restful && restful.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableData();
  }
};
//导出
const exportHandle = async () => {
  let noPermiseArr = [];
  const exportRow = selectRows.value.filter((row) => {
    if (hasPermission(row)) {
      return row;
    } else {
      noPermiseArr.push(row.name);
    }
  });
  if (exportRow.length === 0) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  if (noPermiseArr.length > 0) {
    ElMessage.warning(t('noPermiseProject', { arr: noPermiseArr.join(',') }));
  }
  const { errorCode, errorPros, successPros } = await exportProjectServer(exportRow);
  if (errorCode === 0) {
    if (errorPros.length) {
      ElMessage.error(t('exportError') + errorPros);
    }
    const downlandFiles = successPros.map((item, index) => {
      return {
        url: item.url,
        fileName: `${successPros[index].projectName}.zip`,
      };
    });
    await batchZIPDownloadHandle(downlandFiles);
    ElMessage.success(t('projectExportSuccess'));
  }
};

// 文件上传
const fileChange = async (file) => {
  const projectGroupId = mainLeftMenusStore.leftRowSelect.guid;
  const { errorCode, data } = await getProjectInfoServer({ projectGroupId });
  let allTableDataNames = [];
  if (errorCode === 0) {
    allTableDataNames = data.map((items) => items.name);
  }
  let fileName = file.name.replace('.zip', '');
  while (allTableDataNames.includes(fileName)) {
    fileName = `${fileName}_${getDateName()}`;
  }
  if (!regexSafeTExt(fileName)) {
    ElMessage.error(t('projectNameRule'));
    return;
  }
  const params = {
    file: file.raw,
    projectGroupId,
    name: encodeURIComponent(file.name),
  };
  const result = await importProjectServer(params);
  uploadRef.value?.clearFiles();
  if (result?.errorCode !== 0) {
    return;
  }
  if (result.data?.errorPros?.length > 0) {
    const failedItem = result.data.errorPros[0];
    ElMessage.error(t('datasourceImportFailed', { msg: failedItem.msg }));
    return;
  }
  await getTableData();
  ElMessage({
    type: 'success',
    message: t('importPorjectSuccess'),
  });
};

//数据处理
const flattenObject = (obj) => {
  const result = {};

  function recurse(current) {
    for (const key in current) {
      const value = current[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        recurse(value);
      } else {
        result[key] = value;
      }
    }
  }

  recurse(obj);
  return result;
};

const getTableData = async (row = { projectGroupId: mainLeftMenusStore.leftRowSelect.guid }) => {
  const result = await getProjectInfoServer(row);
  if (result?.errorCode === 0) {
    const setData = [];
    result.data.forEach((item) => {
      const flatObj = flattenObject(item);
      flatObj.dataType.forEach((value, index) => {
        if (value === '实时') {
          flatObj.dataType[index] = '1';
        } else if (value === '历史') {
          flatObj.dataType[index] = '2';
        } else {
          flatObj.dataType[index] = '3';
        }
      });
      setData.push(flatObj);
    });
    tableData.value = setData;
  }
};

const shareEngineerHamdle = async () => {
  if (!isCreator(selectRows.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  tableRow.value = selectRows.value[0];
  activeDialogComponent.value = ShareEngineerDialog;
  dialogVisible.value = true;
};
const refreshData = async () => {};

const shareConfirmDebounce = debounce((errorCode) => {
  if (errorCode === 0) {
    ElMessage.success(t('operateSuccess'));
  }
  dialogVisible.value = false;
  getTableData();
}, 1000);

const editShareUser = async (editInfo) => {
  let errorCode = null;
  switch (editInfo.operate) {
    case 'deleteShareAllUser':
      errorCode = await deleteShareAllUserServer(editInfo.data);
      break;
    case 'addShareUser':
      errorCode = await shareUserServer(editInfo.data);
      break;
    case 'deleteShareUser':
      errorCode = await deleteShareUserServer(editInfo.data);
      break;
    default:
      break;
  }
  shareConfirmDebounce(errorCode);
};
const publishDataSource = async () => {
  try {
    if (!hasPermission(selectRows.value[0])) {
      ElMessage.warning(t('noPermise'));
      return;
    }
    await publishProject({ guid: selectRows.value[0].guid });
  } finally {
    await getTableData();
  }
};
const unPublishDataSource = async () => {
  try {
    if (!hasPermission(selectRows.value[0])) {
      ElMessage.warning(t('noPermise'));
      return;
    }
    await unPublishProject({ guid: selectRows.value[0].guid });
  } finally {
    await getTableData();
  }
};
const updateDataSource = async () => {
  try {
    if (!hasPermission(selectRows.value[0])) {
      ElMessage.warning(t('noPermise'));
      return;
    }
    await useConfirm(`${t(`confirmUpdateProject`)}`, t('tip'));
    await updateProject({ guid: selectRows.value[0].guid });
  } catch (error) {
    ElMessage.info(t('updateCancel'));
  } finally {
    await getTableData();
  }
};
</script>

<template>
  <header class="toolbar">
    <div class="button">
      <el-button type="primary" @click="createDialog">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('buildProject') }}
      </el-button>
      <el-button :disabled="!selectRows.length" type="danger" @click="deleteDataSource(selectRows)">
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
        accept=".zip"
        class="ml-10"
      >
        <el-button>
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('import') }}
        </el-button>
      </el-upload>
      <el-button :disabled="!selectRows.length" @click="exportHandle">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" @click="shareEngineerHamdle">
        <el-icon class="mr-5">
          <IEpShare />
        </el-icon>
        {{ t('editShare') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="publishDataSource">
        <el-icon class="mr-5">
          <IEpPosition />
        </el-icon>
        {{ t('publish') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="updateDataSource">
        <el-icon class="mr-5">
          <IEpConnection />
        </el-icon>
        {{ t('update') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="danger" @click="unPublishDataSource">
        <el-icon class="mr-2">
          <IEpPosition />
        </el-icon>
        {{ t('unpublish') }}
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
  </header>
  <CustomStyleTable
    :max-height="maxHeight"
    :tableData="filterData"
    class="layout-card table-custom"
    @selectionChange="handleSelectionChange"
  >
    <el-table-column align="left" type="selection" width="55" />
    <el-table-column :label="t('projectName')" align="left" min-width="8%" prop="name" show-overflow-tooltip>
      <template #default="{ row }">
        <el-link type="primary" underline="never">
          {{ row.name }}
        </el-link>
      </template>
    </el-table-column>
    <el-table-column :label="t('status')" align="left" min-width="12%" show-overflow-tooltip>
      <template #default="{ row }">
        <el-tag :type="getTagType(row)" round>
          {{ t(row.status) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column
      v-for="row of tableColumns"
      :formatter="row.formatter"
      :label="row.label"
      :min-width="row.minWidth"
      :prop="row.props"
      :sortable="row.sortable"
      align="left"
      show-overflow-tooltip
    />
    <el-table-column :label="t('modifyInfo')" align="left" min-width="15%" show-overflow-tooltip sortable>
      <template #default="{ row }">
        <el-row :gutter="16" align="middle">
          <el-col :span="5">
            <CustomIcon name="userPerson" svgClass="userPerson-icon" />
          </el-col>
          <el-col :span="19">
            <span class="name-class">
              {{ row.modifiedByName }}
            </span>
            <br />
            <span class="time-class">{{ row.modifiedTime }}</span>
          </el-col>
        </el-row>
      </template>
    </el-table-column>
    <el-table-column :label="t('createInfo')" align="left" min-width="15%" show-overflow-tooltip sortable>
      <template #default="{ row }">
        <el-row :gutter="16" align="middle">
          <el-col :span="5">
            <CustomIcon name="userPerson" svgClass="userPerson-icon" />
          </el-col>
          <el-col :span="19">
            <span class="name-class">
              {{ row.createByName }}
            </span>
            <br />
            <span class="time-class">{{ row.createTime }}</span>
          </el-col>
        </el-row>
      </template>
    </el-table-column>
    <el-table-column
      :label="t('visitPermission')"
      align="center"
      width="160"
      prop="hasProjectPermission"
      show-overflow-tooltip
    >
      <template #default="{ row }">
        <el-icon
          :size="20"
          :style="{ verticalAlign: 'middle', color: row.hasProjectPermission === true ? '#67C23A' : '#F56C6C' }"
        >
          <IEpCircleCheckFilled v-if="row.hasProjectPermission === true" style="width: 100%; height: 100%" />
          <IEpCircleCloseFilled v-else style="width: 100%; height: 100%" />
        </el-icon>
      </template>
    </el-table-column>
    <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link type="primary" @click="editDialog(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="deleteDataSource([row])">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
          </el-link>
        </div>
      </template>
    </el-table-column>
  </CustomStyleTable>
  <!-- 动态弹窗组件 -->
  <component
    :is="activeDialogComponent"
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :projectInfo="{ ...tableRow }"
    :rowData="{ ...editRows, dialogType }"
    :disableProjectName="disableProjectName"
    @confirm="handleConfirm"
    @shareConfirm="editShareUser"
  />

  <LoadingComponent v-if="isLoading" :loading="isLoading" :loadingText="loadingText" />
</template>

<style lang="scss" scoped>
.userPerson-icon {
  width: 2em;
  height: 2em;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; // 小屏自动换行
  margin-bottom: 20px;
  gap: 12px;

  .button {
    display: flex;
    flex-wrap: wrap; // 按钮自动换行
    gap: 0px; // 按钮之间的间距
    .el-button {
      border-radius: 4px;
    }
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

.search-box {
  min-width: 260px;
  margin-top: 8px;
  @media screen and (min-width: 768px) {
    margin-top: 0;
  }

  .search-input {
    width: 260px;
  }
}
</style>
