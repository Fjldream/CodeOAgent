<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { ElMessage, genFileId } from 'element-plus';
import { useConfirm } from '@/composables/useConfirm.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { debounce } from '@/utils/commonUtils.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import AddOrEditDeviceDialog from '@/views/Main/CollectionView/CollectionDialogView/AddOrEditDeviceDialog.vue';
import CsvEncodingSelect from '@/views/Main/CollectionView/CollectionDialogView/CsvEncodingSelect.vue';
import {
  createDeviceServer,
  deleteDeviceServer,
  deleteDeviceValidateServer,
  editDeviceServer,
  exportDevicesServer,
  getDeviceServer,
  importDevicesServer,
  moveDeviceServer,
} from '@/api/allRequest/collectionAPI.js';

const { t } = useI18n();

const collectionMenuStore = useCollectionMenuStore();
const maxHeight = ref('calc(100vh - 190px)');
const tableData = ref([]);
const uploadRef = useTemplateRef('uploadRef');
const fileList = ref([]);
// 响应式列表及选中行
const dialogVisible = ref(false);
const dialogType = ref('');
const title = ref('');
// 搜索数据
const searchKeyword = ref('');
// 复选框选中行
const selectRows = ref([]);
const editRow = ref({});
const loading = ref(false);
const moveVisible = ref(false);
// modified by  jinlong.feng at 1119 修复设备页面默认弹出导入窗口
const encodingSelectVisible = ref(false);
// end
const encodingData = ref('utf-8');
const deviceGroupData = collectionMenuStore.collectionMenuList.filter((item) => item.id == 'deviceRoot');
const uploadTrigger = ref(null);
function findChildGroupIds(root, targetId) {
  if (root.id === targetId || root.actualId === targetId) {
    const ids = [];
    function collectIds(node) {
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          ids.push(child.actualId);
          collectIds(child);
        }
      }
    }
    collectIds(root);
    return ids;
  }

  if (root.children && Array.isArray(root.children)) {
    for (const child of root.children) {
      const result = findChildGroupIds(child, targetId);
      if (result !== null) {
        return result;
      }
    }
  }
  return null;
}
//检索
const filterData = computed(() => {
  let targetId = collectionMenuStore.currentCollectionRow?.actualId || collectionMenuStore.currentCollectionRow?.id;
  let childIds = findChildGroupIds(collectionMenuStore.collectionMenuList[0], targetId);
  childIds && childIds.push(targetId);
  return tableData.value.filter((item) => {
    return (
      childIds.includes(String(item.deviceGroupId)) &&
      item.deviceName.toLowerCase().includes(searchKeyword.value.toLowerCase())
    );
  });
});
watchEffect(async () => {
  const { id } = collectionMenuStore.currentCollectionRow;
  await nextTick(async () => {
    if (collectionMenuStore.currentCollectionRow.path === 'collection-daq-equipment') {
      await getTableData();
    }
  });
});
//创建
const createDialog = async () => {
  dialogType.value = 'create';
  editRow.value = {};
  title.value = t('createDevice');
  dialogVisible.value = true;
};
//编辑
const editDialog = async (row) => {
  dialogType.value = 'edit';
  editRow.value = row;
  title.value = t('editDevice');
  dialogVisible.value = true;
};
// 确认及取消
const handleConfirm = async (data) => {
  if (dialogType.value === 'create') {
    const restful = await createDeviceServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
    }
  } else {
    const restful = await editDeviceServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
    }
  }
  await getTableData();
  dialogVisible.value = false;
};

//打开移动弹窗
const openMove = async () => {
  moveVisible.value = true;
};

/**
 * @function handleCancelDialog
 * @description 表单弹窗取消事件
 * @return null
 */
function handleCancelDialog() {
  dialogVisible.value = false;
}

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};
//删除
const handleDelete = async (delRow) => {
  await useConfirm(`${t(`sureForSelectRow`, { length: delRow.length })}`, t('sureForDelete'));
  const deviceIds = delRow.map((row) => row.deviceId);
  const result = await deleteDeviceValidateServer({ deviceIds });
  if (result.errorCode === 0) {
    if (result.data.length > 0) await useConfirm(t('collectDelDevTooltip', { device: result.data.join(',') }));
    const restful = await deleteDeviceServer({ deviceIds });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      await getTableData();
    }
  }
};

