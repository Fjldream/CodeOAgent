<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import {
  getDaServer,
  getDaDeviceServer,
  addDaDeviceServer,
  editDaDeviceServer,
  delDaDeviceServer,
  getDaVariablesServer,
  addDaVariablesServer,
  delDaVariablesServer,
  daExportVarsServer,
  daImportVarsServer,
  editDaVariablesServer,
} from '@/api/allRequest/collectionAPI.js';
import { debounce } from '@/utils/commonUtils.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { useConfirm } from '@/composables/useConfirm.js';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import AddOrEditOpcdaDialog from '@/views/Main/CollectionView/CollectionDialogView/AddOrEditOpcdaDialog.vue';
import AddOpcdaVariableDialog from '@/views/Main/CollectionView/CollectionDialogView/AddOpcdaVariableDialog.vue';
import UpsertOpcdaConnectionDialog from '@/views/Main/CollectionView/CollectionDialogView/UpsertOpcdaConnectionDialog/UpsertOpcdaConnectionDialog.vue';
import EditOpcuaOrOpcdaVariableDialog from '@/views/Main/CollectionView/CollectionDialogView/EditOpcuaOrOpcdaVariableDialog.vue';
import CsvEncodingSelect from '@/views/Main/CollectionView/CollectionDialogView/CsvEncodingSelect.vue';

const { t } = useI18n();
const uploadRef = useTemplateRef('uploadRef');
const fileList = ref([]);
const collectionMenuStore = useCollectionMenuStore();
const pageSizes = ref([10, 20, 30, 50, 100, 200, 2000]);
const tableDataDevice = ref([]);
const tableDataVariable = ref([]);
const connectionsOptions = ref([]);
const currentConnection = ref('');
// 响应式列表及选中行
const dialogVisible = ref(false);
const dialogType = ref('');
// 搜索数据
const searchKeywordDevice = ref('');
const searchKeywordVariable = ref('');
// 复选框选中行
const selectRowsDevice = ref([]);
const selectRowsVariable = ref([]);
const currentRow = ref({});
const editRows = ref({});
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const encodingSelectVisible = ref(false);
const encodingData = ref('utf-8');
const uploadTrigger = ref(null);
const daReduncyFlag = computed(() => {
  if (!currentConnection.value) return false;
  const option = connectionsOptions.value.filter((item) => item.label === currentConnection.value);
  return option[0].redundancyStyle === 2;
});
//检索
const filterDataDevice = computed(() =>
  tableDataDevice.value.filter((item) =>
    item.deviceName.toLowerCase().includes(searchKeywordDevice.value.toLowerCase()),
  ),
);
const filterDataVariable = computed(() =>
  tableDataVariable.value.filter((item) =>
    item.tagName.toLowerCase().includes(searchKeywordVariable.value.toLowerCase()),
  ),
);

watchEffect(async () => {
  const { id } = collectionMenuStore.currentCollectionRow;
  await nextTick();
  if (collectionMenuStore.currentCollectionRow.path === 'collection-opc-da') {
    await getTableDataDaServer();
  }
});

//查看连接
const viewDialogConnections = async () => {
  dialogType.value = 'viewConnections';
  editRows.value = {};
  activeDialogComponent.value = UpsertOpcdaConnectionDialog;
  dialogVisible.value = true;
};

//创建设备
const createDialogDevice = async () => {
  dialogType.value = 'create';
  editRows.value = {};
  activeDialogComponent.value = AddOrEditOpcdaDialog;
  dialogVisible.value = true;
};
//编辑设备
const editDialogDevice = async (row) => {
  dialogType.value = 'edit';
  editRows.value = row;
  activeDialogComponent.value = AddOrEditOpcdaDialog;
  dialogVisible.value = true;
};

