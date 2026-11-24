<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { ElMessage, genFileId } from 'element-plus';
import { useConfirm } from '@/composables/useConfirm.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import router from '@/router/index.js';
import { debounce } from '@/utils/commonUtils.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useUserListStore } from '@/stores/userListStore.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useProjectOperate } from '@/composables/useProjectOperate.js';
import {
  createProjectServer,
  deleteProjectServer,
  deleteShareAllUserServer,
  deleteShareUserServer,
  exportProjectServer,
  exportAppProjectServer,
  getPagesServer,
  getProjectFileServer,
  getProjectInfoServer,
  importProjectServer,
  modifyProjectServer,
  saveProjectDataServer,
  shareUserServer,
} from '@/api/allRequest/clientAPI.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import AddOrEditProjectDialog from '@/components/AddOrEditProjectDialog/AddOrEditProjectDialog.vue';
import AppOfflineReleaseDialog from '@/views/Main/ClientView/ClientDialogView/AppOfflineReleaseDialog.vue';
import SetProjectDialog from '@/views/Main/ClientView/ClientDialogView/SetProjectDialog.vue';
import ShareEngineerDialog from '@/views/Main/MainDialogView/ShareEngineerDialog.vue';

const { t } = useI18n();
const mainLeftMenusStore = useMainLeftMenusStore();
const clientMenuStore = useClientMenuStore();
const userListStore = useUserListStore();
const scriptEditorStore = useScriptEditorStore();

const { setCurrentClientEngineer, resetClientMenu } = clientMenuStore;
const { getUserList } = userListStore;
const { resetScriptEditorList } = scriptEditorStore;

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
  resetScriptEditorList();
  resetClientMenu();
});

watchEffect(async () => {
  const { path } = mainLeftMenusStore.leftRowSelect;
  if (path !== 'client') {
    return;
  }
  await nextTick(async () => {
    await getTableData();
  });
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
const maxHeight = computed(() => {
  return !mainLeftMenusStore.expand ? 'calc(100vh - 420px)' : 'calc(100vh - 200px)';
});

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
  const { guid: projectGroupId } = mainLeftMenusStore.leftRowSelect;
  let restful = null;
  switch (dialogType.value) {
    case 'create':
      const params = { ...data, projectGroupId, projectData: {} };
      restful = await createProjectServer(params);
      if (restful?.errorCode === 0) {
        ElMessage.success(t('createSuccess'));
        await getTableData();
      }
      break;
    case 'edit':
      restful = await modifyProjectServer(data);
      if (restful?.errorCode === 0) {
        ElMessage.success(t('editSuccess'));
        await getTableData();
      }
      break;
    case 'set':
      const paramData = {
        config: {
          title: data.title,
          logoff: data.logoff,
          login: data.login,
          redirection: data.redirection,
        },
      };
      const type = 7;
      const name = 'loginConfig';
      const { guid: projectId } = selectRows.value[0];
      restful = await saveProjectDataServer({ name, paramData, projectId, type });
      if (restful?.errorCode === 0) {
        ElMessage.success(t('setSuccess'));
      }
      break;
    case 'appRelease':
      isLoading.value = true;
      loadingText.value = t('projectPublishing');
      restful = await exportAppProjectServer(selectRows.value);
      isLoading.value = false;
      loadingText.value = '';
      if (restful.errorCode === 0) {
        ElMessage.success(t('publishSuccess'));
      }
      break;
    default:
      break;
  }
  dialogVisible.value = false;
};

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};
//删除
const deleteClient = async (toDeleteRows) => {
  const deleteData = toDeleteRows.filter((row) => isCreator(row));
  try {
    if (deleteData.length === 0) {
      ElMessage.warning(t('noPermise'));
      return;
    }
    await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));
    const idsToDelete = toDeleteRows.map((row) => row.guid);
    const deleteObj = {
      guid: idsToDelete,
    };
    const restful = await deleteProjectServer(deleteObj);
    if (restful?.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      await getTableData();
    }
  } catch (error) {
    ElMessage.info(t('cancleDlete'));
  }
};
//发布
const publisClient = async () => {
  if (!hasPermission(selectRows.value[0])) {
    return;
  }
  try {
    // 判断是否存在首页
    const restful = await getPagesServer({ projectId: selectRows.value[0].guid });
    if (restful?.errorCode !== 0) {
      ElMessage.error(t('noHomePage'));
      return;
    }
    const { message } = restful.data;
    const isFirstPage = message.Pages.some((item) => item.name === message.default);
    if (!isFirstPage) {
      ElMessage.error(t('noHomePage'));
      return;
    }
    await publishProject({ guid: selectRows.value[0].guid });
  } finally {
    await getTableData();
  }
};

