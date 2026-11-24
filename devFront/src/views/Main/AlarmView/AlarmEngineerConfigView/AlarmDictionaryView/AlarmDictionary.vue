<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import {
  createDataDirectoryServer,
  deleteDataDirectoryServer,
  editDataDirectoryServer,
  getDataDirectoryServer,
  getDataSourceServer,
  exportDirectoryServer,
  importDirectoryServer,
} from '@/api/allRequest/alarmAPI.js';
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
import { alarmTermEntry } from '@/assistant/entry.js';
// end
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { exportTableToExcel } from '@/utils/importExportUtils.js';

import QuickAddVariableDialog from '@/views/Main/AlarmView/AlarmDialogView/AlarmQuickAddVariableDialog.vue';
import EditVariableDialog from '@/views/Main/AlarmView/AlarmDialogView/EditVariableDialogView/EditVariableDialog.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';

const { t } = useI18n();
const alarmMenuStore = useAlarmMenuStore();
const configDatasource = ref([]);
const tableData = ref([]);

const dialogVisible = ref(false);
const filterTagType = shallowReactive([1, 2, 3, 4]);
const editVariable = ref(false);
const searchKeyword = ref('');
const activeDialogComponent = shallowRef(null);
const selectRow = ref([]);
const uploadRef = useTemplateRef('uploadRef');
const formData = ref({});
const tableRef = useTemplateRef('tableRef');
const typeName = { 1: 'Boolean', 2: 'Number', 3: 'Number', 4: 'Number', 5: 'String' };
const isLoading = ref(false);
const loadingText = ref('');
const tableColumns = computed(() => [
  {
    label: t('variableName'),
    props: 'Name',
    minWidth: '8%',
  },
  {
    label: 'ID',
    props: 'ID',
    minWidth: '8%',
  },
  {
    label: t('type'),
    props: 'Type',
    minWidth: '8%',
    formatter: (row) => {
      return typeName[row.Type];
    },
  },
  {
    label: t('associatedDataSourceName'),
    props: 'DataSourceName',
    minWidth: '12%',
  },
  {
    label: t('description'),
    props: 'Comment',
    minWidth: '8%',
  },
]);

watchEffect(async () => {
  const { id, path } = alarmMenuStore.currentAlarmRow;
  if (!id || path !== 'alarm-data-dictionary') {
    return;
  }
  await nextTick();
  await getTableData();
});

const searchTableData = computed(() => {
  if (!searchKeyword.value) {
    return tableData.value;
  }
  return tableData.value.filter((item) => item.Name?.toLowerCase().includes(searchKeyword.value.toLowerCase()));
});

// 获取表格数据
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
const dictionaryKey = () => [alarmMenuStore.currentAlarmEngineer?.guid, alarmMenuStore.currentAlarmRow?.id].join('/');
let loadedDictionary = '';
let generation = 0;
const getTableData = async () => {
  const key = dictionaryKey();
  const request = ++generation;
  const { data } = await getDataDirectoryServer();
  if (key === dictionaryKey() && request === generation) {
    loadedDictionary = key;
    tableData.value = data;
  }
};

watch(dictionaryKey, () => {
  loadedDictionary = '';
  tableData.value = [];
  selectRow.value = [];
  alarmTermEntry.value = null;
});
watchEffect(() => {
  const project = alarmMenuStore.currentAlarmEngineer;
  const group = alarmMenuStore.currentAlarmRow?.id;
  const row = editVariable.value ? formData.value : selectRow.value.length === 1 ? selectRow.value[0] : null;
  alarmTermEntry.value = row?.ID && project?.guid && group && loadedDictionary === dictionaryKey()
    && tableData.value.some(item => item.ID === row.ID)
    ? { kind: 'alarm', projectId: project.guid, object: row.ID, group, label: project.name + ' / ' + row.Name }
    : null;
});
onBeforeUnmount(() => { alarmTermEntry.value = null; });
// end
// 编辑事件
const editDataDictionary = (row) => {
  formData.value = row;
  editVariable.value = true;
};

