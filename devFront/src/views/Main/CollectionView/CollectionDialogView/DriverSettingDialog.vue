<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import {
  exportDriverDependencyServer,
  importDriverDependencyServer,
  getPointMappingListServer,
  importPointMappingFileServer,
  delPointMappingFileServer,
  exportPointMappingServer,
  getDriverMapConfigServer,
  updateProjectDriverServer,
} from '@/api/allRequest/collectionAPI.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { debounce } from '@/utils/commonUtils.js';
import { useTemplateRef } from 'vue';
import { useConfirm } from '@/composables/useConfirm';
import { ElMessage } from 'element-plus';
const { t } = useI18n();
const uploadConfRef = useTemplateRef('uploadConfRef');
const uploadPointRef = useTemplateRef('uploadPointRef');
const driverConfList = ref([]);
const pointMapList = ref([]);
const pointMapDir = ref('');
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: () => true,
  },
  driverInfo: {
    type: Object,
    default: () => {},
  },
});
// emit事件定义
const emits = defineEmits('update:dialogVisible', 'confirm');
const defendencyFileName = ref('');
const defendencyFileNameArr = ref([]);
const pointFileName = ref('');
const tableData = ref([]);
const selectRows = ref([]);
watch(
  () => props.dialogVisible,
  async (oldVal, newVal) => {
    if (!newVal) await initPointerMappingList();
  },
);
async function initPointerMappingList() {
  tableData.value = [];
  defendencyFileName.value = '';
  defendencyFileNameArr.value = [];
  pointMapDir.value = '';
  const params = {
    SysPlatform: props.driverInfo.SysPlatform,
    PlatformType: props.driverInfo.PlatformType,
    DriverVersion: props.driverInfo.DriverVersion,
    ProviderName: props.driverInfo.DriverCompany,
    DriverName: props.driverInfo.DriverName,
  };
  const driverConfigInfo = await getDriverMapConfigServer(params);
  if (driverConfigInfo.errorCode === 0) {
    params.pointMapDir = driverConfigInfo.data.pointMapDir;
    pointMapDir.value = driverConfigInfo.data.pointMapDir;
    defendencyFileNameArr.value = driverConfigInfo.data.defendFile.map((item) => {
      return {
        label: item,
        value: item,
      };
    });
    defendencyFileName.value = driverConfigInfo.data.defendFile[0];
    const res = await getPointMappingListServer(params);
    if (res.errorCode === 0) {
      tableData.value = res.data.map((item, index) => {
        const obj = {
          id: index + 1,
          fileName: item,
        };
        return obj;
      });
    }
  }
}
/**
 * @function handleSelectionChange
 * @description 处理表格选择改变事件
 * @param val
 * @return null
 */
function handleSelectionChange(val) {
  selectRows.value = val;
}
/**
 * @function downloadDriverDependency
 * @description 下载驱动依赖文件
 */
async function downloadDriverDependency() {
  const formData = {
    SysPlatform: props.driverInfo.SysPlatform,
    PlatformType: props.driverInfo.PlatformType,
    DriverVersion: props.driverInfo.DriverVersion,
    ProviderName: props.driverInfo.DriverCompany,
    DriverName: props.driverInfo.DriverName,
    DependFileName: defendencyFileName.value,
  };
  const res = await exportDriverDependencyServer(formData);
  if (res.errorCode === 0) {
    const { data } = res;
    const downlandFiles = [
      {
        url: data,
        fileName: data[0].split('/')[data[0].split('/').length - 1],
      },
    ];
    await batchZIPDownloadHandle(downlandFiles);
    ElMessage.success(t('exportSuccess'));
  }
}
const fileUploadSuccess = () => {
  uploadConfRef.value?.clearFiles();
};
const fileUploadError = () => {
  uploadConfRef.value?.clearFiles();
};
const mapFileUploadSuccess = () => {
  uploadPointRef.value?.clearFiles();
};
const mapFileUploadError = () => {
  uploadPointRef.value?.clearFiles();
};
const fileChange = debounce(async (file, files) => {
  driverConfList.value = files;
  await importDriverDependency();
}, 1000);
const mapFileChange = debounce(async (file, files) => {
  pointMapList.value = files;
  await importPointMappingFile();
}, 1000);
/**
 * @function importDriverDependency
 * @description 导入驱动依赖文件
 */
