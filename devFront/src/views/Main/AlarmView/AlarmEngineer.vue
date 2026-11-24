<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useProjectOperate } from '@/composables/useProjectOperate.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import {
  createAlarmProjectServer,
  deleteAlarmProjectServer,
  deleteAllShareAlarmProjectServer,
  deleteShareAlarmProjectServer,
  editAlarmProjectServer,
  exportAlarmProjectServer,
  getAlarmProjectServer,
  importAlarmProjectServer,
  shareAlarmProjectServer,
} from '@/api/allRequest/alarmAPI.js';
import { ElMessage } from 'element-plus';
import { useConfirm } from '@/composables/useConfirm.js';
import router from '@/router/index.js';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';
import { debounce } from '@/utils/commonUtils.js';

import ShareEngineerDialog from '@/views/Main/MainDialogView/ShareEngineerDialog.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import AddOrEditProjectDialog from '@/components/AddOrEditProjectDialog/AddOrEditProjectDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
const { t } = useI18n();
const mainLeftMenusStore = useMainLeftMenusStore();
const alarmMenuStore = useAlarmMenuStore();

const { setCurrentAlarmEngineer, resetAlarmMenu } = alarmMenuStore;
nextTick(() => {
  resetAlarmMenu();
});
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
const searchKeyword = ref('');
const addEditTitle = ref('');
const addEditVisible = ref(false);
const shareVisible = ref(false);
const tableData = ref([]);
const editRow = ref({});
const selectRow = ref([]);
const disableProjectName = ref(false);
const filterData = computed(() =>
  tableData.value?.filter((item) => item.name?.toLowerCase()?.includes(searchKeyword.value?.toLowerCase())),
);

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
        const calculateTree = mainLeftMenusStore.getLeftMenuByProjectType(4);
        const data = calculateTree?.children?.find((item) => item.guid === row.projectGroupId);
        return data ? data.name : null;
      },
    },
  ];
});
const maxHeight = computed(() => {
  return !mainLeftMenusStore.expand ? 'calc(100vh - 420px)' : 'calc(100vh - 200px)';
});

watchEffect(async () => {
  const { name, guid, path } = mainLeftMenusStore.leftRowSelect;
  if (!guid || !name || !path || path !== 'alarm') {
    return;
  }
  await nextTick(() => {
    getTableData();
  });
});
const getTableData = async () => {
  tableData.value = await getAlarmProjectServer(mainLeftMenusStore.leftRowSelect.guid);
};

const addEditProject = async (row) => {
  // 创建
  if (!row.guid) {
    const { errorCode } = await createAlarmProjectServer(row);

    if (errorCode === 0) {
      ElMessage.success(t('createSuccess'));
    }
  } else {
    //  编辑
    const { errorCode } = await editAlarmProjectServer(row);

    if (errorCode === 0) {
      ElMessage.success(t('editSuccess'));
    }
  }

  await getTableData();
  addEditVisible.value = false;
};
const createProject = () => {
  addEditTitle.value = t('createProject');
  addEditVisible.value = true;
  editRow.value = {};
  disableProjectName.value = isDisableProjectName(false);
};
const editProject = (row) => {
  if (!hasPermission(row)) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  addEditTitle.value = t('editProject');
  editRow.value = row;
  addEditVisible.value = true;
  disableProjectName.value = isDisableProjectName(true, row.status);
};

const selectChangeHandle = (row) => {
  selectRow.value = row;
};

const deleteProject = async (toDeleteRows) => {
  const deleteData = toDeleteRows.filter((row) => isCreator(row));
  if (deleteData.length === 0) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  await useConfirm(`${t(`sureForSelectRow`, { length: deleteData.length })}`, t('sureForDelete'));
  const { errorCode } = await deleteAlarmProjectServer({ guid: deleteData.map((item) => item.guid) });
  await getTableData();
  if (errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
  }
};