//添加变量
const createDialogVariable = async () => {
  dialogType.value = 'createVariable';
  editRows.value = {};
  activeDialogComponent.value = AddOpcdaVariableDialog;
  dialogVisible.value = true;
};
//编辑变量
const editDialogVariable = () => {
  dialogType.value = 'editOPCDA';
  editRows.value = selectRowsVariable.value[0];
  activeDialogComponent.value = EditOpcuaOrOpcdaVariableDialog;
  dialogVisible.value = true;
};

// 确认及取消设备及变量
const handleConfirm = async (data) => {
  switch (dialogType.value) {
    case 'create':
      const createRestful = await addDaDeviceServer({ ...data, connectName: currentConnection.value });
      if (createRestful?.errorCode === 0) {
        ElMessage.success(t('createSuccess'));
        await getTableDataDevice();
      }
      break;
    case 'edit':
      const editRestful = await editDaDeviceServer({ ...data, connectName: currentConnection.value });
      if (editRestful?.errorCode === 0) {
        ElMessage.success(t('editSuccess'));
        await getTableDataDevice();
        // 修改后最新的数据给currentRow赋值
        const tempCurrentRow = tableDataDevice.value.find((item) => item.deviceID === currentRow.value.deviceID);
        handleTableRowClick(tempCurrentRow);
      }
      break;
    case 'viewConnections':
      await getTableDataDaServer();
      break;
    case 'createVariable':
      const restful = await addDaVariablesServer({ ...currentRow.value, addData: data });
      if (restful?.errorCode === 0) {
        ElMessage.success(t('addSuccess'));
        await getTableDataVariable();
      }
      break;
    case 'editOPCDA':
      const editOPCDARestful = await editDaVariablesServer({ deviceId: currentRow.value.id, editData: data });
      if (editOPCDARestful?.errorCode === 0) {
        ElMessage.success(t('editSuccess'));
        await getTableDataVariable();
      }
      break;
    default:
      break;
  }
  dialogVisible.value = false;
};

// 复选框选中的行的数据改变
const handleSelectionChangeDevice = (val) => {
  selectRowsDevice.value = val;
};
const handleSelectionChangeVariable = (val) => {
  selectRowsVariable.value = val;
};
// 设备选择后枚举出变量信息
const handleTableRowClick = (val) => {
  currentRow.value = { ...val };
  selectRowsVariable.value = [];
  getTableDataVariable();
};

//删除
const handleDeleteDevice = async (delRow) => {
  await useConfirm(`${t(`sureForSelectRow`, { length: delRow.length })}`, t('sureForDelete'));
  const idArr = delRow.map((row) => row.id);
  const restful = await delDaDeviceServer({ idArr });
  if (restful?.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableDataDevice();
  }
};
const handleDeleteVariable = async (delRow) => {
  await useConfirm(`${t(`sureForSelectRow`, { length: delRow.length })}`, t('sureForDelete'));
  const idArr = delRow.map((row) => row.tagID);
  const restful = await delDaVariablesServer({ idArr });
  if (restful?.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableDataVariable();
  }
};
/**
 * @function selectedChange
 * @description 切换数据源
 * @returns null
 */