async function importDriverDependency() {
  const obj = {
    SysPlatform: props.driverInfo.SysPlatform,
    PlatformType: props.driverInfo.PlatformType,
    DriverVersion: props.driverInfo.DriverVersion,
    ProviderName: props.driverInfo.DriverCompany,
    DriverName: props.driverInfo.DriverName,
  };
  const formData = new FormData();
  formData.append('uploadFile', driverConfList.value[0].raw);
  formData.append('driverInfo', JSON.stringify(obj));
  const res = await importDriverDependencyServer(formData);
  if (res.errorCode === 0) {
    ElMessage.success(t('importSuccess'));
  }
  uploadConfRef.value?.clearFiles();
}
/**
 * @function importPointMappingFile
 * @description 导入点位映射
 */
async function importPointMappingFile() {
  const obj = {
    SysPlatform: props.driverInfo.SysPlatform,
    PlatformType: props.driverInfo.PlatformType,
    DriverVersion: props.driverInfo.DriverVersion,
    ProviderName: props.driverInfo.DriverCompany,
    DriverName: props.driverInfo.DriverName,
    PointMapDir: pointMapDir.value,
  };
  const formData = new FormData();
  formData.append('uploadFile', pointMapList.value[0].raw);
  formData.append('driverInfo', JSON.stringify(obj));
  const res = await importPointMappingFileServer(formData);
  if (res.errorCode === 0) {
    ElMessage.success(t('importSuccess'));
    await initPointerMappingList();
  }
  uploadPointRef.value?.clearFiles();
}
/**
 * @function delPointMappingFile
 * @description 删除点位映射
 */
async function delPointMappingFile() {
  await useConfirm(`${t(`sureForSelectRow`, { length: selectRows.value.length })}`, t('sureForDelete'));
  const obj = {
    SysPlatform: props.driverInfo.SysPlatform,
    PlatformType: props.driverInfo.PlatformType,
    DriverVersion: props.driverInfo.DriverVersion,
    ProviderName: props.driverInfo.DriverCompany,
    DriverName: props.driverInfo.DriverName,
    PointMapDir: pointMapDir.value,
    pointFileArr: selectRows.value.map((item) => item.fileName),
  };
  const res = await delPointMappingFileServer(obj);
  if (res.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await initPointerMappingList();
  }
}
/**
 * @function pointMappingFileDownload
 * @description 点位映射表下载
 */
