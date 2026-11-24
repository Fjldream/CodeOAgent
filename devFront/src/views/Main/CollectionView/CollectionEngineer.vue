<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { ElMessage, genFileId } from 'element-plus';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useUserListStore } from '@/stores/userListStore.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import { useProjectOperate } from '@/composables/useProjectOperate.js';
import {
  createCollectionProjectServer,
  deleteCollectionProjectServer,
  deleteShareAllUserServer,
  deleteShareUserServer,
  editCollectionProjectServer,
  exportProjectServer,
  getCollectionProjectServer,
  importProjectServer,
  shareUserServer,
} from '@/api/allRequest/collectionAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { debounce } from '@/utils/commonUtils.js';
import router from '@/router/index.js';

import ShareEngineerDialog from '@/views/Main/MainDialogView/ShareEngineerDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import DriverLibraryDialog from '@/views/Main/CollectionView/CollectionDialogView/DriverLibraryDialog.vue';
import AddOrEditProjectDialog from '@/views/Main/CollectionView/CollectionDialogView/AddOrEditProjectDialog.vue';

const { t } = useI18n();
const loginUserStore = useLoginUserStore();
const mainLeftMenusStore = useMainLeftMenusStore();
const collectionMenuStore = useCollectionMenuStore();
const userListStore = useUserListStore();

const { setCurrentCollectionEngineer, resetCollectionMenu } = collectionMenuStore;
const { getUserList } = userListStore;

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

const fileList = ref([]);
const tableData = ref([]);
const uploadRef = useTemplateRef('uploadRef');
// 响应式列表及选中行
const dialogVisible = ref(false);
const disableProjectName = ref(false);
const dialogType = ref('');
const title = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
// 搜索数据
const searchKeyword = ref('');
// 复选框选中行
const selectRows = ref([]);
// 编辑数据
const editRows = ref([]);
const tableRow = ref({});

nextTick(() => {
  getUserList();
  resetCollectionMenu();
});

watchEffect(async () => {
  const { path } = mainLeftMenusStore.leftRowSelect;
  if (path !== 'collection') {
    return;
  }
  await nextTick(async () => {
    await getTableData();
  });
});

const maxHeight = computed(() => {
  return !mainLeftMenusStore.expand ? 'calc(100vh - 420px)' : 'calc(100vh - 200px)';
});

const tableColumns = computed(() => {
  return [
    {
      label: t('description'),
      props: 'description',
      minWidth: '15%',
    },
    {
      label: 'ID',
      props: 'guid',
      minWidth: '15%',
    },
  ];
});

//检索
const filterData = computed(() =>
  tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);
//驱动界面
const driverDialog = async () => {
  dialogType.value = 'driver';
  title.value = t('driverLibrary');
  editRows.value = [];
  activeDialogComponent.value = DriverLibraryDialog;
  dialogVisible.value = true;
};

//创建
const createDialog = async () => {
  dialogType.value = 'create';
  title.value = t('createProject');
  editRows.value = [];
  activeDialogComponent.value = AddOrEditProjectDialog;
  dialogVisible.value = true;
  disableProjectName.value = isDisableProjectName(false);
};

//编辑
const editDialog = async (row) => {
  if (!hasPermission(row)) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  title.value = t('editProject');
  dialogType.value = 'edit';
  editRows.value = row;
  activeDialogComponent.value = AddOrEditProjectDialog;
  dialogVisible.value = true;
  disableProjectName.value = isDisableProjectName(true, row.status);
};