const publishAlarm = async () => {
  if (!hasPermission(selectRow.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  try {
    await publishProject({ guid: selectRow.value[0].guid });
  } finally {
    await getTableData();
  }
};

const updateAlarm = async () => {
  if (!hasPermission(selectRow.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  try {
    await useConfirm(`${t(`confirmUpdateProject`)}`, t('tip'));
    await updateProject({ guid: selectRow.value[0].guid });
  } catch (error) {
    ElMessage.info(t('updateCancel'));
  } finally {
    await getTableData();
  }
};

//撤销发布
const unPublishAlarm = async () => {
  if (!hasPermission(selectRow.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  try {
    await unPublishProject({ guid: selectRow.value[0].guid });
  } finally {
    await getTableData();
  }
};

const shareEngineerHandle = () => {
  if (!isCreator(selectRow.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  editRow.value = selectRow.value[0];
  shareVisible.value = true;
};

const shareConfirmDebounce = debounce((errorCode) => {
  if (errorCode === 0) {
    ElMessage.success(t('operateSuccess'));
  }
  shareVisible.value = false;
  getTableData();
}, 1000);

const shareConfirm = async (editInfo) => {
  let errorCode = null;
  switch (editInfo.operate) {
    case 'deleteShareAllUser':
      errorCode = await deleteAllShareAlarmProjectServer(editInfo.data);
      break;
    case 'addShareUser':
      errorCode = await shareAlarmProjectServer(editInfo.data);
      break;
    case 'deleteShareUser':
      errorCode = await deleteShareAlarmProjectServer(editInfo.data);
      break;
    default:
      break;
  }
  shareConfirmDebounce(errorCode);
};

const tableRowDBClick = (row) => {
  if (!hasPermission(row)) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  setCurrentAlarmEngineer(row);
  router.push({ name: 'alarm-engineer-config' });
};

const exportProject = async () => {
  if (!hasPermission(selectRow.value[0])) {
    ElMessage.warning(t('noPermise'));
    return;
  }
  try {
    isLoading.value = true;
    loadingText.value = t('projectExportLoading');
    const {
      errorCode,
      data: { successPros },
    } = await exportAlarmProjectServer(selectRow.value.map((row) => row.guid));
    if (errorCode === 0) {
      const downlandFiles = successPros.map((item) => {
        return {
          url: item.url,
          fileName: `${item.projectName}.zip`,
        };
      });
      await batchZIPDownloadHandle(downlandFiles);
      ElMessage.success(t('projectExportSuccess'));
    }
  } finally {
    isLoading.value = false;
    loadingText.value = '';
    await getTableData();
  }
};

const fileChange = async (file) => {
  isLoading.value = true;
  loadingText.value = t('projectImportLoading');
  const formData = new FormData();
  formData.append('projectGroupId', mainLeftMenusStore.leftRowSelect.guid);
  formData.append('uploadFiles', file.raw);
  formData.append('name', encodeURIComponent(file.name));
  const res = await importAlarmProjectServer(formData);
  isLoading.value = false;
  loadingText.value = '';
  if (res.errorCode === 0) {
    ElMessage.success(t('projectImportSuccess'));
  }
  await getTableData();
};
</script>

<template>
  <header class="toolbar">
    <div class="button">
      <el-button type="primary" @click="createProject">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('buildProject') }}
      </el-button>
      <el-button :disabled="selectRow.length === 0" type="danger" @click="deleteProject(selectRow)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :before-upload="() => false"
        :limit="10"
        :on-change="fileChange"
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
      <el-button :disabled="selectRow.length !== 1" @click="exportProject">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
      <el-button :disabled="selectRow.length !== 1" @click="shareEngineerHandle">
        <el-icon class="mr-5">
          <IEpShare />
        </el-icon>
        {{ t('editShare') }}
      </el-button>
      <el-button :disabled="selectRow.length !== 1" type="primary" @click="publishAlarm">
        <el-icon class="mr-5">
          <IEpPosition />
        </el-icon>
        {{ t('publish') }}
      </el-button>
      <el-button :disabled="selectRow.length !== 1" type="primary" @click="updateAlarm">
        <el-icon class="mr-5">
          <IEpConnection />
        </el-icon>
        {{ t('update') }}
      </el-button>
      <el-button :disabled="selectRow.length !== 1" type="danger" @click="unPublishAlarm">
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
      <el-button style="width: 36px">
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
    @selectionChange="selectChangeHandle"
    @tableRowDBClick="tableRowDBClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('projectName')" align="left" min-width="16%" prop="name" show-overflow-tooltip>
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
        <el-tag v-if="row.updateStatus" :type="row.updateStatus ? 'success' : 'info'" round style="margin-left: 14px">
          {{ row.updateStatus }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column
      v-for="(row, index) of tableColumns"
      :formatter="row.formatter"
      :key="index"
      :label="row.label"
      :min-width="row.minWidth"
      :prop="row.props"
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
            <CustomIcon class="userPerson-icon" name="userPerson" />
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
          <el-link type="primary" @click="editProject(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="deleteProject([row])">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
          </el-link>
        </div>
      </template>
    </el-table-column>
  </CustomStyleTable>

  <LoadingComponent v-if="isLoading" :loading="isLoading" :loadingText="loadingText" />

  <AddOrEditProjectDialog
    v-if="addEditVisible"
    v-model:dialog-visible="addEditVisible"
    :row-data="editRow"
    :title="addEditTitle"
    :disableProjectName="disableProjectName"
    @confirm="addEditProject"
  />

  <ShareEngineerDialog
    v-if="shareVisible"
    v-model:dialog-visible="shareVisible"
    :project-info="editRow"
    @share-confirm="shareConfirm"
  />
</template>

<style scoped></style>