const getTableData = async () => {
  const data = await getDeviceServer();
  if (data) {
    tableData.value = data.map((item) => {
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

const refreshData = async () => {
  await getTableData();
};

//导出
const exportHandle = async () => {
  const deviceNames = selectRows.value.map((row) => row.deviceName);
  const restful = await exportDevicesServer({ deviceNames });
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
  formData.append('devicesFile', fileList.value[0].raw);
  formData.append('projectId', collectionMenuStore.currentCollectionEngineer.guid);
  formData.append('systemType', '1');
  formData.append('fileType', 'csv');
  formData.append('encoding', encodingData.value);
  const res = await importDevicesServer(formData);
  if (res.errorCode === 0) {
    ElMessage.success(t('importSuccess'));
  }
  fileList.value = [];
  await getTableData();
  fileUploadSuccess();
};
const fileUploadSuccess = () => {
  uploadRef.value?.clearFiles();
};
const fileUploadError = () => {
  uploadRef.value?.clearFiles();
};
const handleMove = async (row) => {
  const toMoveRows = selectRows.value.map((item) => item.deviceId);
  let body = { deviceIds: toMoveRows, targetDeviceGroupId: row.actualId ? parseInt(row.actualId) : 'root' };
  let res = await moveDeviceServer(body);
  if (res?.errorCode === 0) {
    ElMessage.success(t('operateSuccess'));
    await getTableData();
  }
  moveVisible.value = false;
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
  <div class="operate-list mb-20">
    <div class="button-list-con">
      <el-button type="primary" @click="createDialog">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createDevice') }}
      </el-button>
      <el-button :disabled="!selectRows.length" type="danger" @click="handleDelete(selectRows)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-button @click="encodingSelectVisible = true">
        <el-icon class="mr-5">
          <IEpDownload />
        </el-icon>
        {{ t('import') }}
      </el-button>
      <el-upload
        ref="uploadRef"
        v-show="false"
        :auto-upload="false"
        :before-upload="() => {}"
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
          <el-button ref="uploadTrigger">
            <el-icon class="mr-5">
              <IEpDownload />
            </el-icon>
            {{ t('import') }}
          </el-button>
        </template>
      </el-upload>
      <el-button :disabled="!selectRows.length" @click="exportHandle">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
      <el-button :disabled="!selectRows.length" @click="openMove">
        <el-icon class="mr-5">
          <IEpSoldOut />
        </el-icon>
        {{ t('move') }}
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
    rowKey="deviceId"
    @selectionChange="handleSelectionChange"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('deviceName')" align="center" prop="deviceName" show-overflow-tooltip />
    <el-table-column label="ID" align="center" prop="deviceId" show-overflow-tooltip />
    <el-table-column :label="t('description')" align="center" prop="description" show-overflow-tooltip />
    <el-table-column :label="t('belongGroup')" align="center" prop="deviceGroup" show-overflow-tooltip />
    <el-table-column :label="t('deviceActive')" align="center" prop="active" show-overflow-tooltip sortable>
      <template #default="{ row }">
        <span> {{ row.active ? t('can') : t('no') }}</span>
      </template>
    </el-table-column>
    <el-table-column :label="t('driverName')" align="center" prop="driverName" show-overflow-tooltip />
    <el-table-column :label="t('deviceAddress')" align="center" prop="devAddress" show-overflow-tooltip />
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

  <AddOrEditDeviceDialog
    v-if="dialogVisible"
    v-model:dialog-visible="dialogVisible"
    :rowData="editRow"
    :dialogType="dialogType"
    :title="title"
    @confirm="handleConfirm"
    @update:dialogVisible="handleCancelDialog"
  />

  <LoadingComponent v-if="loading" :loading="loading" :loading-text="t('fileReading')" />
  <MovePlaneDialog
    v-if="moveVisible"
    v-model:dialogVisible="moveVisible"
    :pageTreeData="deviceGroupData"
    @confirm="handleMove"
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