async function pointMappingFileDownload() {
  const formData = {
    SysPlatform: props.driverInfo.SysPlatform,
    PlatformType: props.driverInfo.PlatformType,
    DriverVersion: props.driverInfo.DriverVersion,
    ProviderName: props.driverInfo.DriverCompany,
    DriverName: props.driverInfo.DriverName,
    PointMapDir: pointMapDir.value,
    files: selectRows.value.map((item) => item.fileName),
  };
  const res = await exportPointMappingServer(formData);
  if (res.errorCode === 0) {
    const { data } = res;
    const downlandFiles = data.map((item) => {
      return {
        url: item,
        fileName: item.split('/')[item.split('/').length - 1],
      };
    });
    await batchZIPDownloadHandle(downlandFiles);
    ElMessage.success(t('exportSuccess'));
  }
}
async function handleUpdateProDriver() {
  const formData = {
    sysPlatform: props.driverInfo.SysPlatform,
    osType: props.driverInfo.PlatformType,
    driverName: props.driverInfo.DriverName,
    driverVersion: props.driverInfo.DriverVersion,
    driverCompany: props.driverInfo.DriverCompany,
  };
  const result = await updateProjectDriverServer(formData);
  if (result.errorCode === 0) {
    ElMessage.success(t('updateSuccess'));
  }
}
</script>
<template>
  <el-dialog
    :model-value="dialogVisible"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    :draggable="true"
    :title="t('driverSetting')"
    align-center
    class="custom-dialog"
    width="1080"
    @update:modelValue="emits('update:dialogVisible', $event)"
  >
    <div class="driver-settings-con">
      <div class="title-con">
        <el-divider direction="vertical" />
        <span>{{ t('dependencyFileConf') }}</span>
      </div>
      <div class="dependency-file-con">
        <el-select v-model="defendencyFileName">
          <el-option v-for="item in defendencyFileNameArr" :key="item.value" :value="item.value" :label="item.label">
          </el-option>
        </el-select>
        <el-button :disabled="!defendencyFileName" @click="downloadDriverDependency">
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('download') }}
        </el-button>
        <el-upload
          ref="uploadConfRef"
          :auto-upload="false"
          :before-upload="() => false"
          :file-list="driverConfList"
          :limit="1"
          :on-change="fileChange"
          :on-error="fileUploadError"
          :on-success="fileUploadSuccess"
          :show-file-list="false"
          class="ml-10"
          name="uploadFiles"
        >
          <el-button type="primary" :disabled="!defendencyFileName">
            <el-icon class="mr-5">
              <IEpDocumentAdd />
            </el-icon>
            {{ t('upload') }}
          </el-button>
        </el-upload>
      </div>
      <div class="title-con">
        <el-divider direction="vertical" />
        <span>{{ t('pointMappingConf') }}</span>
      </div>
      <div class="point-mapping-con">
        <div class="point-btn-list">
          <div class="btn-list-con">
            <el-upload
              ref="uploadPointRef"
              :auto-upload="false"
              :before-upload="() => false"
              :file-list="pointMapList"
              :limit="1"
              :on-change="mapFileChange"
              :on-error="mapFileUploadError"
              :on-success="mapFileUploadSuccess"
              :show-file-list="false"
              accept=".json,.csv,xlsx"
              class="ml-10 mr-12"
              name="uploadFiles"
            >
              <el-button :disabled="!pointMapDir">
                <el-icon class="mr-5"> <IEpDownload /> </el-icon>{{ t('import') }}
              </el-button>
            </el-upload>
            <el-button :disabled="selectRows.length == 0" @click="pointMappingFileDownload()">
              <el-icon class="mr-5"> <IEpUpload /> </el-icon>{{ t('export') }}
            </el-button>
            <el-button type="danger" :disabled="selectRows.length == 0" @click="delPointMappingFile()">
              <el-icon class="mr-5"> <IEpDelete /> </el-icon>{{ t('delete') }}
            </el-button>
          </div>
          <div class="search-con">
            <el-input
              v-model="pointFileName"
              :placeholder="t('plsInputKeywordSearch')"
              :suffix-icon="Search"
            ></el-input>
            <el-button>
              <el-icon> <IEpRefresh /> </el-icon>
            </el-button>
            <el-button style="width: 180px" type="primary" @click="handleUpdateProDriver()" :disabled="!pointMapDir">
              <el-icon class="mr-5"> <IEpFolder /> </el-icon>
              {{ t('updateProDriver') }}
            </el-button>
          </div>
        </div>
        <CustomStyleTable
          class="layout-card table-custom"
          :showPagination="true"
          max-height="530px"
          :border="true"
          :tableData="tableData"
          @selectionChange="handleSelectionChange"
          rowKey="id"
        >
          <el-table-column align="center" type="selection" width="55" />
          <el-table-column :label="t('serialNumber')" align="center" width="100px" prop="id" show-overflow-tooltip />
          <el-table-column :label="t('fileName')" align="center" prop="fileName" show-overflow-tooltip />
        </CustomStyleTable>
      </div>
    </div>
  </el-dialog>
</template>
<style lang="scss" scoped>
.driver-settings-con {
  height: 680px;
  .el-button {
    border-radius: 0;
  }
  .title-con {
    width: 100%;
    margin-bottom: 15px;
  }
  .dependency-file-con {
    display: flex;
    align-items: center;
    padding: 0 8px;
    margin-bottom: 15px;
    .el-select {
      margin-right: 10px;
      width: 300px;
      height: 32px;
    }
  }
  .point-mapping-con {
    .point-btn-list {
      display: flex;
      justify-content: space-between;
      padding-right: 10px;
      .btn-list-con {
        display: flex;
      }
    }
    .search-con {
      .el-input {
        margin-right: 10px;
      }
      display: flex;
      align-items: center;
    }
    :deep(.el-table--border) {
      border-bottom: 1px solid rgb(235, 238, 245);
    }
  }
}
</style>
