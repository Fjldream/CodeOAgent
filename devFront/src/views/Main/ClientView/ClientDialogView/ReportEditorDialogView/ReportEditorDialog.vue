<script setup>
import { useI18n } from 'vue-i18n';
import { importReportExcel } from '@/utils/univerDataOptions.js';
import { editReportServer } from '@/api/allRequest/clientAPI.js';
import { useReportEditorStore } from '@/stores/reportEditorStore.js';
import { useConfirm } from '@/composables/useConfirm.js';

import ReportModels from '@/views/Main/ClientView/ClientDialogView/ReportEditorDialogView/ReportEditorContainerView/ReportModels.vue';
import ReportDataSetLeft from '@/views/Main/ClientView/ClientDialogView/ReportEditorDialogView/ReportEditorContainerView/ReportDataSetLeft.vue';
import ReportAttrRight from '@/views/Main/ClientView/ClientDialogView/ReportEditorDialogView/ReportEditorContainerView/ReportAttrRight.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';

const { t } = useI18n();
const reportEditorStore = useReportEditorStore();
const { resetReportStore, setWorkbookDataMap } = reportEditorStore;
const editorVisible = defineModel('editorVisible', {
  type: Boolean,
  default: false,
});
const emit = defineEmits(['saveHandle']);
const loading = ref(false);
const loadText = ref('');
const uploadRef = useTemplateRef('uploadRef');
const reportRef = reactive({});

// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
const activeTab = ref('');
import { assistantState, reportEntry } from '@/assistant/entry.js';
import { assistantEnabled } from '@/assistant/api.js';
import { createEditorSession } from '@/assistant/editor-context.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
const clients = useClientMenuStore();
const reportSession = createEditorSession();
watchEffect(() => {
  const item = reportEditorStore.reportEditorList.find(row => row.id === activeTab.value);
  const projectId = clients.currentClientEngineer?.guid;
  const model = item && reportRef[item.id];
  if (!editorVisible.value || !item || !projectId) { reportEntry.value = null; return; }
  // The active model owns its Univer instance. Store events also invalidate the visible cell context.
  const change = reportEditorStore.currentCell;
  const sheetChange = reportEditorStore.currentSheet;
  const cell = change && sheetChange && model?.assistantSelection?.();
  const base = { kind:'report', projectId, object:String(item.id), cell, label:'报表 / '+item.name };
  const sequence=++reportSession.sequence;
  const readSelection = () => ({ ...base, cell:model?.assistantSelection?.(),
    editor:{session:reportSession.session,sequence} });
  reportEntry.value = { ...base,readSelection };
});
onBeforeUnmount(() => { reportEntry.value = null; });
// end

watchEffect(async () => {
  activeTab.value = reportEditorStore.reportEditorList[reportEditorStore.reportEditorList.length - 1]?.id;
});

const handleClose = async () => {
  await handleSave();

  closeReportEditor();
};
const closeReportEditor = () => {
  editorVisible.value = false;
  resetReportStore();
};
const fileChange = async (e, row) => {
  const file = e.raw;
  loading.value = true;

  loadText.value = t('reportImportLoading');
  try {
    const importData = await importReportExcel(file);
    reportRef[row.id].createWorkbook(importData);
    setWorkbookDataMap(row.id, importData);
  } finally {
    loading.value = false;
    uploadRef.value[0]?.clearFiles();
    reportEditorStore.dataSetMap.get(activeTab.value)?.clear();
  }
};
const handleSave = async () => {
  const message = await useConfirm(t('saveReportContent'), t('tip'), 'warning').catch((err) => {});
  if (message !== 'confirm') {
    return false;
  }
  const editInfo = reportEditorStore.reportEditorList.find((row) => row.id === activeTab.value);
  const pageProperty = reportEditorStore.pagePropertyMap.get(activeTab.value);
  const dataSet = reportEditorStore.dataSetMap.size === 0 ? {} : handleDataSet();

  editInfo.name = pageProperty.name;
  const workbook = reportEditorStore.getUniverAPI().getActiveWorkbook().save();

  const params = {
    ...editInfo,
    name: pageProperty.name,
    description: pageProperty.description,
    reportInfo: {
      pageProperty,
      workbookData: { ...workbook, name: pageProperty.name },
      dataSet: dataSet,
    },
  };
  const { errorCode } = await editReportServer(params);

  if (errorCode === 0) {
    ElMessage.success(t('saveSuccess'));
  }
  emit('saveHandle', editInfo);
  return true;
};

