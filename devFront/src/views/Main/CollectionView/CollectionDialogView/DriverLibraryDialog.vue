<script setup>
import { ElMessage, genFileId } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { getDriverListServer, installDriverServer, uninstallDriverServer } from '@/api/allRequest/collectionAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore';
import { debounce } from '@/utils/commonUtils.js';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import DriverSettingDialog from './DriverSettingDialog.vue';

const { t } = useI18n();
const collectionMenuStore = useCollectionMenuStore();
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: () => true,
  },
});
nextTick(async () => {
  await getDriverList();
});
const fileList = ref([]);
const uploadRef = useTemplateRef('uploadRef');
const driverData = ref([]);
// emit事件定义
const emits = defineEmits('update:dialogVisible', 'confirm');
const selectRows = ref([]);
const driverSettingVisible = ref(false);

// 文件上传
const fileChange = debounce(async (file, files) => {
  fileList.value = files;

  await submitUpload();
}, 1000);

const submitUpload = async () => {
  const formData = new FormData();
  for (const item of fileList.value) {
    formData.append('driverFile', item.raw);
  }
  const res = await installDriverServer(formData);
  if (res.errorCode === 0) {
    ElMessage.success(t('installSuccess'));
    fileList.value = [];
    await getDriverList();
    fileUploadSuccess();
  }
};
const fileUploadSuccess = (file) => {
  uploadRef.value?.clearFiles();
};
const fileUploadError = (file) => {
  uploadRef.value?.clearFiles();
};
//获取设备列表
const getDriverList = async () => {
  let data = await getDriverListServer();
  if (data) {
    data = data.map((item) => {
      item.ID = `${item.DriverName}_${item.DeviceSeries}_${item.DriverVersion}`;
      return item;
    });
    driverData.value = data;
  }
};
/**
 * @function handleSelectionChange
 * @description 处理表格选择改变事件
 * @param val
 * @return null
 */
function handleSelectionChange(val) {
  selectRows.value = val;
}

const exceedHandle = (files) => {
  uploadRef.value?.clearFiles();
  const file = files[0];
  file.uuid = genFileId();

  uploadRef.value?.handleStart(file);
};
/**
 * @function handleRecycleOeration
 * @description 删除 恢复页面事件
 * @param operate
 */
async function handleDriverOeration(operate) {
  if (!selectRows.value.length) {
    return;
  }
  if (operate === 'UninstallDriver') {
    await useConfirm(`${t(`sureForUninstallDriver`)}`, t('sureForDelete'));
    const restful = await uninstallDriverServer({ ...selectRows.value[0] });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      await getDriverList();
    }
  } else if (operate === 'ConfirmDriver') {
    emits('confirm', selectRows.value[0]);
  }
}
const emitClose = () => {
  emits('update:dialogVisible', false);
  emits('close');
};
async function handleDriverSetting() {
  driverSettingVisible.value = true;
}
function handleDialogVisible(val) {
  driverSettingVisible.value = val;
}
</script>
<template>
  <el-dialog
    :model-value="dialogVisible"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    :draggable="true"
    :title="t('driverLibrary')"
    align-center
    class="custom-dialog"
    width="1440"
    @update:modelValue="emits('update:dialogVisible', $event)"
  >
    <main>
      <div class="tool-left" v-if="!collectionMenuStore.currentCollectionEngineer.sysPlatform">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :before-upload="() => false"
          :file-list="fileList"
          :limit="1"
          :on-change="fileChange"
          :on-error="fileUploadError"
          :on-exceed="exceedHandle"
          :on-success="fileUploadSuccess"
          :show-file-list="false"
          accept=".zip"
          class="ml-10"
          name="uploadFiles"
        >
          <el-button type="primary" @click="handleDriverOeration('installDriver')">
            <el-icon class="mr-5">
              <IEpDownload />
            </el-icon>
            {{ t('installDriver') }}
          </el-button>
        </el-upload>
        <el-button type="danger" :disabled="selectRows.length !== 1" @click="handleDriverOeration('UninstallDriver')">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('UninstallDriver') }}
        </el-button>
        <el-button @click="handleDriverSetting" :disabled="selectRows.length !== 1">
          <el-icon class="mr-5">
            <IEpOperation />
          </el-icon>
          {{ t('driverSetting') }}
        </el-button>
      </div>
      <div class="pt-12">
        <CustomStyleTable
          :showPagination="false"
          :tableData="driverData"
          @selectionChange="handleSelectionChange"
          rowKey="ID"
        >
          <el-table-column align="center" type="selection" width="55" />
          <el-table-column :label="t('driverName')" align="center" prop="DriverName" show-overflow-tooltip />
          <el-table-column :label="t('description')" align="center" prop="DriverDesc" show-overflow-tooltip />
          <el-table-column :label="t('osType')" align="center" prop="OsType" show-overflow-tooltip />
          <el-table-column :label="t('deviceSeries')" align="center" prop="DeviceSeries" show-overflow-tooltip />
          <el-table-column :label="t('driverCompany')" align="center" prop="DriverCompany" show-overflow-tooltip />
          <el-table-column :label="t('driverType')" align="center" prop="DriverType" show-overflow-tooltip />
          <el-table-column :label="t('modifyTime')" align="center" prop="LastDriverModifyTime" show-overflow-tooltip />
          <el-table-column :label="t('version')" align="center" prop="DriverVersion" show-overflow-tooltip />
        </CustomStyleTable>
      </div>
    </main>
    <div class="tool-right">
      <el-button @click="emitClose">{{ t('cancle') }}</el-button>
      <el-button
        v-if="collectionMenuStore.currentCollectionEngineer.sysPlatform"
        type="primary"
        :disabled="selectRows.length !== 1"
        @click="handleDriverOeration('ConfirmDriver')"
      >
        {{ t('define') }}
      </el-button>
    </div>
  </el-dialog>
  <DriverSettingDialog
    :dialogVisible="driverSettingVisible"
    @update:dialogVisible="handleDialogVisible($event)"
    :driverInfo="selectRows[0]"
  ></DriverSettingDialog>
</template>
<style lang="scss" scoped>
.el-dialog {
  main {
    min-height: 650px;
    max-height: 650px;
    padding-bottom: 20px;

    span {
      display: inline-block;
      margin-bottom: 10px;
    }

    :deep(.el-table) {
      max-height: 600px !important;

      .el-table__inner-wrapper {
        height: 600px !important;
      }
    }
  }
  .tool-left {
    display: flex;
    flex-direction: row;
    justify-content: left;
    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }
  .tool-right {
    display: flex;
    flex-direction: row;
    justify-content: right;

    .el-button {
      width: 80px;
    }
  }
}
</style>
