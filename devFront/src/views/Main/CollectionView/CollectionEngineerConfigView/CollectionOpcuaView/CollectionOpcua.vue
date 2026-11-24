<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import {
  uaAddDeviceServer,
  uaDelDevicesServer,
  uaDevicesServer,
  uaEditDeviceServer,
  getUaVarsListServer,
  uaAddVariablesServer,
  uaDelVarsServer,
  exportUaVarsServer,
  uaImportVarsServer,
  uaEditVariablesServer,
} from '@/api/allRequest/collectionAPI.js';
import { debounce, pascakToCamel } from '@/utils/commonUtils.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { useConfirm } from '@/composables/useConfirm.js';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import AddOrEditOpcuaDialog from '@/views/Main/CollectionView/CollectionDialogView/AddOrEditOpcuaDialog.vue';
import AddOpcuaVariableDialog from '@/views/Main/CollectionView/CollectionDialogView/AddOpcuaVariableDialog.vue';
import EditOpcuaOrOpcdaVariableDialog from '@/views/Main/CollectionView/CollectionDialogView/EditOpcuaOrOpcdaVariableDialog.vue';
import CsvEncodingSelect from '@/views/Main/CollectionView/CollectionDialogView/CsvEncodingSelect.vue';

const { t } = useI18n();
const uploadRef = useTemplateRef('uploadRef');
const fileList = ref([]);
const collectionMenuStore = useCollectionMenuStore();
const maxHeight = ref('calc(50vh - 134px)');
const pageSizes = ref([10, 20, 30, 50, 100, 200, 2000]);
const tableDataDevice = ref([]);
const tableDataVariable = ref([]);
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
//检索
const filterDataDevice = computed(() =>
  tableDataDevice.value.filter((item) =>
    item.opcServerName.toLowerCase().includes(searchKeywordDevice.value.toLowerCase()),
  ),
);
const filterDataVariable = computed(() =>
  tableDataVariable.value.filter((item) =>
    item.TagName.toLowerCase().includes(searchKeywordVariable.value.toLowerCase()),
  ),
);

watchEffect(async () => {
  const { id } = collectionMenuStore.currentCollectionRow;
  await nextTick(async () => {
    if (collectionMenuStore.currentCollectionRow.path === 'collection-opc-ua') {
      await getTableDataDevice();
    }
  });
});
//创建设备
const createDialogDevice = async () => {
  dialogType.value = 'create';
  editRows.value = {};
  activeDialogComponent.value = AddOrEditOpcuaDialog;
  dialogVisible.value = true;
};
//编辑设备
const editDialogDevice = async (row) => {
  dialogType.value = 'edit';
  editRows.value = row;
  activeDialogComponent.value = AddOrEditOpcuaDialog;
  dialogVisible.value = true;
};

//添加变量
const createDialogVariable = async () => {
  dialogType.value = 'createVariable';
  editRows.value = {};
  activeDialogComponent.value = AddOpcuaVariableDialog;
  dialogVisible.value = true;
};
//编辑变量
const editDialogVariable = () => {
  dialogType.value = 'editOPCUA';
  // 接口原因需要将大驼峰变为小驼峰
  Object.keys(selectRowsVariable.value[0]).forEach((key) => {
    // 如果是TagDataType则不需要转换
    if (key === 'TagDataType') {
      return;
    }
    editRows.value[pascakToCamel(key)] = selectRowsVariable.value[0][key];
  });
  activeDialogComponent.value = EditOpcuaOrOpcdaVariableDialog;
  dialogVisible.value = true;
};

