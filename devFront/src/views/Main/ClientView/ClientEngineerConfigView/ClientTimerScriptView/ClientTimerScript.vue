<script setup>
import { genFileId } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { exportScriptJsonHandle, importScriptJsonHandle } from '@/utils/importExportUtils.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { getGlobalScriptServer, setGlobalScriptServer } from '@/api/allRequest/clientAPI.js';
import { useClientScriptTree } from '@/composables/clientCompose/useClientScriptTree.js';
import { useConfirm } from '@/composables/useConfirm.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const scriptEditorStore = useScriptEditorStore();
const clientMenuStore = useClientMenuStore();
const { addScriptEditorList, setVisible } = scriptEditorStore;
const { scriptEditorList, leftClickName } = storeToRefs(scriptEditorStore);
const { setClientScriptTree } = useClientScriptTree({ t, scriptEditorStore });
const uploadRef = useTemplateRef('uploadRef');
const timerScriptName = ref('');
const interval = ref(null);
const description = ref('');
const selectRow = ref([]);

const tableData = ref([]);

const tableColumns = computed(() => [
  {
    label: t('systemScriptName'),
    props: 'name',
  },
  {
    label: t('cycle'),
    props: 'interval',
  },
  {
    label: t('descriptionInfo'),
    props: 'comment',
  },
]);

watchEffect(async () => {
  const { id, path } = clientMenuStore.currentClientRow;
  await nextTick(async () => {
    if (path === 'client-timer-script') {
      await getTableData();
    }
  });
});
scriptEditorStore.$onAction(({ name, args, after }) => {
  if (name === 'saveEditorList') {
    after(async () => {
      await getTableData();
    });
  }
});

const getTableData = async () => {
  const { data } = await getGlobalScriptServer({ type: 'timer' });
  tableData.value = data.map((item, index) => {
    return {
      ...item,
      id: `timer_${item.name}_${index}`,
      type: 'timer',
    };
  });
};

const addHandle = () => {
  const name = `timer${tableData.value.length + 1}`;
  openScriptEditor({
    id: name,
    name: name,
    comment: t('descriptionInfo'),
    code: '',
    interval: 4000,
    type: 'timer',
    operation: 'add',
  });
};

const deleteHandle = async (row) => {
  const names = row.map((item) => item.name);
  await useConfirm(t('sureForDeleteName', { name: names.join(',') }), t('tip'));
  await setGlobalScriptServer({ type: 'timer', operation: 'delete' }, names);
  await getTableData();
  ElMessage.success(t('deleteSuccess'));
};

const exportHandle = async () => {
  const promiseAll = selectRow.value.map((item) =>
    exportScriptJsonHandle(
      {
        name: item.name,
        code: item.code,
        encrypt: item.encrypt,
        interval: item.interval,
        comment: item.comment,
      },
      `${item.name}.json`,
    ),
  );
  await Promise.all(promiseAll);
};
const tableRowDBClick = (row) => {
  openScriptEditor({
    ...row,
    type: 'timer',
    operation: 'edit',
  });
};

const openScriptEditor = async (row) => {
  const hasScript = scriptEditorList.value.some((scriptEditor) => scriptEditor.id === row.id);
  if (!hasScript) {
    timerScriptName.value = row.name;
    interval.value = row.interval;
    description.value = row.comment;
    const editData = {
      ...row,
      name: timerScriptName,
      save: true,
      operation: row.operation,
      isHover: true,
      interval: interval,
      comment: description,
      group: `${leftClickName.value}`,
      clientTimerHeaderForm: {
        name: timerScriptName,
        comment: description,
        interval: interval,
      },
    };
    addScriptEditorList(editData);
    setVisible(true);
    await setClientScriptTree();
  } else {
    setVisible(true);
  }
};

const tableSelect = (row) => {
  selectRow.value = row;
};
// 文件上传
const fileChange = async (file) => {
  const data = await importScriptJsonHandle(file.raw);
  const bodyParams = {
    ID: data.ID,
    name: data.name,
    code: data.code,
    interval: data.interval,
    comment: data.comment,
  };

  const importScriptData = await setGlobalScriptServer({ type: 'timer', operation: 'add' }, bodyParams);
  if (importScriptData.errorCode === 0) {
    ElMessage.success(t('scriptImportTips'));
  }
  await getTableData();
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
  <div class="content">
    <header class="button df just-space mb-12">
      <el-button type="primary" @click="addHandle">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('create') }}
      </el-button>
      <el-button :disabled="selectRow.length === 0" type="danger" @click="deleteHandle(selectRow)">
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
        accept=".json"
        class="ml-10 mr-12 df just-space"
      >
        <el-button>
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('import') }}
        </el-button>
      </el-upload>
      <el-button :disabled="selectRow.length === 0" @click="exportHandle">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
    </header>
    <CustomStyleTable
      :tableData="tableData"
      class="table-custom"
      max-height="calc(100vh - 152px)"
      row-key="id"
      @selectionChange="tableSelect"
      @tableRowDBClick="tableRowDBClick"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
      <el-table-column
        v-for="row of tableColumns"
        :label="row.label"
        :prop="row.props"
        align="center"
        min-width="10%"
        show-overflow-tooltip
      />
      <el-table-column :label="t('operate')" align="center" width="160">
        <template #default="{ row }">
          <div class="df justify-every">
            <el-button link type="primary" @click="tableRowDBClick(row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-button>
            <el-button link type="danger" @click="deleteHandle([row])">
              <el-icon class="mr-5">
                <IEpDelete />
              </el-icon>
              {{ t('delete') }}
            </el-button>
          </div>
        </template>
      </el-table-column>
    </CustomStyleTable>
  </div>
</template>
<style lang="scss" scoped>
.content {
  height: 100%;
  padding: 10px;
}
</style>
