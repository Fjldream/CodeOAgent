<script setup>
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import router from '@/router/index.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useUserListStore } from '@/stores/userListStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useProjectOperate } from '@/composables/useProjectOperate.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { debounce } from '@/utils/commonUtils.js';
import {
  createSolutionProjectServer,
  deleteProjectServer,
  deleteShareAllUserServer,
  deleteShareUserServer,
  exportProjectServer,
  getProjectInfoServer,
  importProjectServer,
  modifyProjectServer,
  shareUserServer,
} from '@/api/allRequest/calculationAPI.js';

import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import AddOrEditProjectDialog from '@/components/AddOrEditProjectDialog/AddOrEditProjectDialog.vue';
import ShareEngineerDialog from '@/views/Main/MainDialogView/ShareEngineerDialog.vue';

const { t } = useI18n();
const loginUserStore = useLoginUserStore();
const mainLeftMenusStore = useMainLeftMenusStore();
const calculationMenuStore = useCalculationMenuStore();
const userListStore = useUserListStore();

const scriptEditorStore = useScriptEditorStore();
const uploadRef = useTemplateRef('uploadRef');

const { setCurrentCalculateEngineer, resetCalculationMenu } = calculationMenuStore;

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
const dialogVisible = ref(false);
const dialogType = ref('');
const searchKeyword = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const selectRows = ref([]);
const title = ref('');
const tableRow = ref({});
// 编辑数据
const editRows = ref([]);
const disableProjectName = ref(false);

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
      minWidth: '10%',
    },
    {
      label: t('projectGroup'),
      props: 'solutionName',
      minWidth: '10%',
      formatter: (row) => {
        const calculateTree = mainLeftMenusStore.getLeftMenuByProjectType(0);
        const data = calculateTree.children.find((item) => item.guid === row.projectGroupId);
        return data ? data.name : null;
      },
    },
  ];
});

const filterData = computed(() =>
  tableData.value?.filter((item) => item.name?.toLowerCase()?.includes(searchKeyword.value?.toLowerCase())),
);
const maxHeight = computed(() => {
  return !mainLeftMenusStore.expand ? 'calc(100vh - 420px)' : 'calc(100vh - 200px)';
});

nextTick(() => {
  resetCalculationMenu();
  resetScriptEditorList();
});

watchEffect(async () => {
  const { name, guid, path } = mainLeftMenusStore.leftRowSelect;
  if (!guid || !name || !path || path !== 'calculate') {
    return;
  }
  await nextTick(() => {
    getTableData();
  });
});

//创建
const createDialog = async () => {
  dialogType.value = 'create';
  activeDialogComponent.value = AddOrEditProjectDialog;
  title.value = t('createProject');
  dialogVisible.value = true;
  disableProjectName.value = isDisableProjectName(false);
};
//编辑
const editDialog = async (row) => {
  if (!hasPermission(row)) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  dialogType.value = 'edit';
  title.value = t('editProject');
  editRows.value = row;
  activeDialogComponent.value = AddOrEditProjectDialog;
  dialogVisible.value = true;
  disableProjectName.value = isDisableProjectName(true, row.status);
};

// 复选框选中行
const handleConfirm = async (data) => {
  if (dialogType.value === 'create') {
    await createCalculation(data);
  } else if (dialogType.value === 'edit') {
    await editCalculation(data);
  }
  await getTableData();

  dialogVisible.value = false;
};

const createCalculation = async (data) => {
  const result = await createSolutionProjectServer({
    ...data,
    projectGroupId: mainLeftMenusStore.leftRowSelect.guid,
  });
  if (result === 0) {
    ElMessage({
      type: 'success',
      message: t('createProjectSuccess'),
    });
  }
};

const editCalculation = async (data) => {
  const result = await modifyProjectServer({
    ...selectRows.value[0],
    ...data,
  });
  if (result === 0) {
    ElMessage({
      type: 'success',
      message: t('editProjectSuccess'),
    });
  }
};

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};