// 删除事件
const deleteDataDictionary = async (row) => {
  await useConfirm(t('sureForDeleteSelectVariables'), t('deleteDatasource'));

  const { errorCode } = await deleteDataDirectoryServer(row.map((data) => data.ID));
  if (errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
  }
  await getTableData();
};

// 表格显示
const tableSelect = (row) => {
  selectRow.value = row;
};

const quickAdd = async (row) => {
  const { data } = await getDataSourceServer();
  configDatasource.value = Object.values(data).map((item) => {
    return {
      ...item,
      appName: item.dm_name,
    };
  });
  dialogVisible.value = true;
};

const handleQuickAdd = async (row) => {
  const { errorCode, data } = await createDataDirectoryServer(row);
  if (errorCode === 0) {
    if (data.errTags?.length > 0) {
      ElMessage.info(`${t(`checkReplaceString`, { replaceNames: data.errTags.join('、') })}`);
    } else {
      ElMessage.success(t('quickAddVarsSuccess'));
    }
  }
  await getTableData();
  dialogVisible.value = false;
};

const handleEditDataDictionary = async (row) => {
  const { ID, alarmItem, enable, ...basic } = row;
  const params = {
    tags: [ID],
    basic,
    enable,
    alarmItem: row.alarmItem,
  };
  const restful = await editDataDirectoryServer(params);
  if (restful?.errorCode === 0 && restful?.data.errTags.length === 0) {
    ElMessage.success(t('editSuccess'));
    await getTableData();
  } else {
    ElMessage.error(t('editError'));
  }
  editVariable.value = false;
};