// 确认及取消
const handleConfirm = async (data) => {
  if (dialogType.value === 'create') {
    const restful = await createCollectionProjectServer(data);
    if (restful?.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
    }
  } else {
    const restful = await editCollectionProjectServer(data);
    if (restful?.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
    }
  }
  await getTableData();

  dialogVisible.value = false;
};

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};
//删除
const deleteCollection = async (toDeleteRows) => {
  const deleteData = toDeleteRows.filter((row) => isCreator(row));
  try {
    if (deleteData.length === 0) {
      ElMessage.warning(t('noPermise'));
      return;
    }
    await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));
    const idsToDelete = toDeleteRows.map((row) => row.guid);
    const deleteObj = {
      projectId: idsToDelete,
    };
    const restful = await deleteCollectionProjectServer(deleteObj);
    if (restful?.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      await getTableData();
    }
  } catch (error) {
    ElMessage.info(t('cancleDlete'));
  }
};
//发布
const publisCollection = async () => {
  if (!hasPermission(selectRows.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  try {
    await publishProject({ guid: selectRows.value[0].guid });
  } finally {
    await getTableData();
  }
};

//更新
const updateCollection = async () => {
  if (!hasPermission(selectRows.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  try {
    await useConfirm(`${t(`confirmUpdateProject`)}`, t('tip'));
    await updateProject({ guid: selectRows.value[0].guid });
  } catch (error) {
    ElMessage.info(t('updateCancel'));
  } finally {
    await getTableData();
  }
};
//撤销发布
const unPublisDataSource = async () => {
  if (!hasPermission(selectRows.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  try {
    // 模拟异步发布操作
    await unPublishProject({ guid: selectRows.value[0].guid });
  } finally {
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
  const {
    data: { errorPros, successPros },
  } = await exportProjectServer({ guidArr: exportRow.map((row) => row.guid) });
  const downlandFiles = successPros.map((item, index) => {
    return {
      url: item.url,
      fileName: `${item.projectName}.zip`,
    };
  });
  const result = await batchZIPDownloadHandle(downlandFiles);
  ElMessage.success(t('projectExportSuccess', { name: result }));
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
  for (const item of fileList.value) {
    formData.append('name', encodeURIComponent(item.name));
    formData.append('uploadFiles', item.raw);
  }
  formData.append('projectGroupId', mainLeftMenusStore.leftRowSelect.guid);
  const res = await importProjectServer(formData);
  if (res.errorCode === 0 && res.data.errorPros.length === 0) {
    ElMessage.success(t('projectImportSuccess'));
  } else {
    for (let i = 0; i < res.data.errorPros.length; i++) {
      const element = res.data.errorPros[i];
      ElMessage.error(`${element.packetName}: ${element.msg}`);
    }
  }
  fileList.value = [];
  await getTableData();
  fileUploadSuccess();
};
const fileUploadSuccess = (file) => {
  uploadRef.value?.clearFiles();
};
const fileUploadError = (file) => {
  uploadRef.value?.clearFiles();
};

const getTableData = async () => {
  tableData.value = await getCollectionProjectServer();
};
const refreshData = async () => {
  await getTableData();
};
const tableRowDBClick = async (row) => {
  if (!hasPermission(row)) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  setCurrentCollectionEngineer(row);
  await router.push({ name: 'collection-engineer-config' });
};

const shareEngineerHamdle = async () => {
  if (!isCreator(selectRows.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  title.value = t('sharedProject');
  tableRow.value = selectRows.value[0];
  activeDialogComponent.value = ShareEngineerDialog;
  dialogVisible.value = true;
};

const shareConfirmDebounce = debounce(async (errorCode) => {
  if (errorCode === 0) {
    ElMessage.success(t('operateSuccess'));
  }
  dialogVisible.value = false;
  await getTableData();
}, 1000);

const shareConfirm = async (editInfo) => {
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
</script>

<template>
  <header class="toolbar">
    <div class="button">
      <el-button type="primary" @click="driverDialog">
        <el-icon class="mr-5">
          <IEpCpu />
        </el-icon>
        {{ t('driverLibrary') }}
      </el-button>
      <el-button type="primary" @click="createDialog">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('buildProject') }}
      </el-button>
      <el-button :disabled="!selectRows.length" type="danger" @click="deleteCollection(selectRows)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :before-upload="() => false"
        :file-list="fileList"
        :limit="10"
        :on-change="fileChange"
        :on-error="fileUploadError"
        :on-exceed="exceedHandle"
        :on-success="fileUploadSuccess"
        :show-file-list="false"
        accept=".zip"
        class="ml-10"
        multiple
        name="uploadFiles"
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
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="publisCollection">
        <el-icon class="mr-5">
          <IEpPosition />
        </el-icon>
        {{ t('publish') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="updateCollection">
        <el-icon class="mr-5">
          <IEpConnection />
        </el-icon>
        {{ t('update') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="danger" @click="unPublisDataSource">
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
    @tableRowDBClick="tableRowDBClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('projectName')" align="left" min-width="15%" prop="name" show-overflow-tooltip>
      <template #default="{ row }">
        <el-link type="primary" @click="tableRowDBClick(row)">
          {{ row.name }}
        </el-link>
      </template>
    </el-table-column>
    <el-table-column :label="t('status')" align="center" min-width="12%" show-overflow-tooltip>
      <template #default="{ row }">
        <el-tag :type="getTagType(row)" round>
          {{ t(row.status) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column
      v-for="row of tableColumns"
      :key="row.label"
      :label="row.label"
      :min-width="row.minWidth"
      :prop="row.props"
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
    <el-table-column :label="t('operate')" align="center" width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link type="primary" @click="editDialog(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="deleteCollection([row])">
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
    :projectInfo="{ ...tableRow }"
    :rowData="{ ...editRows, dialogType }"
    :title="title"
    :disableProjectName="disableProjectName"
    @confirm="handleConfirm"
    @shareConfirm="shareConfirm"
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