// 确认及取消设备及变量
const handleConfirm = async (data) => {
  switch (dialogType.value) {
    case 'create':
      const createRestful = await uaAddDeviceServer({ ...data });
      if (createRestful?.errorCode === 0) {
        await getTableDataDevice();
        ElMessage.success(t('createSuccess'));
      }
      break;
    case 'edit':
      const editRestful = await uaEditDeviceServer({ ...data });
      if (editRestful?.errorCode === 0) {
        await getTableDataDevice();
        ElMessage.success(t('editSuccess'));
      }
      break;
    case 'createVariable':
      const restful = await uaAddVariablesServer({ ...currentRow.value, addData: data });
      if (restful?.errorCode === 0) {
        await getTableDataVariable();
        ElMessage.success(t('addSuccess'));
      }
      break;
    case 'editOPCUA':
      const editOPCDARestful = await uaEditVariablesServer({
        deviceID: currentRow.value.deviceID,
        deviceName: currentRow.value.opcServerName,
        editData: [data],
      });
      if (editOPCDARestful?.errorCode === 0) {
        await getTableDataVariable();
        ElMessage.success(t('editSuccess'));
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
  const deviceIds = delRow.map((row) => row.deviceID);
  const restful = await uaDelDevicesServer({ deviceIds });
  if (restful?.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableDataDevice();
  }
};
const handleDeleteVariable = async (delRow) => {
  await useConfirm(`${t(`sureForSelectRow`, { length: delRow.length })}`, t('sureForDelete'));
  const vars = delRow.map((row) => row.TagName);
  const restful = await uaDelVarsServer({ ...currentRow.value, vars });
  if (restful?.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableDataVariable();
  }
};

//更新数据
const getTableDataDevice = async () => {
  const data = await uaDevicesServer();
  if (data) {
    tableDataDevice.value = data.map((item) => {
      return {
        ...item,
        reconnectTime: item?.reconnectTime ? item.reconnectTime / 1000 : 0,
        recoverTime: item?.recoverTime ? parseFloat((item.recoverTime / (60 * 60 * 1000)).toFixed(4)) : 0,
      };
    });
  }
};
const getTableDataVariable = async () => {
  const result = await getUaVarsListServer(currentRow.value);
  if (result) {
    tableDataVariable.value = result;
  }
};

//导出
const exportHandle = async () => {
  const uaDevs = selectRowsVariable.value.map((row) => row.TagName);
  const restful = await exportUaVarsServer({ ...currentRow.value, uaDevs });
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
  formData.append('usVarsFile', fileList.value[0].raw);
  formData.append('encoding', encodingData.value);
  const res = await uaImportVarsServer(formData);
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
// 读写类型转换
const readWriteTypeName = (AccessType) => {
  const AccessTypeList = [
    {
      id: 0,
      text: t('onlyRead'),
      selected: true,
    },
    {
      id: 1,
      text: t('onlyWrite'),
    },
    {
      id: 2,
      text: t('readWrite'),
    },
  ];
  const findAccessType = AccessTypeList.find((item) => item.id === AccessType);
  if (findAccessType) {
    return findAccessType.text;
  } else {
    return '';
  }
};
const handleSelectFile = (encoding) => {
  encodingData.value = encoding;
  uploadTrigger.value?.$el?.click();
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
  <!-- 设备 -->
  <div class="operate-list mb-20">
    <div class="button-list-con">
      <el-button type="primary" @click="createDialogDevice">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createOPCUA') }}
      </el-button>
      <el-button :disabled="!selectRowsDevice.length" type="danger" @click="handleDeleteDevice(selectRowsDevice)">
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
      <el-button style="width: 36px" @click="refreshData">
        <el-icon class="mr-5">
          <IEpRefresh />
        </el-icon>
      </el-button>
    </div>
  </div>
  <CustomStyleTable
    :max-height="maxHeight"
    :tableData="filterDataDevice"
    :pageSizes="pageSizes"
    class="table-custom"
    rowKey="deviceID"
    @selectionChange="handleSelectionChangeDevice"
    @tableRowClick="handleTableRowClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('UAServerName')" align="left" prop="opcServerName" show-overflow-tooltip />
    <el-table-column label="ID" align="left" prop="deviceID" show-overflow-tooltip />
    <el-table-column :label="t('serverUrl')" align="left" prop="url" show-overflow-tooltip />
    <el-table-column :label="t('maxRecoverTime')" align="left" prop="recoverTime" show-overflow-tooltip sortable />
    <el-table-column
      :label="t('retryConnectionTime')"
      align="left"
      prop="reconnectTime"
      show-overflow-tooltip
      sortable
    />
    <el-table-column
      :label="t('samplingIntervalMs')"
      align="left"
      prop="collectInterval"
      show-overflow-tooltip
      sortable
    />
    <el-table-column :label="t('operate')" align="center" width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link type="primary" @click="editDialogDevice(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="handleDeleteDevice([row])">
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
      <el-button :disabled="!Object.keys(currentRow).length" type="primary" @click="createDialogVariable">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('add') }}
      </el-button>
      <el-button :disabled="selectRowsVariable.length !== 1" type="primary" @click="editDialogVariable">
        <el-icon class="mr-5">
          <IEpEditPen />
        </el-icon>
        {{ t('edit') }}
      </el-button>
      <el-button :disabled="!selectRowsVariable.length" type="danger" @click="handleDeleteVariable(selectRowsVariable)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-button @click="encodingSelectVisible = true" :disabled="!Object.keys(currentRow).length">
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
          <el-button ref="uploadTrigger" :disabled="!Object.keys(currentRow).length">
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
      <el-button style="width: 36px" @click="refreshData">
        <el-icon class="mr-5">
          <IEpRefresh />
        </el-icon>
      </el-button>
    </div>
  </div>
  <CustomStyleTable
    :max-height="maxHeight"
    :tableData="filterDataVariable"
    :pageSizes="pageSizes"
    class="table-custom"
    rowKey="TagID"
    @selectionChange="handleSelectionChangeVariable"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('name')" align="left" prop="TagName" show-overflow-tooltip />
    <el-table-column :label="t('samplingInterval')" align="left" prop="CollectTimeInterval" show-overflow-tooltip />
    <el-table-column :label="t('dataType')" align="left" prop="TagDataType" show-overflow-tooltip sortable />
    <el-table-column :label="t('readWriteType')" align="left" prop="AccessType" show-overflow-tooltip sortable>
      <template #default="{ row }">
        <span> </span>
        {{ readWriteTypeName(row.AccessType) }}
      </template>
    </el-table-column>
  </CustomStyleTable>
  <component
    :is="activeDialogComponent"
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    v-model:tableDataVariable="tableDataVariable"
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
