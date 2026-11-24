<script setup>
import { genFileId } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { exportScriptJsonHandle, importScriptJsonHandle } from '@/utils/importExportUtils.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { getGlobalScriptServer, setGlobalScriptServer } from '@/api/allRequest/clientAPI.js';
import { useClientScriptTree } from '@/composables/clientCompose/useClientScriptTree.js';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();
const scriptEditorStore = useScriptEditorStore();
const { addScriptEditorList, setVisible } = scriptEditorStore;
const { scriptEditorList, leftClickName } = storeToRefs(scriptEditorStore);
const { setClientScriptTree } = useClientScriptTree({ t, scriptEditorStore });
const selectRow = ref({});
const uploadRef = useTemplateRef('uploadRef');
const tableData = ref([]);
const interval = ref(null);

const tableColumns = computed(() => [
  {
    label: t('systemScriptName'),
    props: 'name',
  },
]);

nextTick(async () => {
  await getTableData();
});

scriptEditorStore.$onAction(({ name, args, after }) => {
  if (name === 'saveEditorList') {
    after(async () => {
      await getTableData();
    });
  }
});
const getTableData = async () => {
  const { data } = await getGlobalScriptServer({ type: 'system' });
  tableData.value = data.map((item) => {
    return {
      ...item,
      id: item.name,
      name: i18nFormat(item.name),
      type: 'system',
      save: true,
      isHover: true,
    };
  });
};
const i18nFormat = (name) => {
  let result = name;
  switch (name) {
    case '系统启动时':
      result = computed(() => t('systemStartup'));
      break;
    case '系统运行时':
      result = computed(() => t('systemRunning'));
      break;
    case '系统关闭时':
      result = computed(() => t('systemShutdown'));
      break;
    default:
      break;
  }
  return result;
};
const exportHandle = async () => {
  const promiseAll = selectRow.value.map((item) =>
    exportScriptJsonHandle(
      {
        name: item.name,
        code: item.code,
        encrypt: item.encrypt,
        interval: item.interval,
      },
      `${item.name}.json`,
    ),
  );
  await Promise.all(promiseAll);
};

const tableRowDBClick = async (row) => {
  const hasScript = scriptEditorList.value.some((scriptEditor) => scriptEditor.id === row.id);
  if (!hasScript) {
    interval.value = row.interval;
    const editData = {
      ...row,
      operation: 'edit',
      interval: interval,
      group: `${leftClickName.value}`,
      clientSystemHeaderForm: row.interval ? { interval: interval } : false,
    };
    addScriptEditorList(editData);
    setVisible(true);
    await setClientScriptTree();
  } else {
    setVisible(true);
  }
};

const tableRowClick = (row) => {
  selectRow.value = row;
};
// 文件上传
const fileChange = async (file) => {
  const data = await importScriptJsonHandle(file.raw);
  const bodyParams = {
    name: data.name,
    code: data.code,
    encrypt: data.encrypt,
    interval: data.interval,
  };

  await setGlobalScriptServer({ type: 'system', operation: 'edit' }, bodyParams);
  await getTableData();
  ElMessage.success(t('scriptImportTips'));
};

// 默认清除文件
const exceedHandle = (files) => {
  uploadRef.value?.clearFiles();
  const file = files[0];
  file.uuid = genFileId();

  uploadRef.value?.handleStart(file);
};
</script>

<template>
  <header class="button df just-space mb-5">
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :on-change="fileChange"
      :on-exceed="exceedHandle"
      :show-file-list="false"
      accept=".json"
    >
      <el-button>
        <el-icon class="mr-5">
          <IEpDownload />
        </el-icon>
        {{ t('import') }}
      </el-button>
    </el-upload>
    <el-button class="ml-10" @click="exportHandle">
      <el-icon class="mr-5">
        <IEpUpload />
      </el-icon>
      {{ t('export') }}
    </el-button>
  </header>
  <CustomStyleTable
    :showPagination="false"
    :tableData="tableData"
    class="table-custom"
    max-height="calc(100vh - 130px)"
    row-key="name"
    @selectionChange="tableRowClick"
    @tableRowDBClick="tableRowDBClick"
  >
    <el-table-column align="center" type="selection" width="55"></el-table-column>
    <el-table-column :label="t('serialNumber')" align="center" type="index" width="55"></el-table-column>
    <el-table-column
      v-for="row of tableColumns"
      :label="row.label"
      :key="row.props"
      :prop="row.props"
      align="left"
      min-width="10%"
      show-overflow-tooltip
    />
  </CustomStyleTable>
</template>