//更新
const updateClient = async () => {
  if (!hasPermission(selectRows.value[0])) {
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
  if (!hasPermission(selectRows.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  isLoading.value = true;
  loadingText.value = t('projectExportLoading');
  const res = await exportProjectServer(selectRows.value);
  isLoading.value = false;
  loadingText.value = '';
  if (res.errorCode === 0) {
    const { data } = res;
    const downlandFiles = data.map((item, index) => {
      return {
        url: item,
        fileName: item.split('/')[item.split('/').length - 1],
      };
    });
    await batchZIPDownloadHandle(downlandFiles);
    ElMessage.success(t('projectExportSuccess'));
  }
};

//app离线发布
const appOfflineRelease = async () => {
  if (!hasPermission(selectRows.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  title.value = t('appOfflineRelease');
  dialogType.value = 'appRelease';
  activeDialogComponent.value = AppOfflineReleaseDialog;
  dialogVisible.value = true;
};

const exceedHandle = (files) => {
  uploadRef.value?.clearFiles();
  const file = files[0];
  file.uuid = genFileId();

  uploadRef.value?.handleStart(file);
};

// 文件上传
const fileChange = async (file) => {
  try {
    isLoading.value = true;
    loadingText.value = t('projectImportLoading');
    const res = await importProjectServer({ currentName: file.name, file: file.raw });

    if (res?.errorCode === 0) {
      ElMessage.success(t('projectImportSuccess'));
    }
    await getTableData();
  } finally {
    isLoading.value = false;
    loadingText.value = '';
  }
};

const getTableData = async () => {
  const { guid: projectGroupId } = mainLeftMenusStore.leftRowSelect;
  const result = await getProjectInfoServer({ projectGroupId });
  if (result?.errorCode === 0) {
    const setData = [];
    result.data.forEach((item) => {
      setData.push(item);
    });
    tableData.value = setData;
  }
};
const refreshData = async () => {};
const setClient = async (row) => {
  if (!hasPermission(row[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  dialogType.value = 'set';
  const { guid } = row[0];
  const name = 'loginConfig';
  const type = 7;
  const restful = await getProjectFileServer({ name, type, guid });
  if (restful?.errorCode === 0) {
    editRows.value = { ...restful.data.config, guid };
    activeDialogComponent.value = SetProjectDialog;
    dialogVisible.value = true;
  }
};
const tableRowDBClick = async (row) => {
  if (!hasPermission(row)) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  setCurrentClientEngineer(row);
  await router.push({ name: 'client-engineer-config' });
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
const shareConfirmDebounce = debounce((errorCode) => {
  if (errorCode === 0) {
    ElMessage.success(t('operateSuccess'));
  }
  dialogVisible.value = false;
  getTableData();
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
  //添加防抖
  shareConfirmDebounce(errorCode);
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
      <el-button :disabled="!selectRows.length" type="danger" @click="deleteClient(selectRows)">
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
        :on-exceed="exceedHandle"
        :show-file-list="false"
        accept=".gz"
        class="ml-10"
      >
        <el-button>
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('import') }}
        </el-button>
      </el-upload>
      <el-button :disabled="selectRows.length !== 1" @click="exportHandle">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" @click="setClient(selectRows)">
        <el-icon class="mr-5">
          <IEpSetUp />
        </el-icon>
        {{ t('set') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" @click="shareEngineerHamdle">
        <el-icon class="mr-5">
          <IEpShare />
        </el-icon>
        {{ t('editShare') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" @click="appOfflineRelease">
        <el-icon class="mr-5">
          <IEpPosition />
        </el-icon>
        {{ t('appOfflineRelease') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="publisClient">
        <el-icon class="mr-5">
          <IEpPosition />
        </el-icon>
        {{ t('publish') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="updateClient">
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
          <el-link type="danger" @click="deleteClient([row])">
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
