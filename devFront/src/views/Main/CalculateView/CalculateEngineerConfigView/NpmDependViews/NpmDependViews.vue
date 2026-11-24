<script setup>
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useConfirm } from '@/composables/useConfirm';
import {
  dependanceListServer,
  delDependanceServer,
  importDependanceServer,
  unInstallDependanceServer,
} from '@/api/allRequest/calculationAPI';
import InstallNpmDependDialog from '@/views/Main/CalculateView/CalculateDialogView/InstallNpmDependDialog.vue';
import ImportNpmDependDialog from '@/views/Main/CalculateView/CalculateDialogView/ImportNpmDependDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const route = useRoute();
const searchKeyword = ref('');
const importDialog = ref(false);
const pageTitle = computed(() => {
  let title = { name: 'default', type: 'default' };
  switch (route.name.split('-')[1]) {
    case 'normal':
      title = { name: t('ordinaryDependence'), type: 'normal' };
      break;
    case 'npm':
      title = { name: t('npmRequire'), type: 'npm' };
      break;
    case 'py':
      title = { name: t('pyRequire'), type: 'python' };
      break;
    case 'cpp':
      title = { name: t('cppRequire'), type: 'c++' };
      break;
    default:
      break;
  }
  return title;
});
watch(pageTitle, () => {
  initTableData();
});
// 复选框选中行
const selectRows = ref([]);
const dialogVisible = ref(false);
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const importFile = ref({ name: '' });
const importDes = ref('');

nextTick(() => {
  initTableData();
});
// 显示哪个弹窗
const openDialog = (type) => {
  switch (type) {
    case 'install':
      activeDialogComponent.value = InstallNpmDependDialog;
      break;
    case 'import':
      activeDialogComponent.value = ImportNpmDependDialog;
      break;
    default:
      break;
  }
  dialogVisible.value = true;
};
/**
 * @function initTableData
 * @description 初始化表格数据
 */
const initTableData = async () => {
  const data = await dependanceListServer(pageTitle.value.type);
  if (data.errorCode === 0) {
    tableData.value = data.data.map((item, index) => {
      return {
        id: index,
        name: item.name,
        type: item.type,
        fileName: item.fileName,
        description: item.description,
      };
    });
  }
};
const handleConfirm = (data) => {
  if (data.dialogType === 'install') {
    initTableData();
  } else if (data.dialogType === 'import') {
    const { id, name, type, description, createAt, modifiedAt } = data;
    const addObj = { id, name, type, description, createAt, modifiedAt };
    tableData.value = [...tableData.value, addObj];
  }
  dialogVisible.value = false;
};
// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};
const deleteDeoebd = async () => {
  const toDeleteRows = selectRows.value;
  try {
    await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));
    const namesToDelete = toDeleteRows.map((row) => row.name);
    const res = await delDependanceServer(pageTitle.value.type, namesToDelete);
    if (res.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      await initTableData();
    }
  } catch (error) {
    ElMessage.info(t('cancleDlete'));
  }
};
const tableData = ref([]);
const filterData = computed(() =>
  tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);
/**
 * @fuction fileChange
 * @description 上传文件change事件
 * @param file
 */
const fileChange = async (file) => {
  importFile.value = file;
};
/**
 * @function handleImportDialog
 * @description 导入弹窗控制
 */
const handleImportDialog = (val) => {
  importDialog.value = val;
  importFile.value = { name: '' };
  importDes.value = '';
};
/**
 * @function confirmHandle
 * @description 导入确认按钮事件
 */
const confirmHandle = async () => {
  if (!importFile.value) return ElMessage.warning(t('plsSelectFile'));
  const res = await importDependanceServer(importDes.value, pageTitle.value.type, importFile.value);
  if (res.errorCode === 0) {
    ElMessage.success(t('importSuccess'));
    handleImportDialog(false);
    await initTableData();
  }
};
/**
 * @function handleUninstallDependancy
 * @description 卸载npm依赖
 */
const handleUninstallDependancy = async () => {
  const toDeleteRows = selectRows.value;
  const result = await unInstallDependanceServer(toDeleteRows[0].name);
  if (result.errorCode === 0) {
    if (result.data.code) {
      ElMessage.success(t('unInstallSuccess'));
      await initTableData();
    } else {
      ElMessage.error(result.data.msg);
    }
  }
};
</script>

<template>
  <div class="periodic-scripts-con">
    <header class="mb-12 fz-16">
      <span>{{ pageTitle.name }}</span>
    </header>
    <div class="button mb-20">
      <el-button v-if="pageTitle.type === 'npm'" type="primary" @click="openDialog('install')">
        {{ t('install') }}
      </el-button>
      <el-button
        v-if="pageTitle.type === 'npm'"
        :disabled="selectRows.length !== 1"
        type="danger"
        @click="handleUninstallDependancy"
      >
        {{ t('unInstall') }}
      </el-button>
      <el-button v-if="pageTitle.type !== 'npm'" @click="handleImportDialog(true)">
        <el-icon class="mr-5">
          <IEpDownload />
        </el-icon>
        {{ t('import') }}
      </el-button>
      <el-button v-if="pageTitle.type !== 'npm'" :disabled="!selectRows.length" type="danger" @click="deleteDeoebd">
        {{ t('delete') }}
      </el-button>
      <el-input
        v-model="searchKeyword"
        :placeholder="t('plsInputKeywordSearch')"
        :prefix-icon="Search"
        clearable
        size="default"
        style="max-width: 250px; margin-left: auto"
      />
    </div>
    <CustomStyleTable
      class="table-custom"
      :tableData="filterData"
      maxHeight="calc(100% - 120px)"
      rowKey="id"
      @selectionChange="handleSelectionChange"
    >
      <el-table-column align="center" min-width="5%" type="selection" width="55" />
      <el-table-column :label="t('name')" align="center" min-width="35%" prop="name" show-overflow-tooltip />
      <el-table-column :label="t('type')" align="center" min-width="25%" prop="type" show-overflow-tooltip />
      <el-table-column
        v-if="pageTitle.type === 'normal'"
        :label="t('fileName')"
        align="center"
        min-width="25%"
        prop="fileName"
        show-overflow-tooltip
      />
      <el-table-column
        :label="t('description')"
        align="center"
        min-width="35%"
        prop="description"
        show-overflow-tooltip
      />
    </CustomStyleTable>
    <component
      :is="activeDialogComponent"
      v-if="dialogVisible"
      v-model:dialogVisible="dialogVisible"
      @confirm="handleConfirm"
    />
  </div>
  <CustomDialog
    :dialog-visible="importDialog"
    :title="t('import')"
    :width="500"
    @confirm="confirmHandle"
    @update:dialog-visible="handleImportDialog(false)"
  >
    <el-form label-width="80">
      <el-form-item :label="t('file')">
        <div style="width: 100%; display: flex">
          <el-input v-model="importFile.name" :readonly="true"></el-input>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="fileChange"
            :show-file-list="false"
            accept=".zip"
            class="ml-10"
          >
            <el-button type="primary">
              {{ t('select') }}
            </el-button>
          </el-upload>
        </div>
      </el-form-item>
      <el-form-item :label="t('description')">
        <el-input v-model="importDes" type="textarea" />
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.periodic-scripts-con {
  height: 100%;
  width: 100%;
}

.button {
  display: flex;
  flex-wrap: wrap; // 按钮自动换行
  gap: 0; // 按钮之间的间距
}
.chose-file-name {
  color: rgba(0, 0, 0, 0.2);
}
</style>