const selectedChange = () => {
  currentRow.value = {};
  selectRowsVariable.value = [];
  selectRowsDevice.value = [];
  tableDataDevice.value = [];
  tableDataVariable.value = [];
  getTableDataDevice();
};
//更新数据
const getTableDataDevice = async () => {
  const data = await getDaDeviceServer({ connectName: currentConnection.value });
  if (data) {
    tableDataDevice.value = data.map((item) => {
      return {
        ...item,
        reconnectInterval: item?.reconnectInterval ? item.reconnectInterval / 1000 : 0,
        maxReconncetInterval: item?.maxReconncetInterval
          ? parseFloat((item.maxReconncetInterval / (60 * 60 * 1000)).toFixed(4))
          : 0,
      };
    });
  }
};
const getTableDataVariable = async () => {
  const result = await getDaVariablesServer(currentRow.value);
  if (result) {
    tableDataVariable.value = result;
  }
};
const getTableDataDaServer = async () => {
  const result = await getDaServer();
  if (result) {
    connectionsOptions.value = result.map((item) => ({
      value: item.name,
      label: item.name,
      redundancyStyle: item.redundancyStyle,
    }));
  }
};
//导出
const exportHandle = async () => {
  const daVars = selectRowsVariable.value.map((row) => row.tagID);
  const restful = await daExportVarsServer({ ...currentRow.value, daVars });
  if (restful.errorCode === 0) {
    const { data } = restful;
    const downlandFiles = [
      {
        url: data,
        fileName: data.split('/')[data.split('/').length - 1],
      },
    ];
    await batchZIPDownloadHandle(downlandFiles);
    ElMessage.success(t('exportSuccess'));
  }
};
const exceedHandle = (files) => {
  uploadRef.value?.clearFiles();
  const file = files[0];
  file.uuid = genFileId();
  uploadRef.value?.handleStart(file);
};
// 文件上传
const fileChange = debounce(async (file, files) => {
  fileList.value = files;
  await submitUpload();
}, 1000);
const submitUpload = async () => {
  const formData = new FormData();
  formData.append('projectId', collectionMenuStore.currentCollectionEngineer.guid);
  formData.append('deviceName', currentRow.value?.opcServerName);
  formData.append('deviceId', currentRow.value?.deviceID);
  formData.append('fileType', 'csv');
  formData.append('systemType', 0);
  formData.append('uploadDatas', fileList.value[0].raw);
  formData.append('encoding', encodingData.value);
  const res = await daImportVarsServer(formData);
  if (res.errorCode === 0) {
    ElMessage.success(t('importSuccess'));
  }
  fileList.value = [];
  await getTableDataVariable();
  fileUploadSuccess();
};
const fileUploadSuccess = () => {
  uploadRef.value?.clearFiles();
};
const fileUploadError = () => {
  uploadRef.value?.clearFiles();
};
const handleSelectFile = (encoding) => {
  encodingData.value = encoding;
  uploadTrigger.value?.$el?.click();
};
</script>