// 导出报警变量
const handleExportTags = async () => {
  const tagIds = Array.from(selectRow.value).map((item) => item.ID);
  const res = await exportDirectoryServer(tagIds);
  if (res.errorCode === 0) {
    const { data } = res;
    const tables = data.map((item) => {
      Object.assign(item, item.AlarmItem);
      delete item.AlarmItem;
      return item;
    });
    const moreItemProps = [
      { label: t('variableName'), props: 'Name' },
      { label: 'ID', props: 'ID' },
      { label: t('type'), props: 'Type' }, //类型不允许修改
      { label: t('AlarmEnable'), props: 'AlarmEnable' },
      { label: t('LimitEnable'), props: 'LimitEnable' },
      { label: t('LowLow'), props: 'LoLoEnable' },
      { label: t('LowLow') + t('limitValue'), props: 'LoLoLimit' },
      { label: t('LowLow') + t('alarmText'), props: 'LoLoString' },
      { label: t('LowLow') + t('alarmPriority'), props: 'LoLoPriority' },
      { label: t('Low'), props: 'LoEnable' },
      { label: t('Low') + t('limitValue'), props: 'LoLimit' },
      { label: t('Low') + t('alarmText'), props: 'LoString' },
      { label: t('Low') + t('alarmPriority'), props: 'LoPriority' },
      { label: t('High'), props: 'HiEnable' },
      { label: t('High') + t('limitValue'), props: 'HiLimit' },
      { label: t('High') + t('alarmText'), props: 'HiString' },
      { label: t('High') + t('alarmPriority'), props: 'HiPriority' },
      { label: t('HighHigh'), props: 'HiHiEnable' },
      { label: t('HighHigh') + t('limitValue'), props: 'HiHiLimit' },
      { label: t('HighHigh') + t('alarmText'), props: 'HiHiString' },
      { label: t('HighHigh') + t('alarmPriority'), props: 'HiHiPriority' },
      { label: t('DiscEnable'), props: 'DiscEnable' },
      { label: t('bool') + t('alarmPriority'), props: 'DiscPriority' },
      { label: t('bool') + t('alarmType') + t('type'), props: 'DiscAlarmGenType' },
      { label: 'True' + t('alarmText'), props: 'DiscOnString' },
      { label: 'False' + t('alarmText'), props: 'DiscOffString' },
      { label: 'FalseToTrue' + t('alarmText'), props: 'DiscOffToOnString' },
      { label: 'TrueToFalse' + t('alarmText'), props: 'DiscOnToOffString' },
      { label: t('ExtendFieldString1'), props: 'ExtendFieldString1' },
      { label: t('ExtendFieldString2'), props: 'ExtendFieldString2' },
      { label: t('ExtendFieldString3'), props: 'ExtendFieldString3' },
      { label: t('ExtendFieldString4'), props: 'ExtendFieldString4' },
      { label: t('ExtendFieldString5'), props: 'ExtendFieldString5' },
      { label: t('ExtendFieldString6'), props: 'ExtendFieldString6' },
      { label: t('ExtendFieldString7'), props: 'ExtendFieldString7' },
      { label: t('ExtendFieldString8'), props: 'ExtendFieldString8' },
    ];
    await exportTableToExcel({ tableData: tables, tableColumn: moreItemProps });
  }
};
const fileChange = async (file) => {
  try {
    isLoading.value = true;
    const res = await importDirectoryServer(file);
    if (res.errorCode === 0) {
      ElMessage.success(t('importSuccess'));
    }
    await getTableData();
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="dictionary-manage-con">
    <header class="mb-12 fz-16">
      <div>{{ t('dataDictionary') }}</div>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="quickAdd">
          <el-icon class="mr-5">
            <IEpDocumentAdd />
          </el-icon>
          {{ t('quickAdd') }}
        </el-button>
        <el-button :disabled="!selectRow.length" type="danger" @click="deleteDataDictionary(selectRow)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
        <el-button :disabled="!selectRow.length" @click="handleExportTags()">
          <el-icon class="mr-5">
            <IEpUpload />
          </el-icon>
          {{ t('export') }}
        </el-button>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :before-upload="() => false"
          :limit="10"
          :on-change="fileChange"
          :show-file-list="false"
          accept=".xlsx"
          class="ml-10"
          name="tagFile"
        >
          <el-button>
            <el-icon class="mr-5">
              <IEpDownload />
            </el-icon>
            {{ t('import') }}
          </el-button>
        </el-upload>
      </div>
      <div class="search-input">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('plsInputKeywordSearch')"
          :prefix-icon="Search"
          style="width: 240px"
        />
      </div>
    </div>
    <LoadingComponent v-if="isLoading" :loading="isLoading" :loadingText="loadingText" />
    <CustomStyleTable
      :tableData="searchTableData"
      ref="tableRef"
      class="table-custom"
      max-height="calc(100% - 120px)"
      row-key="ID"
      @selectionChange="tableSelect"
    >
      <el-table-column align="center" type="selection" width="45" />
      <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
      <el-table-column
        v-for="propItems of tableColumns"
        :key="propItems.props"
        :formatter="propItems.formatter"
        :label="t(propItems.label)"
        :min-width="propItems.minWidth"
        :prop="propItems.props"
        align="center"
        show-overflow-tooltip
      />
      <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="160">
        <template #default="{ row }">
          <div class="df justify-every">
            <el-link v-if="!(row.id >= 1 && row.id <= 9)" type="primary" @click="editDataDictionary(row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-link>
            <el-link v-if="!(row.id >= 1 && row.id <= 9)" type="danger" @click="deleteDataDictionary([row])">
              <el-icon class="mr-5">
                <IEpDelete />
              </el-icon>
              {{ t('delete') }}
            </el-link>
          </div>
        </template>
      </el-table-column>
    </CustomStyleTable>
  </div>

  <QuickAddVariableDialog
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :configDatasource="configDatasource"
    :filterTagType="filterTagType"
    :title="t('quickAdd')"
    @quickAddConfirm="handleQuickAdd"
  />

  <EditVariableDialog
    v-if="editVariable"
    v-model:dialogVisible="editVariable"
    v-model:formData="formData"
    @confirm="handleEditDataDictionary"
  />
</template>

<style lang="scss" scoped>
.dictionary-manage-con {
  height: 100%;
  width: 100%;
  .operate-list {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    .button-list-con {
      display: flex;
      flex-wrap: wrap; // 按钮自动换行
      gap: 0; // 按钮之间的间距
      .el-button {
        border-radius: 0;
      }
    }

    .search-input {
      :deep(.el-icon) {
        color: black;
      }
    }
  }
}
</style>