const deleteCalculation = async (toDeleteRows) => {
  try {
    const deleteData = toDeleteRows.filter((row) => isCreator(row));
    if (deleteData.length === 0) {
      ElMessage.warning(t('noPermise'));
      return;
    }
    await useConfirm(`${t(`sureForSelectRow`, { length: deleteData.length })}`, t('sureForDelete'));

    isLoading.value = true;
    loadingText.value = t('projectDeleteTips');
    const errorCode = await deleteProjectServer({ projectId: deleteData.map((item) => item.guid) });
    await getTableData();
    if (errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
  } finally {
    isLoading.value = false;
  }
};

const publishCalculation = async () => {
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

const updateCalculation = async () => {
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
    await unPublishProject({ guid: selectRows.value[0].guid });
  } finally {
    await getTableData();
  }
};

const tableRowDBClick = async (row) => {
  if (!hasPermission(row)) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  setCurrentCalculateEngineer(row);
  await router.push({ name: 'calculate-engineer-config' });
};

//导出
const exportHandle = async () => {
  isLoading.value = true;
  loadingText.value = t('projectExportLoading');
  try {
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
      data: { successPros },
    } = await exportProjectServer({ guidArr: exportRow.map((row) => row.guid) });
    const downlandFiles = successPros.map((item, index) => {
      return {
        url: item.url,
        fileName: `${item.projectName}.zip`,
      };
    });
    const result = await batchZIPDownloadHandle(downlandFiles);
    ElMessage.success(t('projectExportSuccess', { name: result }));
  } finally {
    isLoading.value = false;
  }
};

// 文件上传
const fileChange = async (file, files) => {
  try {
    isLoading.value = true;
    loadingText.value = t('projectImportLoading');
    const formData = new FormData();
    formData.append('name', encodeURIComponent(file.name));
    formData.append('uploadFiles', file.raw);
    formData.append('projectGroupId', mainLeftMenusStore.leftRowSelect.guid);
    const res = await importProjectServer(formData);

    if (res?.errorCode === 0 && res.data?.errorPros?.length === 0) {
      ElMessage.success(t('projectImportSuccess'));
    } else {
      const element = res.data.errorPros[0];
      ElMessage.error(`${element.packetName}: ${element.msg}`);
    }
  } finally {
    isLoading.value = false;
    loadingText.value = '';
    await getTableData();
    fileUploadSuccess();
  }
};

const fileUploadSuccess = () => {
  uploadRef.value?.clearFiles();
};

const getTableData = async () => {
  tableData.value = await getProjectInfoServer(mainLeftMenusStore.leftRowSelect.guid);
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
      <el-button :disabled="!selectRows.length" type="danger" @click="deleteCalculation(selectRows)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :before-upload="() => false"
        :on-change="fileChange"
        :on-success="fileUploadSuccess"
        :show-file-list="false"
        accept=".zip"
        class="ml-10"
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
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="publishCalculation">
        <el-icon class="mr-5">
          <IEpPosition />
        </el-icon>
        {{ t('publish') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" type="primary" @click="updateCalculation">
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
    :tableData="filterData"
    class="layout-card table-custom"
    :max-height="maxHeight"
    @selectionChange="handleSelectionChange"
    @tableRowDBClick="tableRowDBClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('projectName')" align="left" min-width="16%" prop="name" show-overflow-tooltip>
      <template #default="{ row }">
        <el-link type="primary" @click.stop="tableRowDBClick(row)">
          {{ row.name }}
        </el-link>
      </template>
    </el-table-column>
    <el-table-column :label="t('status')" align="center" min-width="12%" show-overflow-tooltip>
      <template #default="{ row }">
        <el-tag :type="getTagType(row)" round>
          {{ t(row.status) }}
        </el-tag>
        <el-tag v-if="row.updateStatus" :type="row.updateStatus ? 'success' : 'info'" round style="margin-left: 14px">
          {{ row.updateStatus }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column
      v-for="row of tableColumns"
      :formatter="row.formatter"
      :label="row.label"
      :min-width="row.minWidth"
      :prop="row.props"
      :key="row.props"
      align="center"
      show-overflow-tooltip
    />
    <el-table-column :label="t('modifyInfo')" align="left" min-width="12%" show-overflow-tooltip sortable>
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
    <el-table-column :label="t('createInfo')" align="left" min-width="12%" show-overflow-tooltip sortable>
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
          <el-link type="danger" @click="deleteCalculation([row])">
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
    :rowData="{ ...editRows }"
    :title="title"
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
    gap: 0; // 按钮之间的间距
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