<template>
  <header class="header-inline">
    <template v-for="(item, index) in collectionMenuStore.currentCollectionTitle" :key="index">
      <div>
        <span class="text">{{ item }}</span>
        <span class="diagonal-divider" v-if="index < collectionMenuStore.currentCollectionTitle.length - 1"></span>
      </div>
    </template>
  </header>
  <!-- 连接 -->
  <div class="connections-list mb-20">
    <el-select v-model="currentConnection" :readonly="true" style="max-width: 200px" @change="selectedChange">
      <el-option v-for="row of connectionsOptions" :key="row.value" :label="row.label" :value="row.value"></el-option>
    </el-select>
    <el-button type="primary" @click="viewDialogConnections">
      <el-icon class="mr-5">
        <IEpTakeawayBox />
      </el-icon>
      {{ t('connectionsManager') }}
    </el-button>
  </div>
  <!-- 设备 -->
  <div class="operate-list mb-20">
    <div class="button-list-con">
      <el-button type="primary" @click="createDialogDevice" :disabled="!currentConnection.length || daReduncyFlag">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createOPCDA') }}
      </el-button>
      <el-button
        :disabled="!selectRowsDevice.length || daReduncyFlag"
        type="danger"
        @click="handleDeleteDevice(selectRowsDevice)"
      >
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
    </div>
    <div class="search-box">
      <el-input
        v-model="searchKeywordDevice"
        :placeholder="t('plsInputKeywordSearch')"
        :suffix-icon="Search"
        class="search-input"
        clearable
        size="default"
      />
    </div>
  </div>
  <CustomStyleTable
    max-height="calc(50vh - 160px)"
    :tableData="filterDataDevice"
    :pageSizes="pageSizes"
    class="table-custom"
    rowKey="id"
    @selectionChange="handleSelectionChangeDevice"
    @tableRowClick="handleTableRowClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('deviceName')" align="left" prop="deviceName" show-overflow-tooltip />
    <el-table-column label="ID" align="left" prop="id" show-overflow-tooltip />
    <el-table-column :label="t('description')" align="left" prop="description" show-overflow-tooltip />
    <el-table-column :label="t('connectionsName')" align="left" prop="connectName" show-overflow-tooltip />
    <el-table-column :label="t('updateFrequencyMs')" align="left" prop="updateFrequency" show-overflow-tooltip />
    <el-table-column :label="t('operate')" align="center" width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link type="primary" @click="editDialogDevice(row)" :disabled="daReduncyFlag">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="handleDeleteDevice([row])" :disabled="daReduncyFlag">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
          </el-link>
        </div>
      </template>
    </el-table-column>
  </CustomStyleTable>
  <!-- 变量 -->
  <div class="operate-list my-20">
    <div class="button-list-con">
      <el-button
        :disabled="!Object.keys(currentRow).length || daReduncyFlag"
        type="primary"
        @click="createDialogVariable"
      >
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('add') }}
      </el-button>
      <el-button
        :disabled="selectRowsVariable.length !== 1 || daReduncyFlag"
        type="primary"
        @click="editDialogVariable"
      >
        <el-icon class="mr-5">
          <IEpEditPen />
        </el-icon>
        {{ t('edit') }}
      </el-button>
      <el-button
        :disabled="!selectRowsVariable.length || daReduncyFlag"
        type="danger"
        @click="handleDeleteVariable(selectRowsVariable)"
      >
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-button @click="encodingSelectVisible = true" :disabled="!Object.keys(currentRow).length || daReduncyFlag">
        <el-icon class="mr-5">
          <IEpDownload />
        </el-icon>
        {{ t('import') }}
      </el-button>
      <el-upload
        ref="uploadRef"
        v-show="false"
        :auto-upload="false"
        :before-upload="() => false"
        :file-list="fileList"
        :limit="1"
        :on-change="fileChange"
        :on-error="fileUploadError"
        :on-exceed="exceedHandle"
        :on-success="fileUploadSuccess"
        :show-file-list="false"
        accept=".csv"
        class="ml-10"
        name="uploadFiles"
      >
        <template #trigger>
          <el-button ref="uploadTrigger" :disabled="!Object.keys(currentRow).length || daReduncyFlag">
            <el-icon class="mr-5">
              <IEpDownload />
            </el-icon>
            {{ t('import') }}
          </el-button>
        </template>
      </el-upload>
      <el-button :disabled="!selectRowsVariable.length" @click="exportHandle">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
    </div>
    <div class="search-box">
      <el-input
        v-model="searchKeywordVariable"
        :placeholder="t('plsInputKeywordSearch')"
        :suffix-icon="Search"
        class="search-input"
        clearable
        size="default"
      />
    </div>
  </div>
  <CustomStyleTable
    max-height="calc(50vh - 160px)"
    :tableData="filterDataVariable"
    :pageSizes="pageSizes"
    class="table-custom"
    rowKey="tagID"
    @selectionChange="handleSelectionChangeVariable"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('variableName')" align="left" prop="tagName" show-overflow-tooltip />
    <el-table-column :label="t('registerName')" align="left" prop="regName" show-overflow-tooltip />
    <el-table-column :label="t('variableType')" align="left" prop="TagDataType" show-overflow-tooltip sortable />
  </CustomStyleTable>
  <component
    :is="activeDialogComponent"
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    v-model:tableDataVariable="tableDataVariable"
    v-model:currentConnection="currentConnection"
    :rowData="{ ...editRows, dialogType }"
    @confirm="handleConfirm"
    :currentRow="currentRow"
  />
  <CsvEncodingSelect v-model="encodingSelectVisible" @select-file="handleSelectFile"></CsvEncodingSelect>
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
.connections-list {
  display: flex;
  flex-direction: row;
  .el-button {
    border-radius: 4px;
    margin-left: 10px;
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