/**
 * @method handleDataSet
 * @description 拼接dataSetMap数据 {sheetId:{row:{column:{}}}}
 */
const handleDataSet = () => {
  const reportEditMap = reportEditorStore.dataSetMap.get(activeTab.value);
  return [...reportEditMap].reduce((acc, [sheetId, rowMap]) => {
    if (!acc[sheetId]) {
      acc[sheetId] = {};
    }
    for (const [row, columnMap] of rowMap) {
      if (!acc[sheetId][row]) {
        acc[sheetId][row] = {};
      }
      for (const [column, data] of columnMap) {
        const { subUnitId, id, tag, name, expansion, type, leftCell, topCell } = data;
        acc[sheetId][row][column] = {
          column,
          row,
          subUnitId,
          id,
          tag,
          type,
          name,
          expansion: expansion || '2',
          leftCell,
          topCell,
        };
      }
    }
    return acc;
  }, {});
};

const setAceEditorRefs = (e, tab) => {
  reportRef[tab.id] = e;
};
</script>

<template>
  <!-- 编辑器弹窗 -->
  <el-dialog
    v-model:model-value="editorVisible"
    :append-to-body="true"
    :before-close="handleClose"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :destroy-on-close="false"
    :draggable="true"
    :fullscreen="true"
    :show-close="false"
    :z-index="900"
    class="editor-dialog"
  >
    <template #header>
      <div class="df w-100 space-between">
<!-- modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据 -->
        <div>{{ t('reportEditor') }}</div>
        <el-button v-if="assistantEnabled" size="small" @click="assistantState = 'open'">询问当前单元格</el-button>
<!-- end -->
        <div class="df w40 space-between">
          <el-icon class="pointer" @click="handleClose">
            <IEpClose />
          </el-icon>
        </div>
      </div>
    </template>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane v-for="item of reportEditorStore.reportEditorList" :key="item.id" :name="item.id">
        <template #label>
          <div class="df custom-tab-label">
            <div class="mr-20">{{ item.name }}</div>
            <div class="w-16"></div>
          </div>
        </template>
        <el-container class="wrapper">
          <el-header class="df report-toolbar">
            <div class="pointer fz-16" @click="handleSave">
              <el-tooltip :content="t('save')" :show-after="500" effect="light" placement="bottom-end">
                <el-button size="small">
                  <el-icon>
                    <IEpCollection />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :limit="1"
              :on-change="(e) => fileChange(e, item)"
              :show-file-list="false"
              accept=".xlsx, xls"
              class="ml-10"
            >
              <div class="mr-6 pointer fz-16">
                <el-tooltip :content="t('import')" :show-after="500" effect="light" placement="bottom-end">
                  <el-button size="small">
                    <el-icon>
                      <IEpUpload />
                    </el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </el-upload>
          </el-header>
          <el-container>
            <el-aside width="220px">
              <ReportDataSetLeft :activeTab="activeTab" />
            </el-aside>
            <el-main class="univer-content-main">
              <ReportModels :ref="(el) => setAceEditorRefs(el, item)" :activeTab="activeTab" />
            </el-main>
            <el-aside width="300px">
              <Suspense>
                <ReportAttrRight :activeTab="activeTab" />
              </Suspense>
            </el-aside>
          </el-container>
        </el-container>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>

  <LoadingComponent :loading="loading" :loading-text="loadText" v-if="loading" />
</template>

<style scoped lang="scss">
.el-tabs.el-tabs--top.el-tabs--border-card {
  height: calc(100% - 33px);
}
</style>

<style lang="scss">
.editor-dialog {
  padding: 0;
  --el-dialog-padding-primary: 6px;

  .el-dialog__header {
    padding-top: var(--el-dialog-padding-primary);
  }

  .el-tabs__content {
    padding: 0;
  }
}

.wrapper {
  width: 100%;
  height: calc(100vh - 74px);

  .univer-content-main {
    padding: 0;
  }

  .el-header {
    height: auto;
    padding: 10px;
  }
}
.report-toolbar {
  border: 1px solid #e4e7ed;
  background: #538ac1;
}
</style>
